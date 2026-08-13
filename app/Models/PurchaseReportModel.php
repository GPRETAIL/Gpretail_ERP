<?php

namespace App\Models;

use CodeIgniter\Model;
use CodeIgniter\Database\BaseConnection;

class PurchaseReportModel extends Model
{
    protected $DBGroup = 'default';
    protected $table   = 'purchases';

    public function fetchRows(array $opts): array
    {
        /** @var BaseConnection $db */
        $db = db_connect();

        $storeId      = (int) ($opts['store_id'] ?? 0);
        $dateFrom     = (string) ($opts['date_from'] ?? '');
        $dateTo       = (string) ($opts['date_to'] ?? '');
        $purchaseType = (string) ($opts['purchase_type'] ?? '2'); // 2 = ALL
        $search       = trim((string) ($opts['search'] ?? ''));
        $orderByKey   = (string) ($opts['order_by'] ?? 'purdat');
        $orderDir     = strtolower((string) ($opts['order_dir'] ?? 'asc')) === 'desc' ? 'desc' : 'asc';

        $orderMap = [
            'purdat'   => 'p.purdat',
            'supplier' => 's.name',
            'id'       => 'p.id',
            'betot'    => 'p.betot',
            'tax'      => 'p.cgst',
            'discamt'  => 'p.discamt',
            'total'    => 'p.total',
            'paiddd'   => 'p.paiddd',
            'balance'  => '(p.total - p.paiddd)',
        ];
        $orderExpr = $orderMap[$orderByKey] ?? 'p.purdat';

        $b = $db->table('purchases p')
            ->select("
                p.id, p.purdat, p.invno,
                p.betot, p.cgst, p.sgst, p.discamt, p.total, p.paiddd,
                s.name AS supplier_name
            ")
            ->join('suppliers s', 's.id = p.supplier_id', 'left')
            ->where('p.store_id', $storeId)
            ->where('p.purdat >=', $dateFrom)
            ->where('p.purdat <=', $dateTo);

        if ($purchaseType !== '2') {
            $b->where('p.ppurchase_type', $purchaseType);
        }

        if ($search !== '') {
            $b->groupStart()
                ->like('s.name', $search)
                ->orLike('p.id', $search)
                ->orLike('p.invno', $search)
                ->groupEnd();
        }

        $b->orderBy($orderExpr, $orderDir);

        return $b->get()->getResultArray();
    }

    public function fetchTotals(array $opts): array
    {
        /** @var BaseConnection $db */
        $db = db_connect();

        $storeId      = (int) ($opts['store_id'] ?? 0);
        $dateFrom     = (string) ($opts['date_from'] ?? '');
        $dateTo       = (string) ($opts['date_to'] ?? '');
        $purchaseType = (string) ($opts['purchase_type'] ?? '2');
        $search       = trim((string) ($opts['search'] ?? ''));

        $tb = $db->table('purchases p')
            ->select("
                SUM(p.betot) AS sum_betot,
                SUM(p.cgst) AS sum_cgst,
                SUM(p.sgst) AS sum_sgst,
                SUM(p.discamt) AS sum_disc,
                SUM(p.total) AS sum_total,
                SUM(p.paiddd) AS sum_paid
            ")
            ->join('suppliers s', 's.id = p.supplier_id', 'left')
            ->where('p.store_id', $storeId)
            ->where('p.purdat >=', $dateFrom)
            ->where('p.purdat <=', $dateTo);

        if ($purchaseType !== '2') {
            $tb->where('p.ppurchase_type', $purchaseType);
        }

        if ($search !== '') {
            $tb->groupStart()
                ->like('s.name', $search)
                ->orLike('p.id', $search)
                ->orLike('p.invno', $search)
                ->groupEnd();
        }

        $row = (array) $tb->get()->getRow();

        $sum_betot = (float)($row['sum_betot'] ?? 0);
        $sum_cgst  = (float)($row['sum_cgst'] ?? 0);
        $sum_disc  = (float)($row['sum_disc'] ?? 0);
        $sum_total = (float)($row['sum_total'] ?? 0);
        $sum_paid  = (float)($row['sum_paid'] ?? 0);

        $taxBoth = $sum_cgst * 2;
        $bal     = $sum_total - $sum_paid;

        return [
            'billamt' => $sum_betot,
            'tax'     => $taxBoth,
            'disc'    => $sum_disc,
            'amount'  => $sum_total,
            'paid'    => $sum_paid,
            'bal'     => $bal,
        ];
    }
}
