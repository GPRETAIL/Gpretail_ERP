<?php foreach ($products as $product): ?>
<tr>
    <td><?= esc($product->code ?? '-') ?></td>
    <td><?= esc($product->name ?? '-') ?></td>
    <td><?= esc($product->category ?? '-') ?></td>
    <td><?= esc($product->price ?? '0.00') ?></td>
    <td><?= esc($product->statuss == 1 ? 'Inactive' : 'Active') ?></td>
    <td><?= esc($product->created_at ?? '-') ?></td>
</tr>
<?php endforeach; ?>
