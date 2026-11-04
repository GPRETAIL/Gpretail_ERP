<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrTaxDeclaration;
use App\Models\HrTaxDeclarationItem;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * An employee's income tax declaration for a financial year: the regime and what they will invest or spend on
 * tax-saving items (rent, 80C, medical insurance...), with proofs HR verifies. Staff can change it until the
 * proof deadline; HR at any time.
 */
class TaxDeclarationService
{
    public function __construct(private readonly LoanService $loans, private readonly PayrollSetup $setup) {}

    public static function currentFy(): string
    {
        return PayrollSetup::fyOf(Carbon::now(AttendanceService::timezone())->format('Y-m'));
    }

    public function forEmployee(Employee $employee, string $fy): HrTaxDeclaration
    {
        return HrTaxDeclaration::withoutGlobalScopes()->firstOrCreate(['employee_id' => $employee->id, 'fy' => $fy],
            ['store_id' => $employee->store_id, 'regime' => 'NEW', 'status' => 'DRAFT']);
    }

    /**
     * Saves the regime and the items (items left out are removed). A changed amount needs its proof checked again.
     *
     * @param  array{regime: string, items: array<int, array>}  $data
     */
    public function save(Employee $employee, string $fy, array $data, User $by, bool $asHr): HrTaxDeclaration
    {
        $declaration = $this->forEmployee($employee, $fy);
        if ($declaration->locked && ! $asHr) {
            throw ValidationException::withMessages(['status' => 'Your declaration for '.$fy.' is closed. Ask HR to change it.']);
        }
        foreach ($data['items'] ?? [] as $i => $item) {
            if ($item['section'] === 'HRA') {
                $rent = (float) ($item['details']['rent_per_month'] ?? 0) * (int) ($item['details']['months'] ?? 0);
                if ($rent > 100000 && trim((string) ($item['details']['landlord_pan'] ?? '')) === '') {
                    throw ValidationException::withMessages(["items.{$i}.details.landlord_pan" => "The landlord's PAN is needed when rent is above ₹1,00,000 a year."]);
                }
            }
        }

        DB::transaction(function () use ($declaration, $data, $by) {
            $declaration->update(['regime' => $data['regime'], 'updated_by' => $by->id]);
            $keep = [];
            foreach ($data['items'] ?? [] as $item) {
                $amount = $item['section'] === 'HRA'
                    ? round((float) ($item['details']['rent_per_month'] ?? 0) * (int) ($item['details']['months'] ?? 0), 2)
                    : round((float) $item['declared_amount'], 2);
                $row = ! empty($item['id']) ? $declaration->items()->whereKey($item['id'])->first() : null;
                $fields = ['section' => $item['section'], 'description' => $item['description'] ?? null, 'declared_amount' => $amount, 'details' => $item['details'] ?? null];
                if ($row) {
                    if (abs($row->declared_amount - $amount) > 0.001 && $row->proof_status === 'VERIFIED') {
                        $fields += ['proof_status' => 'SUBMITTED', 'proof_amount' => null, 'verified_by' => null, 'verified_at' => null];
                    }
                    $row->update($fields);
                } else {
                    $row = $declaration->items()->create($fields + ['store_id' => $declaration->store_id]);
                }
                $keep[] = $row->id;
            }
            $gone = $declaration->items()->whereNotIn('id', $keep)->get();
            foreach ($gone as $item) {
                $item->proof_path && Storage::disk('local')->delete($item->proof_path);
                $item->delete();
            }
        });

        return $declaration->refresh()->load('items');
    }

    public function submit(HrTaxDeclaration $declaration): HrTaxDeclaration
    {
        $declaration->update(['status' => 'SUBMITTED', 'submitted_at' => now()]);
        $name = Employee::withoutGlobalScopes()->whereKey($declaration->employee_id)->value('name');
        $this->loans->notify(null, $declaration->store_id, 'TAX_PROOF', 'Tax declaration submitted', "{$name} submitted their {$declaration->fy} tax declaration.", '/hrms/income-tax', $declaration->id);

        return $declaration->refresh();
    }

    public function uploadProof(HrTaxDeclarationItem $item, UploadedFile $file): HrTaxDeclarationItem
    {
        $declaration = $item->declaration;
        if ($declaration->locked) {
            throw ValidationException::withMessages(['status' => 'This declaration is closed.']);
        }
        $old = $item->proof_path;
        $item->update(['proof_path' => $file->store("employees/{$declaration->employee_id}/tax/{$declaration->fy}", 'local'), 'proof_status' => 'SUBMITTED',
            'proof_amount' => null, 'verified_by' => null, 'verified_at' => null]);
        $old && Storage::disk('local')->delete($old);
        $name = Employee::withoutGlobalScopes()->whereKey($declaration->employee_id)->value('name');
        $this->loans->notify(null, $declaration->store_id, 'TAX_PROOF', 'Tax proof to verify', "{$name} uploaded a proof for {$item->section}.", '/hrms/income-tax', $declaration->id);

        return $item->refresh();
    }

    public function verify(HrTaxDeclarationItem $item, User $by, bool $accept, ?float $amount, ?string $note): HrTaxDeclarationItem
    {
        $this->loans->notOwn($item->declaration->employee_id, $by);
        $item->update(['proof_status' => $accept ? 'VERIFIED' : 'REJECTED', 'proof_amount' => $accept ? round($amount ?? $item->declared_amount, 2) : null,
            'verified_by' => $by->id, 'verified_at' => now(), 'note' => $note]);
        $userId = Employee::withoutGlobalScopes()->whereKey($item->declaration->employee_id)->value('user_id');
        $this->loans->notify($userId, $item->store_id, 'TAX_VERIFIED', $accept ? 'Tax proof accepted' : 'Tax proof not accepted',
            "{$item->section}: ".($accept ? '₹'.number_format($item->proof_amount, 2).' accepted.' : 'please upload a valid proof.').($note ? " {$note}" : ''), '/hrms/my-tax', $item->declaration_id, true);

        return $item->refresh();
    }

    public function proofUrl(HrTaxDeclarationItem $item): ?string
    {
        return $item->proof_path && Storage::disk('local')->exists($item->proof_path)
            ? Storage::disk('local')->temporaryUrl($item->proof_path, now()->addMinutes(10))
            : null;
    }

    /** The nightly run: declarations close once the year's proof deadline has passed. */
    public function lockDue(): int
    {
        $count = 0;
        HrTaxDeclaration::withoutGlobalScopes()->where('locked', false)->get()->each(function (HrTaxDeclaration $declaration) use (&$count) {
            if (app(TdsService::class)->afterDeadline($declaration->fy, $this->setup->taxRules((int) $declaration->store_id, $declaration->fy))) {
                $declaration->update(['locked' => true]);
                $count++;
            }
        });

        return $count;
    }
}
