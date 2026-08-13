<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExportRun extends BaseCommand
{
    protected $group       = 'custom';
    protected $name        = 'export:run';
    protected $description = 'Runs chunked export as CSV, Excel, or PDF';

    public function run(array $params)
    {
        $taskId = $params[0] ?? null;
        if (!$taskId) {
            CLI::error('Missing task ID.');
            return;
        }

        $basePath = WRITEPATH . 'exports/';
        $statusFile = $basePath . $taskId . '.json';

        if (!file_exists($statusFile)) {
            CLI::error('Status file not found.');
            return;
        }

        $status = json_decode(file_get_contents($statusFile), true);
        $type = $status['type'] ?? 'csv';
        $total = $status['total'] ?? 100000;

        if ($type === 'csv') {
            $fp = fopen($status['file'], 'a');
            for ($i = $status['exported']; $i < $total; $i += 1000) {
                for ($j = $i; $j < min($i + 1000, $total); $j++) {
                    fputcsv($fp, [$j + 1, "Product " . ($j + 1), rand(10, 999)]);
                }
                $status['exported'] = $j;
                $status['message'] = "Exported {$status['exported']} of {$status['total']}";
                $status['complete'] = $j >= $total;
                file_put_contents($statusFile, json_encode($status));
                sleep(1);
            }
            fclose($fp);
        } elseif ($type === 'excel') {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray(['ID', 'Name', 'Price'], NULL, 'A1');
            $row = 2;

            for ($i = $status['exported']; $i < $total; $i += 1000) {
                for ($j = $i; $j < min($i + 1000, $total); $j++, $row++) {
                    $sheet->setCellValue("A{$row}", $j + 1);
                    $sheet->setCellValue("B{$row}", "Product " . ($j + 1));
                    $sheet->setCellValue("C{$row}", rand(10, 999));
                }

                $status['exported'] = $j;
                $status['message'] = "Exported {$status['exported']} of {$status['total']}";
                $status['complete'] = $j >= $total;
                file_put_contents($statusFile, json_encode($status));
                sleep(1);
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save($status['file']);
        } elseif ($type === 'pdf') {
            $text = "ID,Name,Price\n";
            for ($i = $status['exported']; $i < $total; $i += 1000) {
                for ($j = $i; $j < min($i + 1000, $total); $j++) {
                    $text .= ($j + 1) . ",Product " . ($j + 1) . "," . rand(10, 999) . "\n";
                }

                $status['exported'] = $j;
                $status['message'] = "Exported {$status['exported']} of {$status['total']}";
                $status['complete'] = $j >= $total;
                file_put_contents($statusFile, json_encode($status));
                sleep(1);
            }

            file_put_contents($status['file'], $text); // simulate
        }
    }
}
