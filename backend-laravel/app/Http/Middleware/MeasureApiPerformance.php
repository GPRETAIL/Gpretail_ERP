<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MeasureApiPerformance
{
    public function handle(Request $request, Closure $next): Response
    {
        $metrics = (object) ['queries' => 0, 'databaseMs' => 0.0];
        $request->attributes->set('api_performance', $metrics);
        $started = hrtime(true);
        $response = $next($request);
        $timings = $response->headers->get('Server-Timing');
        $timings = ($timings ? $timings.', ' : '').'api;dur='.round((hrtime(true) - $started) / 1e6, 2)
            .', db;dur='.round($metrics->databaseMs, 2).';desc="'.$metrics->queries.' queries"';
        $response->headers->set('Server-Timing', $timings);

        return $response;
    }
}
