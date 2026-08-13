<div class="form-group col-md-6" id="clss1">
    <div style="border: 1px solid #c5bdbd;">
        <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #358ee0;color:#fff;margin-top: 0px;margin-bottom: 0px;">
            <i class="fa fa-bar-chart" style="font-size: 18px;color:#fff;"></i>
            <?= label('Sales'); ?>
            <div style="float: right;display: inline-block;">
                <input type="hidden" name="hideeity1" id="hideeity1" value="<?= $user->d_s_sh ?>" />
                <input type="hidden" name="reload1" id="reload1" value="<?= $user->d_s_sh ?>" />
                <a href="javascript:void(0);" onclick="hideeit(1);"><i class="fa fa-chevron-down" style="font-size: 17px;color:#fff;"></i></a>
                <a href="javascript:void(0);" onclick="closseit(1);"><i class="fa fa-close" style="font-size: 17px;color:#fff;"></i></a>
            </div>
        </h4>

        <?php if ($user->d_s_sh == 0): ?>
            <div id="salesreport" style="height:400px;padding:10px;background:#fff;" class="hidde1"></div>
            <script>
                google.charts.load('current', { packages: ['bar'] });
                google.charts.setOnLoadCallback(salesChart);

                function salesChart() {
                    var data = google.visualization.arrayToDataTable(<?= $kmk ?? '[]' ?>);

                    var options = {
                        chart: {
                            title: 'Amount',
                            subtitle: '',
                        }
                    };

                    var chart = new google.charts.Bar(document.getElementById('salesreport'));
                    chart.draw(data, google.charts.Bar.convertOptions(options));
                }
            </script>
        <?php endif; ?>
    </div>
</div>
