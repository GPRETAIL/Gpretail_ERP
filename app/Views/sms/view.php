<script type="text/javascript" src="https://www.google.com/jsapi"></script>
<script type="text/javascript">
    google.load("elements", "1", {
        packages: "transliteration"
    });

    function onLoad() {
        var options = {
            sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
            destinationLanguage: ['<?= label("languagek"); ?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
            shortcutKey: 'ctrl+g',
            transliterationEnabled: true
        };
        var control = new google.elements.transliteration.TransliterationControl(options);
        var ids = ["CustomerName", "customeraddress"];
        control.makeTransliteratable(ids);
        control.showControl('translControl');
    }
    google.setOnLoadCallback(onLoad);
</script>

<?php


if (@$_POST && count(@$_POST['checkbox_m']) > 0) {
    $comma_separated = implode(",", $_POST['checkbox_m']);

    $kmsen = mysql_fetch_array(mysql_query("select * from smstabble where si=1 "));
    $mobileNumber = $comma_separated;
    $message = $_POST['message'];

    $senderId  = $kmsen['sendid'];
    $routeId   = $kmsen['routid'];
    $serverUrl = $kmsen['serurl'];
    $authKey   = $kmsen['authkey'];





    $url = "http://" . $serverUrl . "/api/sendhttp.php?authkey=" . $authKey . "&mobiles=$mobileNumber&message=" . $message . "&sender=$senderId&route=$routeId";
    $ch = curl_init();
    curl_setopt_array($ch, array(
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,


        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_SSL_VERIFYPEER => 0
    ));
    curl_exec($ch);
}

?>


<div class="container">
    <?php

    $rolr = $user->role;
    $kkar = mysql_fetch_array(mysql_query("select * from permission_new where nname='" . $rolr . "'  "));
    ?>
    <h3><?= label("SMS"); ?>

    </h3>
    <hr>

    <form action="" method="post">

        <div class="row" style="margin-top:20px;">

            <div class="col-xs-12">


                <div class="col-xs-8">
                    <div class="col-xs-12">
                        <input id="myInput" onkeyup="myFunction()" class="klkl" placeholder="Search Name/Phone" type="text">
                        <br>
                        <br>
                        <style type="text/css">
                            .klkl {
                                /* display: block;*/
                                /*width: 100%;*/
                                height: 34px;
                                padding: 6px 12px;
                                font-size: 14px;
                                line-height: 1.42857143;
                                color: #555;
                                background-color: #fff;
                                background-image: none;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075);
                                box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075);
                                -webkit-transition: border-color ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;
                                -o-transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;
                                transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;
                            }
                        </style>
                        <script>
                            function myFunction() {
                                var input, filter, ul, li, a, i;
                                input = document.getElementById("myInput");
                                filter = input.value.toUpperCase();
                                ul = document.getElementById("post-data");
                                li = ul.getElementsByTagName("tr");
                                for (i = 0; i < li.length; i++) {

                                    a = li[i].getElementsByTagName("a")[0];
                                    aa = li[i].getElementsByTagName("a")[1];

                                    if (a.innerHTML.toUpperCase().indexOf(filter) > -1 || aa.innerHTML.toUpperCase().indexOf(filter) > -1) {
                                        li[i].style.display = "";
                                    } else {
                                        li[i].style.display = "none";
                                    }
                                }
                            }
                        </script>

                        <table class="table table-striped table-bordered" cellspacing="0" width="50%">
                            <thead>
                                <th><input type="checkbox" style="display:block;margin-top:10px;" id="ckbCheckAll" /></th>
                                <th><b><?= label("CustomerName"); ?></b></th>
                                <th><b><?= label("CustomerPhone"); ?></b></th>
                            </thead>


                            <tbody id="post-data" style="height: 300px;overflow: auto;">
                                <?php foreach ($customers as $customer): ?>
                                    <tr>

                                        <td><input style="display:block;margin-top:10px;" type="checkbox" name="checkbox_m[]" class="checkBoxClass" value="<?php echo $customer->phone; ?>" id="checkbox<?php echo isset($row->userid) ? $row->userid : 0; ?>" /></td>

                                        <td><a href="javascript:void(0);"><?= $customer->name; ?></a></td>
                                        <td><a href="javascript:void(0);"><?= $customer->phone; ?></a></td>
                                    </tr>
                                <?php endforeach; ?>


                            </tbody>
                        </table>

                    </div>
                </div>


                <div class="col-xs-4">
                    <label for="CategoryName">Text</label>
                    <textarea class="form-control" rows="5" name="message" id="message" required=""></textarea>
                </div>


                <div class="col-md-4" style="text-align: center;"><br>
                    <br>
                    <br>
                    <button type="submit" class="btn   btn-lg" style="background-color: #34495E;color: #fff;">Send</button>
                    <div>

                    </div>
                </div>

            </div>
    </form>
</div>
<!-- Button trigger modal -->

</div>
<!-- /.container -->

<!-- Modal -->
<div class="modal fade" id="AddCustomer" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel"><?= label("AddCustomer"); ?></h4>
            </div>
            <?php echo form_open_multipart('customers/add'); ?>
            <div class="modal-body">




                <div class="form-group">
                    <label for="CustomerName"><?= label("CustomerName"); ?></label>
                    <input type="text" name="name" maxlength="50" Required class="form-control" id="CustomerName" placeholder="<?= label("CustomerName"); ?>">
                </div>

                <div class="form-group">
                    <label for="CustomerPhone"><?= label("CustomerPhone"); ?></label>
                    <input type="text" name="phone" maxlength="30" class="form-control" id="CustomerPhone" placeholder="<?= label("CustomerPhone"); ?>">
                </div>
                <div class="form-group">
                    <label for="CustomerEmail"><?= label("CustomerEmail"); ?></label>
                    <input type="email" maxlength="50" name="email" class="form-control" id="CustomerEmail" placeholder="<?= label("CustomerEmail"); ?>">
                </div>

                <div class="form-group">

                    <div class="col-xs-6">
                        <label for="CustomerEmail"><?= label("State"); ?></label>

                        <select class="form-control" name="custstate" id="custstate">
                            <option value=""> <?= label("Select"); ?> <?= label("State"); ?></option>
                            <?php
                            $stty = $db->query("select * from state where CountryID=1 order by StateName asc ")->getResult();
                            foreach ($stty as $sttyf) {
                                // dd($sttyf);
                            ?>
                                <option value="<?php echo $sttyf->StateID; ?>"><?php echo $sttyf->StateName; ?></option>
                            <?php
                            }
                            ?>

                        </select>

                    </div>
                    <div class="col-xs-6">
                        <label for="CustomerDiscount"><?= label("CustomerDiscount"); ?> (in %)</label>
                        <input type="text" maxlength="2" name="discount" class="form-control" id="CustomerDiscount" placeholder="<?= label("CustomerDiscount"); ?>">
                    </div>

                </div>


                <div class="form-group">
                    <div class="col-xs-12">
                        <label for="CustomerDiscount"><?= label("Adresse"); ?></label>
                        <textarea name="customeraddress" class="form-control" id="customeraddress"></textarea>

                    </div>
                </div>
                <style type="text/css">
                    .modal-footer {
                        border-top: 0px solid #e5e5e5;
                    }
                </style>
                <div class="modal-footer">

                    <button type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>

                    <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

                </div>
                <?php echo form_close(); ?>
            </div>
        </div>
    </div>

    <script>
        $("#ckbCheckAll").click(function() {
            $(".checkBoxClass").prop('checked', $(this).prop('checked'));
        });
    </script>