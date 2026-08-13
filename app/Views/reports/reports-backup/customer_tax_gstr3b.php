<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
  <thead>
    <tr class="">
      <th colspan="9" style="text-align:center;">
        <h3>GSTR-3B <br>[See rule 61(5)]</h3>
      </th>
    </tr>
    <tr>
      <th>GSTIN</th>
      <th><?= esc($setting['gstnoo']) ?></th>
      <th>Year</th>
      <th><?= esc($year) ?></th>
      <th>Sheet Status:</th>
      <th></th>
    </tr>
    <tr>
      <th>Legal name of the registered person</th>
      <th><?= esc($setting['companyname']) ?></th>
      <th>Month</th>
      <th><?= esc($client_id) ?></th>
      <th></th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="6" style="text-align:center;"><h4>3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h4></td>
    </tr>
    <tr>
      <td style="text-align:center;">Nature of Supplies</td>
      <td style="text-align:center;">Total Taxable value</td>
      <td style="text-align:center;">Integrated Tax</td>
      <td style="text-align:center;">Central Tax</td>
      <td style="text-align:center;">State/UT Tax</td>
      <td style="text-align:center;">Cess</td>
    </tr>
    <tr>
      <td style="text-align:center;">1</td>
      <td style="text-align:center;">2</td>
      <td style="text-align:center;">3</td>
      <td style="text-align:center;">4</td>
      <td style="text-align:center;">5</td>
      <td style="text-align:center;">6</td>
    </tr>
    <tr>
      <td style="text-align:center;">(a) Outward Taxable supplies (other than zero rated, nil rated and exempted)</td>
      <td style="text-align:center;"><?= number_format((float)$t_kmmm['ttoptal'], $decimals, '.', '') ?></td>
      <td style="text-align:center;"><?= number_format((float)$i_kmmm['itaxx'], $decimals, '.', '') ?></td>
      <td style="text-align:center;"><?= number_format((float)$c_kmmm['ctaxx'] / 2, $decimals, '.', '') ?></td>
      <td style="text-align:center;"><?= number_format((float)$c_kmmm['ctaxx'] / 2, $decimals, '.', '') ?></td>
      <td style="text-align:center;">0.00</td>
    </tr>
    <?php
    $labels = [
      '(b) Outward Taxable supplies (zero rated )',
      '(c) Other Outward Taxable supplies (Nil rated, exempted)',
      '(d) Inward supplies (liable to reverse charge)',
      '(e) Non-GST Outward supplies'
    ];
    foreach ($labels as $label): ?>
      <tr>
        <td style="text-align:center;"><?= $label ?></td>
        <td style="text-align:center;">0.00</td>
        <td style="text-align:center;">0.00</td>
        <td style="text-align:center;">0.00</td>
        <td style="text-align:center;">0.00</td>
        <td style="text-align:center;">0.00</td>
      </tr>
    <?php endforeach; ?>
    <tr>
      <td style="text-align:center;">Total</td>
      <td style="text-align:center;"><?= number_format((float)$t_kmmm['ttoptal'], $decimals, '.', '') ?></td>
      <td style="text-align:center;"><?= number_format((float)$i_kmmm['itaxx'], $decimals, '.', '') ?></td>
      <td style="text-align:center;"><?= number_format((float)$c_kmmm['ctaxx'] / 2, $decimals, '.', '') ?></td>
      <td style="text-align:center;"><?= number_format((float)$c_kmmm['ctaxx'] / 2, $decimals, '.', '') ?></td>
      <td style="text-align:center;">0.00</td>
    </tr>

    <!-- ITC, Exemptions, and Interest sections follow the same logic -->
    <!-- This section can continue identically using structured PHP and escaped values -->

  </tbody>
</table>
