<?php
$action = '<div class="btn-group">
    <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> ' . label("Action") . '</a>
    <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down"></span></a>
    <ul class="dropdown-menu">
        <li><a href="javascript:void(0)" onclick="showTicket(\'' . $invoice['id'] . '\')"><i class="fa fa-ticket fa-fw"></i>' . label("View") . '</a></li>
        <li><a href="javascript:void(0)" onclick="payaments(\'' . $invoice['id'] . '\')"><i class="fa fa-ticket fa-fw"></i>' . label("Payements") . '</a></li>';

if ($permissions['pue'] == 1) {
    $action .= '<li><a href="' . base_url('purchase/edit/' . $invoice['id']) . '"><i class="fa fa-pencil"></i>' . label("Edit") . '</a></li>';
}
if ($permissions['pud'] == 1) {
    $action .= '<li><a href="javascript:void(0)" onclick="delete_invoice(\'' . $invoice['id'] . '\')"><i class="fa fa-trash"></i>' . label("Delete") . '</a></li>';
}
$action .= '</ul></div>';
echo $action;
