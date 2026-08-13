<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\Database\BaseConnection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xls;
use App\Models\SettingModel;
use CodeIgniter\I18n\Time;

class Cron extends Controller
{
    protected $db;

    public function __construct()
    {
        $this->db = db_connect(); // CI4 Database Connection
    }

    public function index()
    {
        $sales = $this->db->query("
            SELECT sls.id 
            FROM sales AS sls
            LEFT JOIN sale_items AS slsit ON slsit.sale_id = sls.id
            LEFT JOIN products AS pro ON pro.id = slsit.product_id
            WHERE pro.hsn != '' AND pro.hsn != 0
            GROUP BY sls.id
        ")->getResult();

        foreach ($sales as $invoice) {
            $this->db->query(
                "
                INSERT INTO dsales (...)
                SELECT ... FROM sales WHERE id = ?",
                [$invoice->id]
            );
            $sales_id = $this->db->insertID();

            $items = $this->db->query("SELECT id FROM sale_items WHERE sale_id = ?", [$invoice->id])->getResult();
            foreach ($items as $item) {
                $this->db->query(
                    "
                    INSERT INTO dsale_items (...)
                    SELECT ... FROM sale_items WHERE id = ?",
                    [$item->id]
                );
            }

            $taxes = $this->db->query("SELECT ssi FROM tax_summary WHERE salesid = ?", [$invoice->id])->getResult();
            foreach ($taxes as $tax) {
                $this->db->query(
                    "
                    INSERT INTO dtax_summary (...)
                    SELECT ... FROM tax_summary WHERE ssi = ?",
                    [$tax->ssi]
                );
            }
        }

        return $this->response->setBody('Completed');
    }

    public function excelemail()
    {
        $adad = date("Y-m-d", strtotime("-1 days"));
        $settings = $this->db->table('settings')->getWhere(['id' => 1])->getRow();

        $exists = $this->db->table('email_todat')->getWhere(['ddate' => date('Y-m-d')])->getRow();
        if (!$exists && $settings->send_sales_email == 1) {

            helper('filesystem');
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Quantity');
            $sheet->setCellValue('A1', 'Sales report on ' . $adad);
            $sheet->mergeCells('A1:K1');

            $headers = ['Date', 'Bill Number', 'Total Items', 'Amount', 'Discount', 'Delivery', 'Total', 'Customer', 'Created By', 'Store', 'Status'];
            $sheet->fromArray([$headers], null, 'A4');

            $sales = $this->db->table('sales')->where('created_at', $adad)->get()->getResult();
            $rowIndex = 5;
            foreach ($sales as $sale) {
                // Do your processing, including getting register/store names and taxes
                // For brevity, just fill dummy data
                $sheet->fromArray([
                    $sale->created_at,
                    $sale->id,
                    $sale->totalitems,
                    $sale->subtotal,
                    0,
                    0,
                    $sale->total,
                    $sale->clientname,
                    $sale->created_by,
                    'Store Name',
                    'Paid'
                ], null, 'A' . $rowIndex++);
            }

            $filename = 'sales_report_' . $adad . '.xls';
            $writer = new Xls($spreadsheet);
            $filepath = WRITEPATH . 'reports/' . $filename;
            $writer->save($filepath);

            $this->db->table('email_todat')->insert([
                'ddate' => date('Y-m-d'),
                'ffile_name' => $filename
            ]);

            // Send Email (use CodeIgniter 4 email config)
            $email = \Config\Services::email();
            $email->setFrom($settings->frmemail, $settings->companyname);
            $email->setTo($settings->toemail);
            $email->setSubject('Sales Report');
            $email->setMessage("Attached is the sales report for $adad.");
            $email->attach($filepath);

            if ($email->send()) {
                echo 'Email sent successfully';
            } else {
                echo 'Failed to send email: ' . $email->printDebugger();
            }
        }
    }
}
