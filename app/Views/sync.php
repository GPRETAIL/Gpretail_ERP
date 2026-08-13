<div class="container">
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
        google.load("elements", "1", {
            packages: "transliteration"
        });

        function onLoad() {
            var options = {
                sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
                destinationLanguage: [
                    '<?= label('languagek') ?>'
                ], // or [google.elements.transliteration.LanguageCode.HINDI],
                shortcutKey: 'ctrl+g',
                transliterationEnabled: true
            };
            var control = new google.elements.transliteration.TransliterationControl(options);
            var ids = ["CategoryName"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }
        google.setOnLoadCallback(onLoad);
    </script>
    <h3>Status
        <a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>settings?tab=setting">Back</a>
    </h3>
    <hr>

    <?php
    $tables = [];
    $result = $db->query('SHOW TABLES')->getResultArray();
    foreach ($result as $key => $value) {
        // dd($value['Tables_in_u597975289_next']);
        $tables[] = $value['Tables_in_u597975289_next'];
    }
    // while ($row = mysql_fetch_row($result)) {
    //     $tables[] = $row[0];
    // }
    // foreach ($tables as $table) {
    //     $result = mysql_query('SELECT * FROM ' . $table);
    //     $resultk = 'TRUNCATE TABLE ' . $table;
    //     $num_fields = mysql_num_fields($result);

    //     $ch = curl_init();
    //     $jkjv = $resultk;
    //     curl_setopt($ch, CURLOPT_URL, 'https://chltech.in/posdbcheck/sync_server/loaddatabaseuser');
    //     curl_setopt($ch, CURLOPT_POST, 1);
    //     curl_setopt($ch, CURLOPT_POSTFIELDS, 'email=' . $jkjv);
    //     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    //     $ssss = curl_exec($ch);

    //     for ($i = 0; $i < $num_fields; $i++) {
    //         $returndd = '';
    //         while ($row = mysql_fetch_row($result)) {
    //             $returndd .= 'INSERT INTO ' . $table . ' VALUES(';
    //             for ($j = 0; $j < $num_fields; $j++) {
    //                 // $row[$j] = str_replace("\n", "\\n", $row[$j]);
    //                 if (isset($row[$j])) {
    //                     $returndd .= '"' . $row[$j] . '"';
    //                 } else {
    //                     $returndd .= '""';
    //                 }
    //                 if ($j < $num_fields - 1) {
    //                     $returndd .= ',';
    //                 }
    //             }
    //             $returndd .= ");\n";

    //             $ch = curl_init();
    //             $jkj = $returndd;
    //             curl_setopt($ch, CURLOPT_URL, 'https://chltech.in/posdbcheck/sync_server/loaddatabaseuser');
    //             curl_setopt($ch, CURLOPT_POST, 1);
    //             curl_setopt($ch, CURLOPT_POSTFIELDS, 'email=' . $jkj);
    //             curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    //             $ssss = curl_exec($ch);
    //             $returndd = '';
    //         }
    //     }
    // }
    // echo date('H:i:s A');


    // $ch = curl_init();
    // curl_setopt($ch, CURLOPT_URL, base_url() . 'full-backup');
    // curl_setopt($ch, CURLOPT_POST, 1);
    // curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // $ssss = curl_exec($ch);
    ?>
    <script>
        $(function() {
            waitingDialog.show('Backup is running. Please wait for it to complete.');
            $.ajax({
                type: "get",
                url: "<?= base_url('full-backup') ?>",
                dataType: "json",
                success: function(response) {
                    console.log(response);
                    setTimeout(function() {
                        waitingDialog.hide();
                    }, 1000);
                    swal("Backup Has been Completed.... <?= date('H:i:s A') ?>");
                }
            });
        });
    </script>



    <!-- Button trigger modal -->

</div>
<!-- /.container -->
<!-- Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel"><?= label('Add') ?></h4>
            </div>
            <?php echo form_open_multipart('brand/add'); ?>
            <div class="modal-body">
                <div class="form-group">
                    <label for="CategoryName"><?= label('Brand') ?> <?= label('Name') ?></label>
                    <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName" placeholder="<?= label('Brand Name') ?>" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label('Close') ?></button>
                <button type="submit" class="btn btn-add"><?= label('Submit') ?></button>
            </div>
            <?php echo form_close(); ?>
        </div>
    </div>
</div>
<!-- /.Modal -->


<?php
// Configuration
// $sourceDir = 'path/to/source'; // Directory to back up
// $backupDir = 'path/to/backup'; // Backup directory
// $metadataFile = 'application/backup_metadata.json'; // Metadata file to track changes

// // Load metadata
// if (file_exists($metadataFile)) {
//     $metadata = json_decode(file_get_contents($metadataFile), true);
// } else {
//     $metadata = [];
// }

// // Function to perform the backup
// function incrementalBackup($sourceDir, $backupDir, &$metadata)
// {
//     $files = scandir($sourceDir);

//     foreach ($files as $file) {
//         if ($file === '.' || $file === '..') continue;

//         $sourcePath = $sourceDir . '/' . $file;
//         $backupPath = $backupDir . '/' . $file;

//         // Get last modified time
//         $lastModified = filemtime($sourcePath);

//         // Check if the file is new or modified
//         if (!isset($metadata[$file]) || $metadata[$file] < $lastModified) {
//             // Create backup directory if it doesn't exist
//             if (!file_exists($backupDir)) {
//                 mkdir($backupDir, 0777, true);
//             }

//             // Copy the file to the backup directory
//             copy($sourcePath, $backupPath);

//             // Update metadata
//             $metadata[$file] = $lastModified;
//             echo "Backed up: $file\n";
//         } else {
//             echo "No changes for: $file\n";
//         }
//     }

//     // Save metadata
//     file_put_contents($metadataFile, json_encode($metadata));
// }

// // Run the incremental backup
// incrementalBackup($sourceDir, $backupDir, $metadata);
?>