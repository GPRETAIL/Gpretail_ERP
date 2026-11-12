<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Store;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Tells the admins when the server or the app logs errors, so nobody has to read the logs to find out.
 *
 * Reads only what was added to the logs since the last run: server errors (laravel*.log) and frontend
 * crashes (client-errors-*.log). New errors pile up, and at most one alert goes out per cooldown
 * (default an hour), with the count and the most common messages. It goes to every active admin's
 * notification bell, and by email when OPS_ALERT_EMAIL is set.
 */
class SendErrorAlerts extends Command
{
    protected $signature = 'ops:error-alerts';

    protected $description = 'Alert admins about new server errors and frontend crashes in the logs';

    private const OFFSETS = 'ops:error-alerts:offsets';
    private const PENDING = 'ops:error-alerts:pending';
    private const LAST_SENT = 'ops:error-alerts:last-sent';
    private const TYPE = 'SYSTEM_ERRORS';
    /** One run reads at most 5 MB per file, so a log flood can't exhaust memory; the rest is read next run. */
    private const MAX_READ = 5 * 1024 * 1024;

    /** Server log lines at error level or worse: "[2026-11-12 10:00:00] production.ERROR: message". */
    private const SERVER_LINE = '/^\[\d{4}-\d{2}-\d{2}[^\]]*\]\s+[\w-]+\.(ERROR|CRITICAL|ALERT|EMERGENCY):\s*(.*)$/';

    public function handle(): int
    {
        $firstRun = ! Cache::has(self::OFFSETS);
        $offsets = Cache::get(self::OFFSETS, []);
        $pending = Cache::get(self::PENDING, ['server' => 0, 'client' => 0, 'samples' => []]);

        foreach ($this->logFiles() as $path => $source) {
            $size = filesize($path) ?: 0;
            // First run starts at the end (old errors were never news); a file that shrank was rotated.
            $from = $firstRun ? $size : (int) ($offsets[$path] ?? 0);
            if ($from > $size) {
                $from = 0;
            }
            $to = min($size, $from + self::MAX_READ);
            if ($to > $from) {
                foreach ($this->newLines($path, $from, $to) as $message) {
                    if ($source === 'server' && ! preg_match(self::SERVER_LINE, $message, $match)) {
                        continue;
                    }
                    $text = $source === 'server' ? 'Server: '.$this->withoutContext($match[2]) : 'Screen crash: '.$this->withoutContext($this->clientText($message));
                    $pending[$source]++;
                    $key = mb_substr(trim($text), 0, 140);
                    $pending['samples'][$key] = ($pending['samples'][$key] ?? 0) + 1;
                }
            }
            $offsets[$path] = $to;
        }
        Cache::forever(self::OFFSETS, array_intersect_key($offsets, $this->logFiles()));
        // Keep the 50 most frequent messages while alerts wait for the cooldown.
        arsort($pending['samples']);
        $pending['samples'] = array_slice($pending['samples'], 0, 50, true);

        $total = $pending['server'] + $pending['client'];
        $cooldown = max(1, (int) config('services.ops_alerts.cooldown_minutes', 60));
        $lastSent = Cache::get(self::LAST_SENT);
        if ($total === 0 || ($lastSent && now()->timestamp - $lastSent < $cooldown * 60)) {
            Cache::forever(self::PENDING, $pending);
            $this->info($total ? "{$total} new error(s) held until the cooldown ends." : 'No new errors.');

            return self::SUCCESS;
        }

        $this->send($pending);
        Cache::forever(self::LAST_SENT, now()->timestamp);
        Cache::forget(self::PENDING);
        $this->info("Alert sent for {$total} error(s).");

        return self::SUCCESS;
    }

    /** @return array<string, string> path => server|client */
    private function logFiles(): array
    {
        $dir = storage_path('logs');
        $recent = now()->subDays(2)->timestamp;
        $files = [];
        foreach (glob($dir.DIRECTORY_SEPARATOR.'*.log') ?: [] as $path) {
            $name = basename($path);
            if (filemtime($path) < $recent) {
                continue;
            }
            if (str_starts_with($name, 'laravel')) {
                $files[$path] = 'server';
            } elseif (str_starts_with($name, 'client-errors')) {
                $files[$path] = 'client';
            }
        }

        return $files;
    }

    /** @return list<string> */
    private function newLines(string $path, int $from, int $to): array
    {
        $length = $to - $from;
        $handle = fopen($path, 'rb');
        if (! $handle) {
            return [];
        }
        fseek($handle, $from);
        $chunk = (string) fread($handle, $length);
        fclose($handle);

        return array_values(array_filter(preg_split('/\r?\n/', $chunk), fn ($line) => preg_match('/^\[\d{4}-/', $line)));
    }

    private function clientText(string $line): string
    {
        return preg_match('/^\[[^\]]*\]\s+[\w-]+\.\w+:\s*(.*)$/', $line, $m) ? $m[1] : $line;
    }

    /** "Message {"user_id":…}" → "Message": the JSON context differs per request and would split counts. */
    private function withoutContext(string $text): string
    {
        return trim(preg_replace('/\s+[\{\[]\".*$/s', '', $text) ?? $text);
    }

    private function send(array $pending): void
    {
        arsort($pending['samples']);
        $top = array_slice($pending['samples'], 0, 3, true);
        $lines = array_map(fn ($text, $count) => "{$count}× {$text}", array_keys($top), $top);
        $parts = array_filter([
            $pending['server'] ? "{$pending['server']} server error(s)" : null,
            $pending['client'] ? "{$pending['client']} screen crash(es)" : null,
        ]);
        $title = 'Errors logged: '.implode(', ', $parts);
        $message = 'Most frequent: '.implode(' · ', $lines).'. Details are in storage/logs on the server.';

        $fallbackStore = Store::query()->orderBy('id')->value('id');
        User::query()->where('is_active', true)->whereIn('role', ['admin', 'super_admin'])->get(['id', 'store_id'])
            ->each(function (User $admin) use ($title, $message, $fallbackStore): void {
                $storeId = $admin->store_id ?? $fallbackStore;
                if (! $storeId) {
                    return;
                }
                Notification::create([
                    'type' => self::TYPE,
                    'title' => mb_substr($title, 0, 250),
                    'message' => mb_substr($message, 0, 1000),
                    'store_id' => $storeId,
                    'user_id' => $admin->id,
                ]);
            });

        $email = config('services.ops_alerts.email');
        if ($email) {
            try {
                Mail::raw($title."\n\n".implode("\n", $lines)."\n\nSite: ".config('app.url')."\nDetails are in storage/logs on the server.", function ($mail) use ($email, $title): void {
                    $mail->to($email)->subject('['.config('app.name').'] '.$title);
                });
            } catch (\Throwable $e) {
                // The bell alert already went out; a mail failure must not stop the next run.
                Log::warning('Error alert email could not be sent: '.$e->getMessage());
            }
        }
    }
}
