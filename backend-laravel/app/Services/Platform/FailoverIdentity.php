<?php

namespace App\Services\Platform;

use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Security\FailedAttempts;
use App\Services\Tenancy\StoreContext;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * The cloud's half of on-prem failover. The cloud is the master for staff accounts:
 * - an on-prem server connects with a cloud admin's sign-in and gets its sync identity;
 * - it copies the store's users from here;
 * - it asks for a cloud sign-in for a cashier, used only while the on-prem server is down;
 * - it checks a cloud sign-in made during an outage, so the cashier gets an on-prem one afterwards.
 */
class FailoverIdentity
{
    public const TOKEN_NAME = 'failover-token';
    public const TOKEN_HOURS = 24;

    /** Fields copied to the on-prem server. Hidden fields (password and PIN hashes) included on purpose. */
    private const USER_FIELDS = ['id', 'name', 'username', 'email', 'password', 'approval_pin_hash', 'role', 'store_id', 'phone', 'is_active',
        'must_change_password', 'counter_id', 'platform_company_code', 'platform_password_version', 'google_sub', 'platform_identity',
        'web_access', 'mobile_access', 'module_permissions', 'page_permissions'];

    private const ACTIVATION_FIELDS = ['deployment_id', 'company_code', 'client_id', 'activated', 'status', 'active_till', 'limits', 'feature_flags',
        'licence_token', 'licence_state', 'licence_expires_at', 'licence_grace_until', 'registered_at', 'tenant_admin_email', 'first_erp_login_at'];

    private const STORE_SECRETS = ['admin_password', 'einvoice_password', 'gst_access_key', 'backup_settings'];

    public function __construct(private StoreContext $stores) {}

    /**
     * A cloud company admin connects an on-prem server to one store: the same checks as sign-in, then this
     * store's node gets a fresh sync token (an earlier pairing stops working).
     *
     * @return array{tenant_key: string, sync_token: string, store_id: int, store_code: ?string}
     */
    public function registerNode(string $login, string $password, ?string $platformStoreId, ?string $storeCode, ?string $counterUrl, string $ip): array
    {
        $account = strtolower(trim($login));
        $limits = [["login:$account|$ip", 8, 900], ["login:$account", 30, 3600]];
        if ($wait = FailedAttempts::lockedFor($limits)) {
            throw new HttpException(429, FailedAttempts::message('sign-in attempts for this account', $wait), null, ['Retry-After' => (string) $wait]);
        }
        $user = User::where('username', trim($login))->orWhereRaw('LOWER(email) = ?', [$account])->first();
        if (! $user || ! Hash::check($password, (string) $user->password)) {
            FailedAttempts::fail($limits);
            throw ValidationException::withMessages(['username' => 'Cloud sign-in failed: wrong username or password.']);
        }
        FailedAttempts::clear($limits);
        if (! $user->is_active || ! in_array($user->role, ['admin', 'super_admin'], true)) {
            throw ValidationException::withMessages(['username' => 'Only an active company administrator on the cloud can connect an on-prem server.']);
        }

        $available = $this->stores->available($user);
        $store = null;
        if ($platformStoreId) {
            $store = (clone $available)->where('platform_store_id', $platformStoreId)->first();
        }
        if (! $store && $storeCode) {
            $store = (clone $available)->where('code', $storeCode)->first();
        }
        if (! $store && ! $platformStoreId && ! $storeCode) {
            // A fresh on-prem server doesn't know its store yet: the admin's only store, or the admin chooses.
            $choices = (clone $available)->where('is_active', true)->orderBy('name')->get(['code', 'name']);
            if ($choices->count() > 1) {
                throw new HttpResponseException(response()->json(['success' => false, 'code' => 'CHOOSE_STORE',
                    'message' => 'Choose the store this server runs.', 'stores' => $choices->map->only(['code', 'name'])->values()], 422));
            }
            $store = $choices->count() === 1 ? (clone $available)->where('code', $choices[0]->code)->first() : null;
        }
        if (! $store) {
            throw ValidationException::withMessages(['store' => 'This store was not found on the cloud for this administrator. Check the cloud address and that the store is activated there.']);
        }

        $node = StoreLocalNode::firstOrNew(['store_id' => $store->id]);
        $node->tenant_key = $node->tenant_key ?: (string) Str::uuid();
        $node->sync_token = Str::random(48);
        $node->enabled = true;
        if ($counterUrl) {
            $node->counter_url = $counterUrl;
            $node->local_server_url = $counterUrl;
        }
        $node->save();

        return ['tenant_key' => $node->tenant_key, 'sync_token' => $node->sync_token, 'store_id' => $store->id, 'store_code' => $store->code,
            'identity' => $this->identityFor($node)];
    }

    /**
     * What an on-prem server needs to run this store without ever talking to Vynerix admin: the company
     * activation and the store with its signed licence, exactly as this cloud holds them (the licence is signed
     * for this cloud's deployment, so the on-prem server carries the same deployment identity). Never this
     * cloud's own Vynerix admin token, and none of the store's stored passwords or keys.
     *
     * @return array{activation: ?array, store: ?array}
     */
    public function identityFor(StoreLocalNode $node): array
    {
        $activation = DB::table('platform_activations')->orderByDesc('id')->first();
        $store = DB::table('stores')->where('id', $node->store_id)->first();

        return [
            'activation' => $activation ? Arr::only((array) $activation, self::ACTIVATION_FIELDS) : null,
            'store' => $store ? Arr::except((array) $store, self::STORE_SECRETS) : null,
        ];
    }

    /** Everyone who can open this store, except the sync system users. */
    public function storeUsers(StoreLocalNode $node): array
    {
        $store = $node->store;
        if (! $store) {
            return [];
        }

        return User::query()
            ->where('role', '!=', 'sync_system')
            ->where(fn ($q) => $q->where('store_id', $store->id)
                ->orWhereHas('assignedStores', fn ($s) => $s->whereKey($store->id))
                ->orWhere(fn ($admin) => $admin->whereIn('role', ['admin', 'super_admin'])->whereNull('store_id')
                    ->where('platform_company_code', $store->platform_company_code)))
            ->orderBy('id')
            ->get()
            ->map(fn (User $user) => $user->makeVisible(['password', 'approval_pin_hash', 'google_sub'])->only(self::USER_FIELDS))
            ->values()
            ->all();
    }

    /** @return array{token: string, expires_at: string} a cloud sign-in usable only for this node's store */
    public function issueFailoverToken(StoreLocalNode $node, string $username): array
    {
        $user = $this->storeUser($node, $username);
        abort_unless($user, 404, 'This user has no active cloud account for this store.');

        $storeAbility = 'store:'.$node->store_id;
        $user->tokens()->where('name', self::TOKEN_NAME)->get()
            ->filter(fn (PersonalAccessToken $token) => in_array($storeAbility, $token->abilities ?? [], true))
            ->each->delete();
        $expiresAt = now()->addHours(self::TOKEN_HOURS);
        $token = $user->createToken(self::TOKEN_NAME, ['client:web', 'failover', $storeAbility], $expiresAt)->plainTextToken;

        return ['token' => $token, 'expires_at' => $expiresAt->toIso8601String()];
    }

    /** The username behind a cloud sign-in, when it is valid and can open this node's store. */
    public function sessionUsername(StoreLocalNode $node, string $plainToken): ?string
    {
        $token = PersonalAccessToken::findToken($plainToken);
        if (! $token || ($token->expires_at && $token->expires_at->isPast())) {
            return null;
        }
        $owner = $token->tokenable;

        return $owner instanceof User && $this->storeUser($node, (string) $owner->username)?->is($owner) ? $owner->username : null;
    }

    private function storeUser(StoreLocalNode $node, string $username): ?User
    {
        $user = User::where('username', $username)->where('is_active', true)->where('role', '!=', 'sync_system')->first();

        return $user && $this->stores->available($user)->whereKey($node->store_id)->exists() ? $user : null;
    }

    /** The store a token is locked to (failover sign-ins), or null for an ordinary sign-in. */
    public static function lockedStoreId(?User $user): ?int
    {
        $token = $user?->currentAccessToken();
        if (! $token instanceof PersonalAccessToken) {
            return null;
        }
        foreach ($token->abilities ?? [] as $ability) {
            if (str_starts_with((string) $ability, 'store:')) {
                return (int) substr((string) $ability, 6);
            }
        }

        return null;
    }
}
