<div class="form-group col-md-6" id="clss2">
    <div style="border: 1px solid #c5bdbd;">
        <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #ea373a;color:#fff;margin-top: 0px;margin-bottom: 0px;">
            <i class="fa fa-bar-chart" style="font-size: 18px;color:#fff;"></i>
            <?= label('Purchase'); ?>
            <div style="float: right;display: inline-block;">
                <input type="hidden" name="hideeity2" id="hideeity2" value="<?= $user->d_p_sh ?>" />
                <input type="hidden" name="reload2" id="reload2" value="<?= $user->d_p_sh ?>" />
                <a href="javascript:void(0);" onclick="hideeit(2);"><i class="fa fa-chevron-down" style="font-size: 17px;color:#fff;"></i></a>
                <a href="javascript:void(0);" onclick="closseit(2);"><i class="fa fa-close" style="font-size: 17px;color:#fff;"></i></a>
            </div>
        </h4>

        <?php if ($user->d_p_sh == 0): ?>
            <div id="purchasereport" style="height:400px;padding:10px;background:#fff;" class="hidde2"></div>
            <script>
                google.charts.load('current', { packages: ['bar'] });
                google.charts.setOnLoadCallback(purchaseChart);

                function purchaseChart() {
                    var data = google.visualization.arrayToDataTable(<?= $kmkp ?? '[]' ?>);

                    var options = {
                        chart: {
                            title: 'Amount',
                            subtitle: '',
                        }
                    };

                    var chart = new google.charts.Bar(document.getElementById('purchasereport'));
                    chart.draw(data, google.charts.Bar.convertOptions(options));
                }
            </script>
        <?php endif; ?>
    </div>
</div>
