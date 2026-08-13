<div class="btn-group">
    <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown">
        <i class="fa fa-cog fa-fw"></i> <?= label("Action") ?>
    </a>
    <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
        <span class="fa fa-caret-down" title="Toggle dropdown menu"></span>
    </a>
    <ul class="dropdown-menu">
        <li>
            <a href="javascript:void(0)" onclick="showTicket('<?= $id ?>')">
                <i class="fa fa-ticket fa-fw" aria-hidden="true"></i> <?= label("View") ?>
            </a>
        </li>
    </ul>
</div>