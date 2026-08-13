<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr><th colspan="6" class="text-center"><h3>GSTR-3B<br>[See rule 61(5)]</h3></th></tr>
        <tr>
            <th>GSTIN</th><th><?= esc($gstno) ?></th>
            <th>Year</th><th><?= esc($year) ?></th>
            <th>Sheet Status:</th><th></th>
        </tr>
        <tr>
            <th>Legal name of the registered person</th><th><?= esc($company) ?></th>
            <th>Month</th><th><?= esc($clientId) ?></th><th></th><th></th>
        </tr>
    </thead>
    <tbody>
        <tr><td colspan="6" class="text-center"><h4>3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h4></td></tr>
        <tr>
            <td>Nature of Supplies</td><td>Total Taxable value</td><td>Integrated Tax</td>
            <td>Central Tax</td><td>State/UT Tax</td><td>Cess</td>
        </tr>
        <tr>
            <td>(a) Outward Taxable supplies (other than zero rated, nil rated and exempted)</td>
            <td><?= number_format($taxSalesTotal, $decimals) ?></td>
            <td><?= number_format($integratedTax, $decimals) ?></td>
            <td><?= number_format($centralTax / 2, $decimals) ?></td>
            <td><?= number_format($centralTax / 2, $decimals) ?></td>
            <td>0.00</td>
        </tr>
        <tr><td>(b) Outward Taxable supplies (zero rated)</td><td colspan="5" class="text-center">0.00</td></tr>
        <tr><td>(c) Other Outward supplies (Nil rated, exempted)</td><td colspan="5" class="text-center">0.00</td></tr>
        <tr><td>(d) Inward supplies (liable to reverse charge)</td><td colspan="5" class="text-center">0.00</td></tr>
        <tr><td>(e) Non-GST Outward supplies</td><td colspan="5" class="text-center">0.00</td></tr>
        <tr>
            <td>Total</td>
            <td><?= number_format($taxSalesTotal, $decimals) ?></td>
            <td><?= number_format($integratedTax, $decimals) ?></td>
            <td><?= number_format($centralTax / 2, $decimals) ?></td>
            <td><?= number_format($centralTax / 2, $decimals) ?></td>
            <td>0.00</td>
        </tr>

        <tr><td colspan="6" class="text-center"><h4>4. Eligible ITC</h4></td></tr>
        <tr><td>Details</td><td>Integrated Tax</td><td>Central Tax</td><td>State/UT Tax</td><td>Cess</td></tr>
        <tr><td>(5) All other ITC</td><td>0.00</td><td><?= number_format($cgst, $decimals) ?></td><td><?= number_format($sgst, $decimals) ?></td><td>0.00</td></tr>
        <tr><td>(C) Net ITC Available (A)-(B)</td><td>0.00</td><td><?= number_format($cgst, $decimals) ?></td><td><?= number_format($sgst, $decimals) ?></td><td>0.00</td></tr>

        <tr><td colspan="5" class="text-center"><h4>5. Values of exempt, Nil-rated and non-GST inward supplies</h4></td></tr>
        <tr><td>From a supplier under composition scheme, Exempt and Nil rated</td><td colspan="2">0.00</td><td colspan="2">0.00</td></tr>
        <tr><td>Non GST supply</td><td colspan="2">0.00</td><td colspan="2">0.00</td></tr>
        <tr><td>Total</td><td colspan="2">0.00</td><td colspan="2">0.00</td></tr>

        <tr><td colspan="5" class="text-center"><h4>5.1 Interest & late fee payable</h4></td></tr>
        <tr><td>Interest</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td></tr>
    </tbody>
</table>
