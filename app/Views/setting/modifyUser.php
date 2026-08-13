<div class="container container-small">
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
            var ids = ["username", "firstname", "lastname", "useraddr", "password", "PasswordRepeat"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }
        google.setOnLoadCallback(onLoad);
    </script>
    <h3> <?= label("Edit"); ?>


        </button>
    </h3>
    <hr>

    <div class="row" style="margin-top:20px;">
        <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> <?= label("Back"); ?></a>
        <?php echo form_open_multipart('settings/editUser/' . $user->id); ?>

        <div class="form-group">
            <label for="username"><?= label("Username"); ?></label>
            <input type="text" name="username" value="<?= $user->username ?>" class="form-control" id="username" placeholder="<?= label("Username"); ?>">
        </div>
        <div class="form-group">
            <label for="firstname"><?= label("firstname"); ?></label>
            <input type="text" name="firstname" value="<?= $user->firstname ?>" class="form-control" id="firstname" placeholder="<?= label("firstname"); ?>">
        </div>
        <div class="form-group">
            <label for="lastname"><?= label("lastname"); ?></label>
            <input type="text" name="lastname" value="<?= $user->lastname ?>" class="form-control" id="lastname" placeholder="<?= label("lastname"); ?>">
        </div>



        <div class="form-group">
            <label for="role"><?= label("Role"); ?></label><br>

            <select name="role" id="role" class="form-control">

                <?php
                $db = \Config\Database::connect();

                // $poee = mysqli_query("select nname from permission_new order by nname asc ")->getResult();
                $poee = $db->table('permission_new')->select('nname')->orderBy('nname', 'asc')->get()->getResult();


                foreach ($poee as $poeef) {
                ?>
                    <option value="<?php echo $poeef->nname; ?>" <?php if (strcmp($poeef->nname, $user->role) == 0) {  ?> selected='selected' <?php } ?>><?php echo  $poeef->nname; ?></option>

                <?php
                }
                ?>
            </select>


        </div>

        <div class="form-group">
            <label for="lastname"><?= label("Store"); ?></label>

            <select name="store_id" id="store_id" class="form-control">
                <?php
                // $pss = mysql_query("select id,name from stores order by name asc ");
                $pss = $db->table('stores')->select('id, name')->orderBy('name', 'asc')->get()->getResult();
                foreach ($pss as $pssf) {
                ?>

                    <option value="<?php echo $pssf->id; ?>" <?php if ($pssf->id == $user->store_id) {  ?> selected='selected' <?php } ?>><?php echo $pssf->name; ?></option>

                <?php
                }
                ?>
            </select>

        </div>



        <div class="form-group">
            <label for="email"><?= label("Adresse"); ?></label>
            <textarea name="useraddr" class="form-control" id="useraddr"><?= $user->useraddr ?></textarea>
        </div>


        <div class="form-group">
            <label for="email"><?= label("Email"); ?></label>
            <input type="email" name="email" value="<?= $user->email ?>" class="form-control" id="email" placeholder="<?= label("Email"); ?>">
        </div>







        <?php
        if ($setting->ddirectprint == 1) { ?>

            <div class="form-group">
                <label for="confirm_password"><?= label("Printername"); ?>*</label>
                <select class="form-control" name="pprintername" id="pprintername">
                    <?php
                    $getprt = printer_list(PRINTER_ENUM_LOCAL | PRINTER_ENUM_DEFAULT);
                    $printers = serialize($getprt);
                    $printers = unserialize($printers);
                    foreach ($printers as $PrintDest) {
                    ?>
                        <option value="<?php echo $PrintDest['NAME']; ?>" <?php if ($user->pprintername == $PrintDest['NAME']) { ?> selected="selected" <?php } ?>><?php echo explode(",", $PrintDest["DESCRIPTION"])[1]; ?></option>
                    <?php
                    }
                    ?>
                </select>
            </div>

        <?php
        } else {
        ?>
            <input type="hidden" name="pprintername" id="pprintername" value="<?= $user->pprintername ?>" />
        <?php
        }
        ?>

        <div class="form-group">
            <label for="password"><?= label("Password"); ?></label>
            <input type="password" name="password" class="form-control" id="password" placeholder="<?= label('Password'); ?>">
        </div>
        <div class="form-group">
            <label for="PasswordRepeat"><?= label("PasswordRepeat"); ?></label>
            <input type="password" name="PasswordRepeat" class="form-control" id="PasswordRepeat" placeholder="<?= label('PasswordRepeat'); ?>">
        </div>
        <div class="form-group">
            <label for="Avatar"><?= label("Avatar"); ?></label>
            <input type="file" name="userfile" id="Avatar">
        </div>
        <?php if ($user->avatar) { ?><img src="<?= base_url() ?>files/Avatars/<?= $user->avatar; ?>" alt="" class="float-right" width="150px" /><?php } else { ?><img src="<?= base_url() ?>assets/img/Avatar.jpg" alt="" class="float-right" width="150px" /><?php } ?>

        <div class="form-group">
            <button type="submit" class="btn btn-green col-md-6 flat-box-btn"><?= label("Submit"); ?></button>
        </div>
        <?php echo form_close(); ?>
    </div>
</div>