<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class MeasureApiPerformance
{
    public function handle(Request $request, Closure $next): Response
    {
        $metrics = (object) ['queries' => 0, 'databaseMs' => 0.0];
        $request->attributes->set('api_performance', $metrics);
        $started = hrtime(true);
        $response = $next($request);
        $elapsedMs = (hrtime(true) - $started) / 1e6;
        $this->logIfSlow($request, $metrics, $elapsedMs);
        $timings = $response->headers->get('Server-Timing');
        $timings = ($timings ? $timings.', ' : '').'api;dur='.round($elapsedMs, 2)
            .', db;dur='.round($metrics->databaseMs, 2).';desc="'.$metrics->queries.' queries"';
        $response->headers->set('Server-Timing', $timings);

        return $response;
    }

    /** A slow request, or one running many queries (usually an N+1), goes to the performance log. */
    private function logIfSlow(Request $request, object $metrics, float $elapsedMs): void
    {
        $slowMs = (int) config('logging.performance.slow_request_ms', 3000);
        $queryLimit = (int) config('logging.performance.request_query_limit', 150);
        $slow = $slowMs > 0 && $elapsedMs >= $slowMs;
        $heavy = $queryLimit > 0 && $metrics->queries >= $queryLimit;
        if (! $slow && ! $heavy) {
            return;
        }
        Log::channel('performance')->warning($heavy ? 'Many queries in one request' : 'Slow request', [
            'request' => $request->method().' /'.$request->path(),
            'ms' => (int) round($elapsedMs),
            'db_ms' => (int) round($metrics->databaseMs),
            'queries' => $metrics->queries,
            'user_id' => $request->user()?->getAuthIdentifier(),
        ]);
    }
}
