<?php

namespace App\Http\Controllers\Api\V1\Warehouse;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * AI Purchase Invoice > Upload from phone. The signed-in page starts a session (POST v1/invoice-ai/phone-upload)
 * and shows its one-time link as a QR code; the phone opens /phone-upload/{token} (no sign-in: the token is the
 * permission, valid for a few minutes) and sends one photo or PDF; the page polls and takes the file.
 * Written with DB::table: the phone has no store context, which store-scoped models require.
 */
class PhoneUploadController extends Controller
{
    public const MINUTES = 10;

    private const TABLE = 'invoice_upload_sessions';

    private const DISK_DIR = 'phone-uploads';

    /** Signed in: a new session. Also clears old ones (and their files). */
    public function start(Request $request)
    {
        foreach (DB::table(self::TABLE)->where('expires_at', '<', now()->subHour())->get(['id', 'file_path']) as $old) {
            if ($old->file_path) {
                Storage::disk('local')->delete($old->file_path);
            }
            DB::table(self::TABLE)->where('id', $old->id)->delete();
        }
        $token = Str::random(40);
        DB::table(self::TABLE)->insert([
            'token' => $token, 'user_id' => $request->user()->id, 'store_id' => $request->attributes->get('store_context_id'),
            'status' => 'waiting', 'expires_at' => now()->addMinutes(self::MINUTES), 'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'data' => [
            'token' => $token,
            'expires_at' => now()->addMinutes(self::MINUTES)->toIso8601String(),
            // A phone cannot resolve names like "mainserver" or "localhost": the page builds the link on this
            // server's LAN address when it was opened by such a name.
            'lan_ip' => $this->lanIp(),
            'phone_base' => $this->phoneBase(),
        ]]);
    }

    /** Signed in: has the phone sent the file yet? */
    public function status(Request $request, string $token)
    {
        $session = $this->ownSession($request, $token);

        return response()->json(['success' => true, 'data' => [
            'status' => $this->expired($session) && $session->status === 'waiting' ? 'expired' : $session->status,
            'file_name' => $session->file_name, 'size' => $session->size, 'mime' => $session->mime,
        ]]);
    }

    /** Signed in: the file the phone sent, once; it is then deleted from the server. */
    public function file(Request $request, string $token)
    {
        $session = $this->ownSession($request, $token);
        abort_unless($session->status === 'received' && $session->file_path && Storage::disk('local')->exists($session->file_path), 404, 'No file from the phone yet.');
        DB::table(self::TABLE)->where('id', $session->id)->update(['status' => 'used', 'updated_at' => now()]);

        return response()->download(Storage::disk('local')->path($session->file_path), $session->file_name, ['Content-Type' => $session->mime])
            ->deleteFileAfterSend();
    }

    /** Phone (no sign-in): is the link still valid, and for whom. */
    public function phoneInfo(string $token)
    {
        $session = DB::table(self::TABLE)->where('token', $token)->first();
        if (! $session || $this->expired($session) || $session->status === 'used') {
            return response()->json(['success' => false, 'message' => 'This link has expired. Open Upload from phone on the computer again for a new QR code.'], 410);
        }
        $user = DB::table('users')->where('id', $session->user_id)->value('name');
        $store = $session->store_id ? DB::table('stores')->where('id', $session->store_id)->value('name') : null;

        return response()->json(['success' => true, 'data' => ['user' => $user, 'store' => $store, 'status' => $session->status,
            'expires_at' => \Illuminate\Support\Carbon::parse($session->expires_at)->toIso8601String()]]);
    }

    /** Phone (no sign-in): the invoice photo or PDF. Sending again replaces the earlier file. */
    public function phoneStore(Request $request, string $token)
    {
        $session = DB::table(self::TABLE)->where('token', $token)->first();
        if (! $session || $this->expired($session) || $session->status === 'used') {
            return response()->json(['success' => false, 'message' => 'This link has expired. Open Upload from phone on the computer again for a new QR code.'], 410);
        }
        $request->validate(['file' => ['required', 'file', 'max:15360', 'mimes:pdf,jpg,jpeg,png,webp']],
            ['file.mimes' => 'Send a photo (JPG, PNG, WEBP) or a PDF.', 'file.max' => 'The file is larger than 15 MB.']);
        $file = $request->file('file');
        if ($session->file_path) {
            Storage::disk('local')->delete($session->file_path);
        }
        $path = $file->storeAs(self::DISK_DIR, $token.'.'.strtolower($file->getClientOriginalExtension() ?: $file->extension()), 'local');
        DB::table(self::TABLE)->where('id', $session->id)->update([
            'status' => 'received', 'file_path' => $path, 'file_name' => $file->getClientOriginalName() ?: 'invoice.'.$file->extension(),
            'mime' => $file->getMimeType(), 'size' => $file->getSize(), 'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Sent. The invoice is on the computer now; you can close this page.']);
    }

    private function ownSession(Request $request, string $token): object
    {
        $session = DB::table(self::TABLE)->where('token', $token)->where('user_id', $request->user()->id)->first();
        abort_unless($session, 404, 'Upload session not found.');

        return $session;
    }

    private function expired(object $session): bool
    {
        return \Illuminate\Support\Carbon::parse($session->expires_at)->isPast();
    }

    /**
     * On an on-prem server: the address a phone on the store Wi-Fi opens, i.e. the counter address (e.g.
     * http://mainserver:5173) with this server's LAN IP for the name. Null on the cloud (the page's own address works).
     */
    private function phoneBase(): ?string
    {
        if (config('sync.node_role') !== 'local' || ! ($ip = $this->lanIp())) {
            return null;
        }
        $counter = (string) \App\Models\StoreLocalNode::where('enabled', true)->value('counter_url');
        $parts = parse_url($counter) ?: [];

        return ($parts['scheme'] ?? 'http').'://'.$ip.(isset($parts['port']) ? ':'.$parts['port'] : '');
    }

    /**
     * This server's address on the store network: the interface the default route uses (a UDP "connect" sends no
     * packet). Looking up the computer name could return an old or virtual adapter's address.
     */
    private function lanIp(): ?string
    {
        $ip = null;
        $socket = @stream_socket_client('udp://8.8.8.8:53', $errno, $error, 1);
        if ($socket) {
            $ip = explode(':', (string) stream_socket_get_name($socket, false))[0] ?: null;
            fclose($socket);
        }
        $ip ??= gethostbyname(gethostname());

        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && ! str_starts_with($ip, '127.') ? $ip : null;
    }
}
