<?php if ($themeblock == 1): ?>
    <div class="btn-group">
        <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown">
            <i class="fa fa-cog fa-fw"></i>
        </a>
        <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
            <span class="fa fa-caret-down" title="Toggle dropdown menu"></span>
        </a>
        <ul class="dropdown-menu">
            <li><a href="javascript:void(0)" onclick="showInvoice44('<?= $invoice['id'] ?>')">
                    <i class="fa fa-sticky-note"></i> <?= label('invoice') ?> A4</a></li>
            <li><a href="javascript:void(0)" onclick="showTickett('<?= $invoice['id'] ?>')">
                    <i class="fa fa-ticket"></i> <?= label('Receipt') ?> 3.5</a></li>
            <?php if ($invoice['status'] != 3 && !$returnExists): ?>
                <li><a href="javascript:void(0)" onclick="delete_invoice('<?= $invoice['id'] ?>')">
                        <i class="fa fa-trash-o"></i> <?= label('Cancel') ?></a></li>
                <li><a href="javascript:void(0)" onclick="education_fields('<?= $invoice['id'] ?>')">
                        <i class="fa fa-pencil"></i> Return</a></li>
            <?php elseif ($invoice['status'] != 3): ?>
                <li><a href="javascript:void(0)" onclick="education_fields('<?= $invoice['id'] ?>')">
                        <i class="fa fa-pencil"></i> Return</a></li>
            <?php endif; ?>
        </ul>
    </div>
<?php else: ?>
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
            <li><a href="javascript:void(0)" onclick="showTicket2('<?= $invoice['id'] ?>')">
                    <i class="fa fa-ticket"></i> <?= label('Receipt') ?> 2.9</a></li>
            <li><a href="javascript:void(0)" onclick="showTicket('<?= $invoice['id'] ?>')">
                    <i class="fa fa-ticket"></i> <?= label('Receipt') ?> 3.5</a></li>
            <li><a href="javascript:void(0)" onclick="showTicket4('<?= $invoice['id'] ?>')">
                    <i class="fa fa-ticket"></i> <?= label('Receipt') ?> 4</a></li>
            <li><a href="javascript:void(0)" onclick="payaments('<?= $invoice['id'] ?>')">
                    <i class="fa fa-credit-card-alt"></i> <?= label('Payements') ?></a></li>
            <?php if ($permission['sse'] == "1"): ?>
                <li><a href="javascript:void(0)" onclick="Edit_Sale('<?= $invoice['id'] ?>')">
                        <i class="fa fa-pencil"></i> Pay Bill</a></li>
            <?php endif; ?>
            <?php if ($invoice['status'] != 3 && !$returnExists && $permission['ssd'] == "1"): ?>
                <li style=""><a href="javascript:void(0)" onclick="delete_invoice('<?= $invoice['id'] ?>')">
                        <i class="fa fa-trash-o"></i> <?= label('Cancel') ?></a></li>
                <li><a href="javascript:void(0)" onclick="education_fields('<?= $invoice['id'] ?>')">
                        <i class="fa fa-pencil"></i> Return</a></li>
            <?php elseif ($invoice['status'] != 3 && $permission['ssd'] == "1"): ?>
                <li><a href="javascript:void(0)" onclick="education_fields('<?= $invoice['id'] ?>')">
                        <i class="fa fa-pencil"></i> Return</a></li>
            <?php endif; ?>
        </ul>
    </div>
<?php endif; ?>