<?php
$count = $_POST['countid'];
$lxzmm = $db->query("select * from settings where id=1 ")->getRowArray();
?>

<div id="add<?php echo $count; ?>" class="col-xs-12">

    <div class="col-sm-2 ">
        <div class="form-group">
            <select onchange="getState(this.value,this.id)" class="js-select-options form-control" name="customerSelect[]" id="customerSelect_<?php echo $count; ?>">
                <option value="0">Select</option>
                <?php
                $kmk = $db->query("select * from brand order by name asc ")->getResult();
                foreach ($kmk as $kmkf) { ?>
                    <option value="<?= $kmkf->id; ?>"><?= $kmkf->name; ?></option>
                <?php } ?>
            </select>
        </div>
    </div>

    <div class="col-sm-2 ">
        <div class="form-group">
            <select class="js-select-options form-control" id="statediv_<?php echo $count; ?>" name="statediv[]" onchange="getdetals(this.value,this.id)">
                <option value="0">Select Brand </option>
                <?php
                $kmkp = $db->query("select id,name from products order by name asc ")->getResult();
                foreach ($kmkp as $kmkpf) { ?>
                    <option value="<?= $kmkpf->id; ?>"><?= $kmkpf->name; ?></option>
                <?php } ?>
            </select>
        </div>
    </div>

    <div style="width:120px;" class="col-sm-1 ">
        <div class="form-group">
            <input readonly="readonly" type="text" class="form-control" id="cosst_<?php echo $count; ?>" name="cosst[]" value="" placeholder="">
        </div>
    </div>

    <div class="col-sm-1 ">
        <div class="form-group">
            <select class=" form-control" onchange="callcc_sigh(this.value,this.id);" id="signn_<?php echo $count; ?>" style="padding: 0px 0px;" name="signn[]">
                <option value="+">Add </option>
                <option value="-">Subtract </option>



            </select>
        </div>
    </div>


    <div class="col-sm-2 ">
        <div class="form-group">
            <input type="text" onkeyup="return callcc(this.value,this.id);" required="required" class="form-control" id="qty_<?php echo $count; ?>" name="qty[]" value="" placeholder="Quantity">
        </div>
    </div>




    <div style="width:140px;" class="col-sm-1 ">
        <div class="form-group">

            <select class="js-select-options form-control" name="reson[]" id="reson_1">
                <option value="1">Damaged</option>
                <option value="2">Expired</option>
                <option value="3">Other Reason</option>

            </select>

        </div>
    </div>





    <div class="col-sm-2 ">
        <div class="input-group">
            <input value="0" readonly="readonly" type="text" class="form-control" id="subtt_<?php echo $count; ?>" name="subtt[]" value="" placeholder="Cost">
            <div class="input-group-btn">

                <button class="btn btn-danger" type="button" onclick="remove_education_fields(<?php echo $count; ?>);">
                    <span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button>
            </div>
        </div>
    </div>

</div>



<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
<style>
    .delRowBtn {
        position: relative;
        top: 0px;
    }
</style>
<script>
    $(function() {
        $("#product").click(function(event) {
            //alert('dfgdfgdf');
            var aaa = $("#prob_cat_name<?php echo $count; ?>").val();


            if ($("#prob_cat_name<?php echo $count; ?>").val() === "") {
                $("#prob_cat_name_error<?php echo $count; ?>").text("Field cannot be empty").show();
                event.preventDefault();
            }
            if ($("#model<?php echo $count; ?>").val() === "") {
                $("#model_error<?php echo $count; ?>").text("Field cannot be empty").show();
                event.preventDefault();
            }

            if ($("#prob_code<?php echo $count; ?>").val() === "") {
                $("#prob_code_error<?php echo $count; ?>").text("Field cannot be empty").show();
                event.preventDefault();
            }


        });
    });
</script>
<script>
    $(function() {

        $("#prob_cat_name<?php echo $count; ?>").change(function() {
            if ($(this).val() == "") {
                $("#prob_cat_name_error<?php echo $count; ?>").show();
            } else {
                $("#prob_cat_name_error<?php echo $count; ?>").hide();
            }
        });

        $("#model<?php echo $count; ?>").change(function() {
            var aaa = $(this).val();
            if ($(this).val() == "") {
                $("#model_error<?php echo $count; ?>").show();
            } else {
                $("#model_error<?php echo $count; ?>").hide();
            }
        });

        $("#prob_code<?php echo $count; ?>").keyup(function() {
            if ($(this).val() == "") {
                $("#prob_code_error<?php echo $count; ?>").show();
            } else {
                $("#prob_code_error<?php echo $count; ?>").hide();
            }
        });


    });
</script>

<script>
    $(document).ready(function() {
        $('#prob_code<?php echo $count; ?>').change(function() {
            var prob_code = $(this).val();
            var datastring = 'code=' + prob_code;
            $.ajax({
                type: "POST",
                url: "<?php echo base_url(); ?>problemcategory/checkCode",
                data: datastring,
                cache: false,
                success: function(data) {
                    //alert(data);
                    if (data > 0) {
                        $('#name_error<?php echo $count; ?>').html('Problem Code already Exist!').show();
                        $('#prob_code<?php echo $count; ?>').val('');
                    } else if (data == 0) {
                        $('#name_error<?php echo $count; ?>').hide();

                    }


                }
            });
        });
    });
</script>
<?php
exit; ?>