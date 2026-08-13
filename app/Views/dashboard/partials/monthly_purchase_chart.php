<div class="form-group col-md-6" id="clss4">
    <div style="border: 1px solid #c5bdbd;">
        <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #ea373a;margin-top: 0px;color:#fff;margin-bottom: 0px;">
            <i class="fa fa-bar-chart" style="font-size: 18px;color:#fff;"></i>
            <?= label('Monthly') . ' ' . label('Purchase'); ?>
            <div style="float: right;display: inline-block;">
                <input type="hidden" name="hideeity4" id="hideeity4" value="<?= $user->m_p_sh ?>" />
                <input type="hidden" name="reload4" id="reload4" value="<?= $user->m_p_sh ?>" />
                <a href="javascript:void(0);" onclick="hideeit(4);"><i class="fa fa-chevron-down" style="font-size: 17px;color:#fff;"></i></a>
                <a href="javascript:void(0);" onclick="closseit(4);"><i class="fa fa-close" style="font-size: 17px;color:#fff;"></i></a>
            </div>
        </h4>

        <?php if ($user->m_p_sh == 0): ?>
            <div id="pur_monthreport" style="height:400px;padding:10px;background:#fff;" class="hidde4"></div>
            <script>
                google.charts.load('current', { packages: ['bar'] });
                google.charts.setOnLoadCallback(pur_monChart);

                function pur_monChart() {
                    var data = google.visualization.arrayToDataTable(<?= $kmkp_pm ?? '[]' ?>);

                    var options = {
                        chart: {
                            title: 'Amount',
                            subtitle: '',
                        }
                    };

                    var chart = new google.charts.Bar(document.getElementById('pur_monthreport'));
                    chart.draw(data, google.charts.Bar.convertOptions(options));
                }
            </script>
        <?php endif; ?>
    </div>
</div>
