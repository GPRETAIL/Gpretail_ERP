<?php

namespace App\Services\Platform;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\IpUtils;

class RegisteredServerProbe
{
    public function normalize(string $url): string
    {
        $parts = parse_url(trim($url));
        abort_unless(is_array($parts) && in_array($parts['scheme'] ?? '', ['http', 'https'], true)
            && ! isset($parts['user']) && ! isset($parts['pass'])
            && ! isset($parts['query']) && ! isset($parts['fragment'])
            && in_array($parts['path'] ?? '', ['', '/'], true), 422, 'Use an approved server origin without credentials, path, query or fragment.');
        $host = strtolower($parts['host'] ?? '');
        abort_unless($host !== '' && strpbrk($host, " \t\r\n\\/?#") === false, 422, 'Invalid server host.');
        $port = $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80);
        abort_unless(in_array($port, [80, 443, 8000, 8001, 8080, 8130], true), 422, 'This server port is not approved. Use an ERP backend port (80, 443, 8000, 8001, 8080 or 8130), not a frontend development port.');

        return $parts['scheme'].'://'.$host.':'.$port;
    }

    public function check(string $registered, string $requested, bool $local): array
    {
        $origin = $this->normalize($registered);
        abort_unless($requested === '' || $this->normalize($requested) === $origin, 422, 'Save and approve this server before testing it.');
        $allowed = array_map(fn ($url) => $this->normalize($url), config('sync.probe_allowed_endpoints', []));
        abort_unless(in_array($origin, $allowed, true), 422, 'This backend endpoint is not approved for connection testing. The installation administrator must add its exact origin to SERVER_PROBE_ALLOWED_ENDPOINTS; saving a URL does not approve it.');
        $parts = parse_url($origin);
        $host = trim($parts['host'], '[]');
        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : null;
        if ($local) {
            abort_unless($ip && IpUtils::checkIp($ip, ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7']), 422, 'A local probe requires an approved static LAN address.');
        } else {
            abort_unless($parts['scheme'] === 'https', 422, 'Cloud probes require HTTPS.');
            $addresses = $ip ? [$ip] : $this->addresses($host);
            abort_unless($addresses !== [], 422, 'Cloud server DNS could not be verified.');
            foreach ($addresses as $address) {
                abort_unless(filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) && ! IpUtils::checkIp($address, ['100.64.0.0/10', '::ffff:0:0/96']), 422, 'Cloud probes require public addresses.');
            }
            $ip = $addresses[0];
        }
        // A single-worker development server cannot HTTP-probe itself during this request.
        // This local-only identity comes from installation configuration, never user input.
        $developmentOrigin = config('sync.development_server_origin');
        if ($local && app()->environment('local') && $developmentOrigin
            && $origin === $this->normalize($developmentOrigin)) {
            return ['healthy' => false, 'reachable' => true,
                'message' => 'This is the current development backend. Local sync is not verified: configure a separate local connector and cloud deployment before testing failover.'];
        }
        $resolved = str_contains($ip, ':') ? '['.$ip.']' : $ip;
        // The checked address is pinned for the request (no DNS rebinding between the check and the call), which
        // needs PHP's curl extension. Without it, say so instead of failing with a PHP error.
        if (! filter_var($host, FILTER_VALIDATE_IP) && ! $this->curlAvailable()) {
            return ['healthy' => false, 'reachable' => false,
                'message' => "This server's PHP has no curl extension, which the connection test needs. Enable extension=curl for the web server's PHP and restart it."];
        }
        $curl = filter_var($host, FILTER_VALIDATE_IP) ? [] : [\CURLOPT_RESOLVE => [$host.':'.$parts['port'].':'.$resolved]];
        try {
            $response = Http::timeout(5)->connectTimeout(3)->withoutRedirecting()->withOptions(['proxy' => '', 'curl' => $curl])->get($origin.'/api/connector/web-config');
            $healthy = $response->successful() && ($local ? (bool) $response->json('data.enabled') : $response->json('success') === true);
        } catch (ConnectionException) {
            $healthy = false;
        }

        return ['healthy' => $healthy];
    }

    protected function curlAvailable(): bool
    {
        return \defined('CURLOPT_RESOLVE');
    }

    protected function addresses(string $host): array
    {
        $records = dns_get_record($host, DNS_A | DNS_AAAA) ?: [];

        return array_values(array_filter(array_map(fn ($record) => $record['ip'] ?? $record['ipv6'] ?? null, $records)));
    }
}
