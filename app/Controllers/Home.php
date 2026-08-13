<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Libraries\Excel; // Assuming you created a library wrapper for PHPExcel
use Config\Database;

class Home extends BaseController
{
    protected $db;
    protected $excel;

    public function __construct()
    {
        helper(['url']);
        $this->db = Database::connect();

        // Load PHPExcel manually
        require_once(APPPATH . 'ThirdParty/PHPExcel/PHPExcel.php');
        $this->excel = new \PHPExcel();
    }

    public function index()
    {
        $data['rs'] = $this->db->table('countries')->get();
        return view('home', $data);
    }

    public function excel()
    {
        $this->excel->setActiveSheetIndex(0);
        $sheet = $this->excel->getActiveSheet();

        $sheet->setTitle('Countries');
        $sheet->setCellValue('A1', 'Country Excel Sheet');
        $sheet->setCellValue('A4', 'S.No.');
        $sheet->setCellValue('B4', 'Country Code');
        $sheet->setCellValue('C4', 'Country Name');

        $sheet->mergeCells('A1:C1');
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFont()->setBold(true);
        $sheet->getStyle('A1')->getFont()->setSize(16);
        $sheet->getStyle('A1')->getFill()->getStartColor()->setARGB('#333');

        for ($col = ord('A'); $col <= ord('C'); $col++) {
            $sheet->getColumnDimension(chr($col))->setAutoSize(true);
            $sheet->getStyle(chr($col))->getFont()->setSize(12);
            $sheet->getStyle(chr($col))->getAlignment()->setHorizontal(\PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
        }

        $query = $this->db->table('countries')->get();
        $result = $query->getResultArray();

        $rowIndex = 5; // Start from 5th row
        $sno = 1;
        foreach ($result as $row) {
            $sheet->setCellValue('A' . $rowIndex, $sno++);
            $sheet->setCellValue('B' . $rowIndex, $row['code']);
            $sheet->setCellValue('C' . $rowIndex, $row['name']);
            $rowIndex++;
        }

        $filename = 'PHPExcelDemo.xls';
        header('Content-Type: application/vnd.ms-excel');
        header("Content-Disposition: attachment; filename=\"$filename\"");
        header('Cache-Control: max-age=0');

        $writer = \PHPExcel_IOFactory::createWriter($this->excel, 'Excel5');
        $writer->save('php://output');
        exit;
    }
}
