<!-- app/Views/log/purchasetallylog.php -->

<div class="container">
   <h3>Purchase Log - Tally</h3>
   <hr>

   <div class="row" style="margin-top:20px;">
      <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead>
              <tr>
                  <th style="width:60px;">S.No</th>
                  <th>From</th>
                  <th>Till</th>
                  <th>Company</th>
                  <th>IP</th>
                  <th>Dated</th>
                  <th>Action</th>
              </tr>
          </thead>
          <tbody>
             <?php foreach ($log as $category): ?>
                <tr>
                   <td><?= esc($category->sii); ?></td>
                   <td><?= date("d-m-Y", strtotime($category->fromdatt)); ?></td>
                   <td><?= date("d-m-Y", strtotime($category->enddatt)); ?></td>
                   <td><?= esc($category->companyname); ?></td>
                   <td><?= esc($category->ipaddre); ?></td>
                   <td>
                      <?= $category->dated !== '0000-00-00' ? date("d-m-Y", strtotime($category->dated)) : ''; ?>
                   </td>
                   <td>
                      <div class="btn-group">
                         <a class="btn btn-default" href="<?= base_url('reports/purdownloadxl/' . esc($category->sii)); ?>">Excel</a>
                         <a class="btn btn-default" href="<?= base_url('log/purdownloadxml/' . esc($category->sii)); ?>">XML</a>
                      </div>
                   </td>
                </tr>
             <?php endforeach; ?>
          </tbody>
      </table>
   </div>
</div>
