<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

/**
 * Employee ID proofs and certificates used to sit on the public disk, readable by anyone with the URL.
 * They now live on the private disk under the same relative path, served only through signed links
 * (EmployeeController::documentUrl), which still accepts the old /storage/... values.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->move(Storage::disk('public'), Storage::disk('local'));
    }

    public function down(): void
    {
        $this->move(Storage::disk('local'), Storage::disk('public'));
    }

    private function move($from, $to): void
    {
        foreach ($from->allFiles('employees') as $path) {
            if (! $to->exists($path)) {
                $to->writeStream($path, $from->readStream($path));
            }
            // The disks don't throw, so delete the original only once the copy is really there.
            if ($to->exists($path) && $to->size($path) === $from->size($path)) {
                $from->delete($path);
            }
        }
    }
};
