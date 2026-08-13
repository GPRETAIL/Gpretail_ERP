<div class="form-group col-md-6" id="clss3">
    <div style="border: 1px solid #c5bdbd;">
        <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #358ee0;margin-top: 0px;color:#fff;margin-bottom: 0px;">
            <i class="fa fa-bar-chart" style="font-size: 18px;color:#fff;"></i>
            <?= label('Monthly') . ' ' . label('Sales'); ?>
            <div style="float: right;display: inline-block;">
                <input type="hidden" name="hideeity3" id="hideeity3" value="<?= $user->m_s_sh ?>" />
                <input type="hidden" name="reload3" id="reload3" value="<?= $user->m_s_sh ?>" />
                <a href="javascript:void(0);" onclick="hideeit(3);"><i class="fa fa-chevron-down" style="font-size: 17px;color:#fff;"></i></a>
                <a href="javascript:void(0);" onclick="closseit(3);"><i class="fa fa-close" style="font-size: 17px;color:#fff;"></i></a>
            </div>
        </h4>

        <?php if ($user->m_s_sh == 0): ?>
            <div id="sal_monthreport" style="height:400px;padding:10px;background:#fff;" class="hidde3"></div>
            <script>
                google.charts.load('current', { packages: ['bar'] });
                google.charts.setOnLoadCallback(sal_monChart);

                function sal_monChart() {
                    var data = google.visualization.arrayToDataTable(<?= $kmkp_sm ?? '[]' ?>);

                    var options = {
                        chart: {
                            title: 'Amount',
                            subtitle: '',
                        }
                    };

                    var chart = new google.charts.Bar(document.getElementById('sal_monthreport'));
                    chart.draw(data, google.charts.Bar.convertOptions(options));
                }
            </script>
        <?php endif; ?>
    </div>
</div>
