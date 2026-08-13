<div class="btn-group">
    <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown">
        <i class="fa fa-cog fa-fw"></i>
    </a>
    <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
        <span class="fa fa-caret-down" title="Toggle dropdown menu"></span>
    </a>
    <ul class="dropdown-menu">
        <li><a href="javascript:void(0)" onclick="showInvoice4('<?= $invoice['id'] ?>')">
                <i class="fa fa-sticky-note"></i> <?= label('invoice') ?> A4</a></li>
        <li><a href="javascript:void(0)" onclick="showInvoice('<?= $invoice['id'] ?>')">
                <i class="fa fa-sticky-note"></i> <?= label('invoice') ?> A5</a></li>
        <?php if ($permission['ssd'] == "1"): ?>
            <li style="margin-top: -20px;"><a href="javascript:void(0)" onclick="delete_invoice('<?= $invoice['id'] ?>')">
                    <i class="fa fa-trash-o"></i> <?= label('Delete') ?></a></li>
        <?php endif; ?>
    </ul>
</div>