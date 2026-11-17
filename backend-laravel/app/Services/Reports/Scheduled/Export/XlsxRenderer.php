<?php

namespace App\Services\Reports\Scheduled\Export;

use App\Services\Reports\Scheduled\ReportTable;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/** A scheduled report as an Excel file: store and period on top, then each table with a bold header and totals row. */
class XlsxRenderer
{
    private const FORMATS = ['money' => '#,##0.00', 'qty' => '#,##0.###', 'count' => '#,##0', 'percent' => '0.0"%"'];

    public function render(ReportTable $report, string $storeName, string $path): string
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet();
        $sheet->setTitle(mb_substr(preg_replace('/[\\\\\/?*\[\]:]/', ' ', $report->title), 0, 31));
        $sheet->setCellValue('A1', $report->title)->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->setCellValue('A2', $storeName.' · '.$report->period);
        $row = 3;
        foreach ($report->summary as $label => $value) {
            $sheet->setCellValue("A$row", $label)->setCellValue("B$row", $value);
            $sheet->getStyle("A$row")->getFont()->setBold(true);
            $row++;
        }
        $row++;
        $widest = 1;
        foreach ($report->sections as $section) {
            $columns = $section['columns'];
            $widest = max($widest, count($columns));
            if ($section['title']) {
                $sheet->setCellValue("A$row", $section['title'])->getStyle("A$row")->getFont()->setBold(true)->setSize(12);
                $row++;
            }
            $header = $row;
            foreach ($columns as $i => $column) {
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($i + 1).$row, $column['label']);
            }
            $last = Coordinate::stringFromColumnIndex(max(1, count($columns)));
            $sheet->getStyle("A$row:$last$row")->getFont()->setBold(true);
            $sheet->getStyle("A$row:$last$row")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8EEF7');
            $row++;
            foreach ($section['rows'] as $line) {
                foreach ($columns as $i => $column) {
                    $value = $line[$column['key']] ?? null;
                    $cell = Coordinate::stringFromColumnIndex($i + 1).$row;
                    if (isset(self::FORMATS[$column['type']]) && is_numeric($value)) {
                        $sheet->setCellValue($cell, (float) $value)->getStyle($cell)->getNumberFormat()->setFormatCode(self::FORMATS[$column['type']]);
                    } else {
                        $sheet->setCellValueExplicit($cell, $value === null ? '' : (string) $value, DataType::TYPE_STRING);
                    }
                }
                $row++;
            }
            $totals = array_filter($section['totals'] ?? [], fn ($v) => $v !== null);
            if ($totals && $section['rows']) {
                $sheet->setCellValue("A$row", 'Total');
                foreach ($columns as $i => $column) {
                    if (array_key_exists($column['key'], $totals) && $i > 0) {
                        $cell = Coordinate::stringFromColumnIndex($i + 1).$row;
                        $sheet->setCellValue($cell, (float) $totals[$column['key']])->getStyle($cell)->getNumberFormat()->setFormatCode(self::FORMATS[$column['type']] ?? '#,##0.00');
                    }
                }
                $sheet->getStyle("A$row:$last$row")->getFont()->setBold(true);
                $row++;
            }
            if (count($report->sections) === 1) {
                $sheet->freezePane('A'.($header + 1));
            }
            $row++;
        }
        foreach (range(1, $widest) as $i) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
        }
        (new Xlsx($book))->save($path);
        $book->disconnectWorksheets();

        return $path;
    }
}
