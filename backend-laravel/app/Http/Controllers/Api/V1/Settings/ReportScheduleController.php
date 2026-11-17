<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Controller;
use App\Models\RecipientGroup;
use App\Models\ReportSchedule;
use App\Models\ReportScheduleRun;
use App\Models\User;
use App\Services\Messaging\MailerFactory;
use App\Services\Reports\Scheduled\ReportPeriod;
use App\Services\Reports\Scheduled\ScheduledReportCatalog;
use App\Services\Reports\Scheduled\ScheduledReportRunner;
use App\Services\Tenancy\PagePermissions;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Settings > Scheduler: reports emailed on a schedule (Excel/PDF) to users, roles, recipient groups and outside
 * addresses, for the selected store, plus the delivery log. Sending is done by ScheduledReportRunner.
 */
class ReportScheduleController extends Controller
{
    private const ROLES = ['admin', 'manager', 'accountant', 'supervisor', 'cashier', 'warehouse_user', 'store_user', 'staff', 'user'];

    public function __construct(private ScheduledReportCatalog $catalog, private ScheduledReportRunner $runner) {}

    /** Everything the schedule form needs: reports by module, periods, roles, this store's users and groups. */
    public function options(Request $request, MailerFactory $mailers): JsonResponse
    {
        $storeId = $this->storeId($request);
        $user = $request->user();
        $reports = collect($this->catalog->all())->map(fn ($r, $key) => ['key' => $key, 'label' => $r['label'], 'module' => $r['module'], 'dated' => $r['dated'],
            'layouts' => $r['layouts'] ?? [], 'allowed' => $this->mayView($user, $r['page'])])->values();
        $users = User::where('is_active', true)->where(fn ($q) => $q->where('store_id', $storeId)
            ->orWhereIn('id', DB::table('user_store_access')->where('store_id', $storeId)->select('user_id')))
            ->where('email', 'not like', '%@staff.invalid')->orderBy('name')->get(['id', 'name', 'email', 'role']);

        return response()->json(['success' => true, 'data' => [
            'reports' => $reports, 'modules' => ScheduledReportCatalog::MODULES, 'periods' => collect(ReportPeriod::PERIODS)->map(fn ($label, $value) => compact('value', 'label'))->values(),
            'roles' => self::ROLES, 'users' => $users, 'groups' => RecipientGroup::where('store_id', $storeId)->orderBy('name')->get(['id', 'name']),
            'email_ready' => $mailers->ready($storeId), 'own_smtp' => $mailers->hasOwnSmtp($storeId),
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);
        $schedules = ReportSchedule::with(['recipients', 'creator:id,name'])->where('store_id', $storeId)->orderBy('name')->get();

        return response()->json(['success' => true, 'data' => $schedules->map(fn ($s) => $this->present($s))]);
    }

    public function store(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);
        $data = $this->validated($request, $storeId);
        $schedule = DB::transaction(function () use ($data, $storeId, $request) {
            $schedule = new ReportSchedule(['store_id' => $storeId, 'created_by' => $request->user()->id]);
            $this->fill($schedule, $data);

            return $schedule;
        });

        return response()->json(['success' => true, 'message' => 'Schedule saved. Next email: '.$this->when($schedule).'.', 'data' => $this->present($schedule->fresh(['recipients', 'creator:id,name']))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $storeId = $this->storeId($request);
        $schedule = ReportSchedule::where('store_id', $storeId)->findOrFail($id);
        $data = $this->validated($request, $storeId);
        DB::transaction(fn () => $this->fill($schedule, $data));

        return response()->json(['success' => true, 'message' => 'Schedule saved.', 'data' => $this->present($schedule->fresh(['recipients', 'creator:id,name']))]);
    }

    /** Turns a schedule on or off (on: next time worked out from now). */
    public function toggle(Request $request, int $id): JsonResponse
    {
        $schedule = ReportSchedule::where('store_id', $this->storeId($request))->findOrFail($id);
        $active = $request->validate(['is_active' => 'required|boolean'])['is_active'];
        $schedule->forceFill(['is_active' => $active, 'next_run_at' => $active ? ScheduledReportRunner::nextRun($schedule, CarbonImmutable::now()) : null])->save();

        return response()->json(['success' => true, 'data' => $this->present($schedule->fresh(['recipients', 'creator:id,name']))]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        ReportSchedule::where('store_id', $this->storeId($request))->findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Schedule deleted.']);
    }

    /** Sends a schedule now: to all its recipients, or only to me (a check before turning it on). */
    public function sendNow(Request $request, int $id): JsonResponse
    {
        $schedule = ReportSchedule::where('store_id', $this->storeId($request))->findOrFail($id);
        $onlyMe = $request->boolean('only_me');
        if ($onlyMe && ! filter_var($request->user()->email, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['only_me' => 'Your user has no email address.']);
        }
        // "Send to me" goes to the person testing it, whether or not they are on the list.
        $run = $this->runner->run($schedule, 'manual', $request->user(), $onlyMe ? [$request->user()->email] : null);
        $ok = in_array($run->status, ['sent', 'partial'], true);

        return response()->json(['success' => $ok, 'message' => $ok ? 'Sent to '.count($run->recipients ?? []).' recipient(s).' : ($run->error ?: 'Not sent.'),
            'data' => $this->presentRun($run)], $ok ? 200 : 422);
    }

    /** Downloads the report as it would be emailed now (Excel or PDF). */
    public function preview(Request $request, int $id): BinaryFileResponse
    {
        $schedule = ReportSchedule::where('store_id', $this->storeId($request))->findOrFail($id);
        $format = $request->validate(['format' => ['required', Rule::in(ReportSchedule::FORMATS)]])['format'];
        $dir = storage_path('app/scheduled-reports/preview-'.bin2hex(random_bytes(6)));
        $files = $this->runner->preview($schedule, $format, $dir);
        $name = array_key_first($files);
        register_shutdown_function(fn () => File::deleteDirectory($dir));

        return response()->download($files[$name], $name)->deleteFileAfterSend(true);
    }

    /** The delivery log (newest first), optionally for one schedule. */
    public function runs(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);
        $runs = ReportScheduleRun::with('schedule:id,name,report_key')->where('store_id', $storeId)
            ->when($request->filled('schedule_id'), fn ($q) => $q->where('report_schedule_id', $request->integer('schedule_id')))
            ->latest('id')->limit(300)->get();

        return response()->json(['success' => true, 'data' => $runs->map(fn ($r) => $this->presentRun($r))]);
    }

    public function groups(Request $request): JsonResponse
    {
        $groups = RecipientGroup::with('members')->where('store_id', $this->storeId($request))->orderBy('name')->get();
        $names = User::whereIn('id', $groups->flatMap->members->pluck('user_id')->filter())->get(['id', 'name', 'email'])->keyBy('id');

        return response()->json(['success' => true, 'data' => $groups->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'description' => $g->description,
            'members' => $g->members->map(fn ($m) => ['user_id' => $m->user_id, 'email' => $m->email, 'name' => $m->user_id ? ($names[$m->user_id]->name ?? null) : null,
                'user_email' => $m->user_id ? ($names[$m->user_id]->email ?? null) : null])->values()])]);
    }

    public function saveGroup(Request $request, ?int $id = null): JsonResponse
    {
        $storeId = $this->storeId($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('recipient_groups', 'name')->where('store_id', $storeId)->ignore($id)],
            'description' => 'nullable|string|max:255',
            'user_ids' => 'array|max:200', 'user_ids.*' => 'integer',
            'emails' => 'array|max:200', 'emails.*' => 'email|max:191',
        ]);
        $group = DB::transaction(function () use ($data, $storeId, $id, $request) {
            $group = $id ? RecipientGroup::where('store_id', $storeId)->findOrFail($id) : new RecipientGroup(['store_id' => $storeId, 'created_by' => $request->user()->id]);
            $group->fill(['store_id' => $storeId, 'name' => trim($data['name']), 'description' => $data['description'] ?? null])->save();
            $group->members()->delete();
            foreach (array_unique($data['user_ids'] ?? []) as $userId) {
                $group->members()->create(['user_id' => $userId]);
            }
            foreach (array_unique(array_map('strtolower', $data['emails'] ?? [])) as $email) {
                $group->members()->create(['email' => $email]);
            }

            return $group;
        });

        return response()->json(['success' => true, 'message' => 'Group saved.', 'data' => ['id' => $group->id, 'name' => $group->name]], $id ? 200 : 201);
    }

    public function destroyGroup(Request $request, int $id): JsonResponse
    {
        $group = RecipientGroup::where('store_id', $this->storeId($request))->findOrFail($id);
        $used = DB::table('report_schedule_recipients')->where('type', 'group')->where('value', (string) $group->id)->count();
        if ($used) {
            throw ValidationException::withMessages(['group' => "$used schedule(s) send to this group. Remove it from them first."]);
        }
        $group->delete();

        return response()->json(['success' => true, 'message' => 'Group deleted.']);
    }

    private function validated(Request $request, int $storeId): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'report_key' => 'required|string|max:100',
            'params' => 'nullable|array', 'params.layout' => 'nullable|string|max:60',
            'period' => ['required', Rule::in(array_keys(ReportPeriod::PERIODS))],
            'frequency' => ['required', Rule::in(ReportSchedule::FREQUENCIES)],
            'send_time' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'day_of_week' => 'nullable|required_if:frequency,weekly|integer|between:1,7',
            'day_of_month' => 'nullable|required_if:frequency,monthly|integer|between:1,31',
            'formats' => 'required|array|min:1', 'formats.*' => [Rule::in(ReportSchedule::FORMATS)],
            'subject' => 'nullable|string|max:200',
            'message' => 'nullable|string|max:2000',
            'skip_empty' => 'boolean',
            'is_active' => 'boolean',
            'recipients' => 'required|array|min:1|max:200',
            'recipients.*.type' => ['required', Rule::in(ReportSchedule::RECIPIENT_TYPES)],
            'recipients.*.value' => 'required|string|max:191',
        ], ['recipients.required' => 'Add at least one recipient.', 'formats.required' => 'Choose Excel, PDF or both.']);
        $meta = $this->catalog->get($data['report_key']);
        if (! $this->mayView($request->user(), $this->catalog->all()[$data['report_key']]['page'])) {
            throw ValidationException::withMessages(['report_key' => 'You cannot view this report, so you cannot schedule it.']);
        }
        if (isset($meta['layouts']) && ($data['params']['layout'] ?? null) && ! collect($meta['layouts'])->contains('value', $data['params']['layout'])) {
            throw ValidationException::withMessages(['params.layout' => 'Choose one of this report\'s layouts.']);
        }
        foreach ($data['recipients'] as $recipient) {
            $ok = match ($recipient['type']) {
                'email' => (bool) filter_var($recipient['value'], FILTER_VALIDATE_EMAIL),
                'role' => in_array($recipient['value'], self::ROLES, true),
                'group' => RecipientGroup::where('store_id', $storeId)->whereKey((int) $recipient['value'])->exists(),
                default => User::whereKey((int) $recipient['value'])->exists(),
            };
            if (! $ok) {
                throw ValidationException::withMessages(['recipients' => "Recipient \"{$recipient['value']}\" is not valid."]);
            }
        }

        return $data;
    }

    private function fill(ReportSchedule $schedule, array $data): void
    {
        $schedule->fill([
            'name' => trim($data['name']), 'report_key' => $data['report_key'], 'params' => $data['params'] ?? null, 'period' => $data['period'],
            'frequency' => $data['frequency'], 'send_time' => $data['send_time'],
            'day_of_week' => $data['frequency'] === 'weekly' ? $data['day_of_week'] : null, 'day_of_month' => $data['frequency'] === 'monthly' ? $data['day_of_month'] : null,
            'formats' => array_values(array_unique($data['formats'])), 'subject' => $data['subject'] ?? null, 'message' => $data['message'] ?? null,
            'skip_empty' => (bool) ($data['skip_empty'] ?? false), 'is_active' => (bool) ($data['is_active'] ?? true),
        ]);
        $schedule->next_run_at = $schedule->is_active ? ScheduledReportRunner::nextRun($schedule, CarbonImmutable::now()) : null;
        $schedule->save();
        $schedule->recipients()->delete();
        $seen = [];
        foreach ($data['recipients'] as $recipient) {
            $key = $recipient['type'].':'.strtolower(trim($recipient['value']));
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $schedule->recipients()->create(['type' => $recipient['type'], 'value' => trim($recipient['value'])]);
            }
        }
    }

    private function present(ReportSchedule $schedule): array
    {
        $meta = $this->catalog->all()[$schedule->report_key] ?? null;

        return [
            'id' => $schedule->id, 'name' => $schedule->name, 'report_key' => $schedule->report_key, 'report_label' => $meta['label'] ?? $schedule->report_key,
            'module' => $meta['module'] ?? null, 'params' => $schedule->params, 'period' => $schedule->period, 'period_label' => ReportPeriod::PERIODS[$schedule->period] ?? $schedule->period,
            'frequency' => $schedule->frequency, 'send_time' => $schedule->send_time, 'day_of_week' => $schedule->day_of_week, 'day_of_month' => $schedule->day_of_month,
            'formats' => $schedule->formats, 'subject' => $schedule->subject, 'message' => $schedule->message, 'skip_empty' => $schedule->skip_empty, 'is_active' => $schedule->is_active,
            'next_run_at' => $schedule->next_run_at?->setTimezone(config('app.business_timezone'))->format('Y-m-d H:i'),
            'last_run_at' => $schedule->last_run_at?->setTimezone(config('app.business_timezone'))->format('Y-m-d H:i'), 'last_status' => $schedule->last_status,
            'created_by' => $schedule->creator?->name,
            'recipients' => $schedule->recipients->map(fn ($r) => ['type' => $r->type, 'value' => $r->value])->values(),
        ];
    }

    private function presentRun(ReportScheduleRun $run): array
    {
        $tz = config('app.business_timezone');

        return [
            'id' => $run->id, 'schedule_id' => $run->report_schedule_id, 'schedule' => $run->schedule?->name, 'trigger' => $run->trigger, 'status' => $run->status,
            'period_from' => $run->period_from?->toDateString(), 'period_to' => $run->period_to?->toDateString(), 'rows' => $run->rows,
            'recipients' => $run->recipients ?? [], 'skipped' => $run->skipped_recipients ?? [], 'files' => $run->files ?? [], 'error' => $run->error,
            'at' => $run->started_at?->setTimezone($tz)->format('Y-m-d H:i'),
        ];
    }

    private function when(ReportSchedule $schedule): string
    {
        return $schedule->next_run_at ? $schedule->next_run_at->setTimezone(config('app.business_timezone'))->format('d M Y, h:i A') : 'off';
    }

    private function mayView(User $user, string $page): bool
    {
        return in_array($user->role, ['admin', 'super_admin'], true) || app(PagePermissions::class)->allows($user, $page, 'view');
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first; each store has its own schedules.');

        return $storeId;
    }
}
