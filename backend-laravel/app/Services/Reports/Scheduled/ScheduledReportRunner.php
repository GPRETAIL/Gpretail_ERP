<?php

namespace App\Services\Reports\Scheduled;

use App\Mail\ScheduledReportMail;
use App\Models\RecipientGroupMember;
use App\Models\ReportSchedule;
use App\Models\ReportScheduleRun;
use App\Models\User;
use App\Services\Hr\StaffAppAccess;
use App\Services\Messaging\MailerFactory;
use App\Services\Messaging\MessagingSettings;
use App\Services\Reports\Scheduled\Export\PdfRenderer;
use App\Services\Reports\Scheduled\Export\XlsxRenderer;
use App\Services\Tenancy\PagePermissions;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Sends scheduled reports: builds each due report for its store and period, renders Excel/PDF, emails every allowed
 * recipient, logs the run and sets the next time (business time zone). reports:run-scheduled calls runDue() every
 * few minutes; Hostinger has no queue worker, so a tick sends at most MAX_PER_TICK schedules.
 */
class ScheduledReportRunner
{
    public const MAX_PER_TICK = 10;

    private const ALWAYS_ALLOWED_ROLES = ['admin', 'super_admin'];

    public function __construct(
        private ScheduledReportCatalog $catalog,
        private MailerFactory $mailers,
        private MessagingSettings $messaging,
        private PagePermissions $pages,
    ) {}

    /** @return int schedules sent this tick */
    public function runDue(): int
    {
        $lock = Cache::lock('reports:run-scheduled', 600);
        if (! $lock->get()) {
            return 0;
        }
        try {
            $due = ReportSchedule::withoutGlobalScopes()->where('is_active', true)->whereNotNull('next_run_at')->where('next_run_at', '<=', now())
                ->orderBy('next_run_at')->limit(self::MAX_PER_TICK)->get();
            foreach ($due as $schedule) {
                // Move the schedule on first, so a crash mid-send never sends it again and again.
                $schedule->forceFill(['next_run_at' => self::nextRun($schedule, CarbonImmutable::now())])->save();
                $this->run($schedule);
            }

            return $due->count();
        } finally {
            $lock->release();
        }
    }

    /** Builds and sends one schedule now. $sendTo: send to exactly these addresses instead of the list ("Send to me"). */
    public function run(ReportSchedule $schedule, string $trigger = 'schedule', ?User $by = null, ?array $sendTo = null): ReportScheduleRun
    {
        [$from, $to] = ReportPeriod::resolve($schedule->period);
        $run = ReportScheduleRun::create(['report_schedule_id' => $schedule->id, 'store_id' => $schedule->store_id, 'trigger' => $trigger,
            'period_from' => $from, 'period_to' => $to, 'status' => 'running', 'triggered_by' => $by?->id, 'started_at' => now()]);
        $dir = storage_path('app/scheduled-reports/'.$run->id);
        $restore = $this->enterStore((int) $schedule->store_id);
        try {
            $store = DB::table('stores')->where('id', $schedule->store_id)->first();
            $meta = $this->catalog->get($schedule->report_key);
            [$emails, $skipped] = $sendTo !== null ? [array_values(array_unique(array_map('strtolower', $sendTo))), []] : $this->recipients($schedule, $meta['page']);
            if (! $emails) {
                return $this->finish($schedule, $run, 'skipped', 0, [], $skipped, [], 'No one to send to: no recipient has an email address and access to this report.');
            }
            $report = $this->catalog->build($schedule->report_key, (int) $schedule->store_id, $from, $to, (array) $schedule->params);
            if ($schedule->skip_empty && $report->rowCount() === 0) {
                return $this->finish($schedule, $run, 'skipped', 0, [], $skipped, [], 'Nothing to report for '.$report->period.'.');
            }
            File::ensureDirectoryExists($dir);
            $files = $this->render($report, $store, (array) $schedule->formats, $dir);
            [$address, $name] = $this->mailers->from((int) $schedule->store_id, (string) ($store->name ?? config('app.name')));
            $replyTo = trim((string) ($this->messaging->channel((int) $schedule->store_id, 'email')['plain']['reply_to'] ?? '')) ?: null;
            $subject = trim((string) $schedule->subject) ?: $report->title.' · '.$report->period.' · '.($store->name ?? '');
            $mailer = $this->mailers->mailer((int) $schedule->store_id);
            $sent = [];
            $failed = [];
            foreach ($emails as $email) {
                try {
                    $mailer->to($email)->send(new ScheduledReportMail($report, (string) ($store->name ?? ''), $schedule->name, $subject, $schedule->message,
                        $files, $address, $name, filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : null));
                    $sent[] = $email;
                } catch (Throwable $e) {
                    $failed[] = ['email' => $email, 'reason' => Str::limit($e->getMessage(), 200)];
                }
            }
            $status = ! $sent ? 'failed' : ($failed ? 'partial' : 'sent');

            return $this->finish($schedule, $run, $status, $report->rowCount(), $sent, [...$skipped, ...$failed], array_keys($files),
                $failed ? 'Could not send to '.count($failed).' recipient(s): '.$failed[0]['reason'] : null);
        } catch (Throwable $e) {
            Log::warning('Scheduled report failed', ['schedule' => $schedule->id, 'error' => $e->getMessage()]);

            return $this->finish($schedule, $run, 'failed', 0, [], [], [], Str::limit($e->getMessage(), 500));
        } finally {
            $restore();
            File::deleteDirectory($dir);
        }
    }

    /** Builds the files without sending (Preview / download). @return array<string, string> file name => path */
    public function preview(ReportSchedule $schedule, string $format, string $dir): array
    {
        [$from, $to] = ReportPeriod::resolve($schedule->period);
        $restore = $this->enterStore((int) $schedule->store_id);
        try {
            $report = $this->catalog->build($schedule->report_key, (int) $schedule->store_id, $from, $to, (array) $schedule->params);
            File::ensureDirectoryExists($dir);

            return $this->render($report, DB::table('stores')->where('id', $schedule->store_id)->first(), [$format], $dir);
        } finally {
            $restore();
        }
    }

    /**
     * Everyone the report goes to: users, roles (that store's active users), groups and outside addresses, without
     * duplicates. Users must have an email, be active, work in that store and be allowed to view the report's page.
     *
     * @return array{0: list<string>, 1: list<array{email: ?string, name: ?string, reason: string}>}
     */
    public function recipients(ReportSchedule $schedule, string $page): array
    {
        $storeId = (int) $schedule->store_id;
        $userIds = [];
        $emails = [];
        foreach ($schedule->recipients()->get() as $recipient) {
            match ($recipient->type) {
                'user' => $userIds[] = (int) $recipient->value,
                'role' => array_push($userIds, ...$this->storeUsers($storeId)->where('role', $recipient->value)->pluck('id')->all()),
                'group' => (function () use ($recipient, &$userIds, &$emails) {
                    foreach (RecipientGroupMember::where('recipient_group_id', $recipient->value)->get() as $member) {
                        if ($member->user_id) {
                            $userIds[] = (int) $member->user_id;
                        } else {
                            $emails[] = (string) $member->email;
                        }
                    }
                })(),
                default => $emails[] = (string) $recipient->value,
            };
        }
        $allowed = [];
        $skipped = [];
        foreach (User::whereIn('id', array_unique($userIds))->get() as $user) {
            $reason = match (true) {
                ! $user->is_active => 'inactive user',
                ! filter_var($user->email, FILTER_VALIDATE_EMAIL) || str_ends_with((string) $user->email, StaffAppAccess::HIDDEN_EMAIL_DOMAIN) => 'no email address',
                ! $this->worksIn($user, $storeId) => 'not in this store',
                ! $this->mayView($user, $page) => 'no access to this report',
                default => null,
            };
            if ($reason) {
                $skipped[] = ['email' => $user->email, 'name' => $user->name, 'reason' => $reason];
            } else {
                $allowed[] = strtolower((string) $user->email);
            }
        }
        foreach ($emails as $email) {
            if (filter_var(trim($email), FILTER_VALIDATE_EMAIL)) {
                $allowed[] = strtolower(trim($email));
            } else {
                $skipped[] = ['email' => $email, 'name' => null, 'reason' => 'not a valid email'];
            }
        }

        return [array_values(array_unique($allowed)), $skipped];
    }

    /** The next time a schedule is due after $after, at its send time in the business time zone; stored in UTC. */
    public static function nextRun(ReportSchedule $schedule, CarbonImmutable $after): Carbon
    {
        $tz = config('app.business_timezone');
        $local = $after->setTimezone($tz);
        [$hour, $minute] = array_map('intval', explode(':', $schedule->send_time ?: '09:00') + [1 => 0]);
        $at = fn (CarbonImmutable $day) => $day->setTime($hour, $minute);
        $candidate = match ($schedule->frequency) {
            'weekly' => (function () use ($local, $at, $schedule) {
                $day = $at($local);
                $target = $schedule->day_of_week ?: 1;
                while ($day->dayOfWeekIso !== $target || $day <= $local) {
                    $day = $day->addDay();
                }

                return $day;
            })(),
            'monthly' => (function () use ($local, $at, $schedule) {
                $month = $local->startOfMonth();
                for ($i = 0; $i < 3; $i++) {
                    $day = $at($month->setDay(min($schedule->day_of_month ?: 1, $month->daysInMonth)));
                    if ($day > $local) {
                        return $day;
                    }
                    $month = $month->addMonthNoOverflow();
                }

                return $day;
            })(),
            default => $at($local) > $local ? $at($local) : $at($local->addDay()),
        };

        return Carbon::instance($candidate->utc());
    }

    /** @return array<string, string> */
    private function render(ReportTable $report, ?object $store, array $formats, string $dir): array
    {
        $base = Str::slug($report->title).'-'.Str::slug($report->period);
        $files = [];
        foreach (array_unique($formats) as $format) {
            $name = "$base.$format";
            $files[$name] = $format === 'pdf'
                ? app(PdfRenderer::class)->render($report, $store ?? (object) ['name' => config('app.name')], "$dir/$name")
                : app(XlsxRenderer::class)->render($report, (string) ($store->name ?? ''), "$dir/$name");
        }

        return $files;
    }

    private function finish(ReportSchedule $schedule, ReportScheduleRun $run, string $status, int $rows, array $sent, array $skipped, array $files, ?string $error): ReportScheduleRun
    {
        $run->forceFill(['status' => $status, 'rows' => $rows, 'recipients' => $sent, 'skipped_recipients' => $skipped ?: null,
            'files' => $files ?: null, 'error' => $error, 'finished_at' => now()])->save();
        $schedule->forceFill(['last_run_at' => now(), 'last_status' => $status])->save();

        return $run;
    }

    private function storeUsers(int $storeId)
    {
        return User::where('is_active', true)->where(fn ($q) => $q->where('store_id', $storeId)
            ->orWhereIn('id', DB::table('user_store_access')->where('store_id', $storeId)->select('user_id'))
            ->orWhere(fn ($t) => $t->whereIn('role', self::ALWAYS_ALLOWED_ROLES)->whereNull('store_id')))->get();
    }

    private function worksIn(User $user, int $storeId): bool
    {
        return (int) $user->store_id === $storeId || (in_array($user->role, self::ALWAYS_ALLOWED_ROLES, true) && ! $user->store_id)
            || DB::table('user_store_access')->where('user_id', $user->id)->where('store_id', $storeId)->exists();
    }

    private function mayView(User $user, string $page): bool
    {
        return in_array($user->role, self::ALWAYS_ALLOWED_ROLES, true) || $this->pages->allows($user, $page, 'view');
    }

    /** Runs the report as the schedule's store (the store scope on models and StoreQuery), and puts back what was there. */
    private function enterStore(int $storeId): \Closure
    {
        $attributes = request()->attributes;
        $saved = collect(['store_context_ids', 'store_context_id', 'store_context_write'])->mapWithKeys(fn ($key) => [$key => [$attributes->has($key), $attributes->get($key)]]);
        $attributes->set('store_context_ids', [$storeId]);
        $attributes->set('store_context_id', $storeId);
        $attributes->set('store_context_write', false);

        return function () use ($attributes, $saved) {
            foreach ($saved as $key => [$had, $value]) {
                $had ? $attributes->set($key, $value) : $attributes->remove($key);
            }
        };
    }
}
