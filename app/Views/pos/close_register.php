<form id="closereg" name="closereg" action="<?= base_url('pos/SubmitRegister') ?>" method="POST">
    <div class="row">
        <div class="col-md-4">
            <footer><b><?= label("Openedby") ?></b></footer>
            <p><?= $createdBy ?></p>
        </div>
        <div class="col-md-4">
            <footer><b><?= label("CashinHand") ?></b></footer>
            <p><?= number_format((float) $cashInHand, $decimals, '.', '') . ' ' . $currency ?></p>
        </div>
        <div class="col-md-4">
            <footer><b><?= label("Openingtime") ?></b></footer>
            <p><?= date("d-m-Y H:i:s") ?></p>
        </div>
    </div>

    <div class="row" style="height: 400px; overflow: scroll;">
        <div class="col-md-8">
            <h1 class="text-center"><b><?= label("PaymentsSummary") ?></b></h1>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th><?= label("PayementType") ?></th>
                        <th class="text-right"><?= label("EXPECTED") ?> (<?= $currency ?>)</th>
                        <th class="text-right"><?= label("COUNTED") ?> (<?= $currency ?>)</th>
                        <th class="text-right"><?= label("DIFFERENCES") ?> (<?= $currency ?>)</th>
                    </tr>
                </thead>
                <tbody>
                    <?= $paymentRows ?>
                </tbody>
                <tfoot>
                    <tr class="warning">
                        <td><?= label("Total") ?></td>
                        <td class="text-right">
                            <input type="text" class="total-input text-right" readonly value="<?= $totalFormatted ?>" id="total_cl" name="total_cl">
                        </td>
                        <td class="text-right">
                            <input type="text" class="total-input text-right" readonly value="<?= $countedFormatted ?>" id="countedtotal" name="countedtotal">
                        </td>
                        <td class="text-right">
                            <input type="text" class="total-input text-right" readonly value="<?= $differenceFormatted ?>" id="difftotal" name="difftotal">
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="col-md-4">
            <h1 class="text-center"><b><?= label("Cash") ?></b></h1>
            <table class="table table-striped">
                <?= $cashRows ?>
                <tr>
                    <td></td>
                    <td>Total</td>
                    <td class="text-right">
                        <input type="text" class="total-input text-right" readonly value="0.00" id="subtott" name="subtott">
                    </td>
                </tr>
            </table>

            <div>
                <h2><?= label("note") ?></h2>
                <textarea id="RegisterNote" class="form-control" rows="10"></textarea>
            </div>
        </div>
    </div>

    <input type="submit" class="form-control btn btn-green" name="Submit" value="Save">
    <div class="form-group">&nbsp;</div>
</form>