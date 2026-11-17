<?php

namespace App\Services\Reports\Scheduled\Export;

use App\Services\Reports\Scheduled\ReportTable;
use Dompdf\Dompdf;
use Dompdf\Options;

/** A scheduled report as an A4 landscape PDF with the store's name, address and GSTIN on top and page numbers. */
class PdfRenderer
{
    /** PDFs over this many rows are cut short (the Excel file carries everything). */
    public const MAX_ROWS = 3000;

    public function render(ReportTable $report, object $store, string $path): string
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans'); // Has the ₹ sign.
        $options->set('tempDir', sys_get_temp_dir());
        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.scheduled-pdf', ['report' => $report, 'store' => $store, 'maxRows' => self::MAX_ROWS])->render());
        $pdf->setPaper('A4', 'landscape');
        $pdf->render();
        $pdf->getCanvas()->page_text(760, 570, 'Page {PAGE_NUM} of {PAGE_COUNT}', null, 7, [0.4, 0.4, 0.4]);
        file_put_contents($path, $pdf->output());

        return $path;
    }

    /** How a value prints in a column of this type (also used by the email body). */
    public static function cell(mixed $value, string $type): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        if (! is_numeric($value)) {
            return (string) $value;
        }

        return match ($type) {
            'money' => number_format((float) $value, 2),
            'percent' => rtrim(rtrim(number_format((float) $value, 1), '0'), '.').'%',
            'count' => number_format((float) $value),
            'qty' => rtrim(rtrim(number_format((float) $value, 3), '0'), '.'),
            default => (string) $value,
        };
    }
}
