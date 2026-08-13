<?php

$warehouses = $this->db->get('warehouses')->result();
$stores = $this->db->get('stores')->result_array();
$settings = $this->db->get('settings')->row_array();

// Fetch product IDs
$product_ids = array_column($products, 'id');

// Fetch purchase items in batch
$purchase_items = $this->db->select("product_id, purchase_id")
    ->where_in('product_id', $product_ids)
    ->get('purchase_items')
    ->result_array();

// Convert purchase items to associative array for fast lookup
$purchase_lookup = array_column($purchase_items, 'purchase_id', 'product_id');

// Fetch warehouse stock in batch
$stock_data = $this->db->select("store_id, product_id, SUM(quantity) as total_stock")
    ->where_in('product_id', $product_ids)
    ->group_by(['store_id', 'product_id'])
    ->get('stocks')
    ->result_array();

// Convert stock data to associative array for fast lookup
$stock_lookup = [];
foreach ($stock_data as $stock) {
    $stock_lookup[$stock['product_id']][$stock['store_id']] = $stock['total_stock'];
}

// Get user role and permissions
$user_role = $this->user->role;
$permissions = $this->db->get_where('permission_new', ['nname' => $user_role])->row_array();

foreach ($products as $product) {
    $purchase_id = $purchase_lookup[$product->id] ?? '';
    $supplier = $this->db->get_where('suppliers', ['id' => $product->supplier])->row();
    $brand = $this->db->get_where('brand', ['id' => $product->brandd])->row();
    
    // Calculate price with tax
    $post_price = floatval($product->price);
    $tax_percentage = intval($product->tax) + intval($product->sgst);
    $final_price = (!$product->taxmethod || $product->taxmethod == '0') ? $post_price : $post_price * (1 + $tax_percentage / 100);
    
    $total_sold = 0;
    $stock_summary = '';
    
    // Loop through stores to calculate stock
    foreach ($stores as $store) {
        $total_stock = $stock_lookup[$product->id][$store['id']] ?? 0;
        $total_sold += $total_stock * $final_price;
        $stock_summary .= $store['name'] . ' - ' . floatval($total_stock) . '<br>';
    }
    
    // Warehouse quantity processing
    $warehouse_qty = '';
    foreach ($warehouses as $warehouse) {
        $warehouse_stock = $this->db->get_where('stocks', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id
        ])->row();
        
        if ($warehouse_stock) {
            $warehouse_qty .= $warehouse->name . " - " . $warehouse_stock->quantity . '<br>';
        }
    }
?>

<tr>
    <td><?= $product->id; ?></td>
    <td><?= $product->code; ?></td>
    <td><?= $product->hsn; ?></td>
    <td><?= $purchase_id; ?></td>
    <td><?= $supplier->name ?? ''; ?></td>
    <td><?= ucfirst($product->name); ?></td>
    <td><?= $brand->name ?? ''; ?></td>

    <?php if ($settings['gst_tax'] == 1) { ?>
        <td><?= $product->tax ?></td>
    <?php } ?>

    <td><?= $product->cost; ?></td>
    <td><?= $final_price ?></td>
    <td><?= $product->rrate ?></td>
    <td><?= $product->descountperr ?></td>

    <td><?= $stock_summary ?></td>
    <td><?= $warehouse_qty ?></td>
    <td><?= $total_sold ?></td>

    <?php if ($settings['expi'] == 1) { ?>
        <td><?= $product->batch_1m ?></td>
        <td><?= $product->packed_1m ?></td>
        <td><?= $product->expire_1m ?></td>
    <?php } ?>

    <td>
        <a class="btn btn-<?= $product->statuss == 0 ? 'success' : 'danger' ?>"
            href="<?= base_url() . 'products/' . ($product->statuss == 0 ? 'deactive' : 'active') . '/' . $product->id ?>">
            <?= $product->statuss == 0 ? 'Active' : 'Deactive' ?>
        </a>
    </td>

    <td>
        <?php if ($permissions['prd'] == 1) { ?>
            <a class="btn btn-default" href="<?= base_url() . 'products/delete/' . $product->id ?>">
                <i class="fa fa-times"></i>
            </a>
        <?php } ?>

        <a class="btn btn-default" href="javascript:void(0)" onclick="Viewproduct(<?= $product->id ?>)">
            <i class="fa fa-file-text"></i>
        </a>

        <?php if ($permissions['pre'] == 1) { ?>
            <a class="btn btn-default" href="<?= base_url() . 'products/edit/' . $product->id ?>" title="Edit">
                <i class="fa fa-pencil"></i>
            </a>
        <?php } ?>

        <?php if ($product->photo) { ?>
            <a class="btn <?= $product->color ?> white open-modalimage"
                data-id="<?= $product->photo ?>" data-toggle="modal" data-target="#ImageModal">
                <i class="fa fa-picture-o" title="View Image"></i>
            </a>
        <?php } ?>

        <a class="btn btn-default" href="javascript:void(0)" data-toggle="modal" data-target="#barcode" 
            onclick="productBcode = <?= $product->id ?>">
            <i class="fa fa-barcode" title="Print Barcodes"></i>
        </a>
    </td>
</tr>

<?php } ?>
