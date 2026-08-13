<?php

namespace App\Controllers;

class BackupController extends BaseController
{
    protected $sourceDir = 'uploads';
    protected $backupDir = 'backups/uploads';
    protected $metadataFile = WRITEPATH . 'backup_metadata.json';

    public function incrementalBackup()
    {
        $metadata = [];
        if (is_file($this->metadataFile)) {
            $metadata = json_decode(file_get_contents($this->metadataFile), true);
        }

        $files = scandir($this->sourceDir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;

            $sourcePath = $this->sourceDir . '/' . $file;
            $backupPath = $this->backupDir . '/' . $file;

            $lastModified = filemtime($sourcePath);

            if (!isset($metadata[$file]) || $metadata[$file] < $lastModified) {
                if (!is_dir($this->backupDir)) {
                    mkdir($this->backupDir, 0777, true);
                }
                copy($sourcePath, $backupPath);
                $metadata[$file] = $lastModified;
                echo "Backed up: $file<br>";
            } else {
                echo "No changes for: $file<br>";
            }
        }

        file_put_contents($this->metadataFile, json_encode($metadata));
    }

    public function incremental_db_backup()
    {
        $db      = \Config\Database::connect();
        $builder = $db->table('YOUR_TABLE'); // Replace with actual table

        $last_backup_time = $this->getLastBackupTime();
        $fullData         = [];
        foreach ($db->listTables() as $table) {
            $builder = $db->table($table);
            $builder->where('attime >=', $last_backup_time);
            $result = $builder->get()->getResultArray();
            if (!empty($result)) {
                $fullData[$table] = $result;
            }
        }

        if (!empty($fullData)) {
            $path = WRITEPATH . 'backups/incremental_backup/';
            if (!is_dir($path)) {
                mkdir($path, 0777, true);
            }
            $filename = 'incremental_backup_' . date('Y-m-d_H-i-s') . '.json';
            file_put_contents($path . $filename, json_encode($fullData));
        }

        $this->updateLastBackupTime();
    }

    public function full_backup($folder = 'full_backup')
    {
        $db     = db_connect();
        $dbutil = \Config\Database::utils();

        $query = $db->query('SELECT * FROM sales');

        $delimiter = ',';
        $newline   = "\r\n";
        $enclosure = '"';

        // echo $dbutil->getCSVFromResult($query, $delimiter, $newline, $enclosure);

        // die;

        $prefs = [
            'format'   => 'zip',
            'filename' => 'database_backup-' . date('d-m-Y') . '.sql'
        ];

        $backup = $dbutil->backup($prefs);
        $path   = WRITEPATH . 'backups/' . $folder . '/';
        if (!is_dir($path)) {
            mkdir($path, 0777, true);
        }

        $filename = 'backup-on-' . date('Y-m-d-H-i-s') . '.zip';
        write_file($path . $filename, $backup);

        return $this->response->setJSON([
            'status'  => 'Success',
            'message' => 'Backup successfully saved'
        ]);
    }

    protected function getLastBackupTime()
    {
        $file = WRITEPATH . 'backups/last_backup_time.txt';
        return is_file($file) ? file_get_contents($file) : '2024-01-01 00:00:00';
    }

    protected function updateLastBackupTime()
    {
        file_put_contents(WRITEPATH . 'backups/last_backup_time.txt', date('Y-m-d H:i:s'));
    }

    public function databaseBackup()
    {
        $db = \Config\Database::connect();
        echo 'Driver in use: ' . $db->DBDriver;
        die();

        $db      = \Config\Database::connect();
        $dbutil  = \Config\Database::utils();

        // Backup preferences
        $prefs = [
            'format'   => 'zip',                    // zip | gzip | txt
            'filename' => 'ci_backup.sql',          // Name inside the zip
        ];

        try {
            $backup = $dbutil->backup($prefs); // Create backup

            // Save to writable directory
            $backupPath = WRITEPATH . 'backups/';
            if (!is_dir($backupPath)) {
                mkdir($backupPath, 0777, true);
            }

            $fileName = 'backup_' . date('Y-m-d_H-i-s') . '.zip';
            $fullPath = $backupPath . $fileName;

            helper('file');
            write_file($fullPath, $backup);

            return $this->response->setJSON([
                'status'  => 'success',
                'message' => 'Backup saved successfully',
                'file'    => $fileName,
                'path'    => $fullPath
            ]);
        } catch (\Throwable $e) {
            return $this->response->setJSON([
                'status'  => 'error',
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }



    public function full_backup_csv()
    {
        helper('filesystem');

        $db = db_connect();
        $query = $db->query('SELECT * FROM sales');

        $csv = $this->generateCSV($query);

        $filename = WRITEPATH . 'backups/full_backup/sales-' . date('Y-m-d-H-i-s') . '.csv';
        if (!is_dir(dirname($filename))) {
            mkdir(dirname($filename), 0777, true);
        }

        write_file($filename, $csv);

        return $this->response->setJSON([
            'status'  => 'Success',
            'message' => 'CSV backup saved',
            'file'    => $filename
        ]);
    }

    private function generateCSV($query)
    {
        $delimiter = ',';
        $newline = "\r\n";
        $enclosure = '"';

        $output = '';

        // Add headers
        $fields = $query->getFieldNames();
        $output .= implode($delimiter, $fields) . $newline;

        foreach ($query->getResultArray() as $row) {
            $line = [];
            foreach ($fields as $field) {
                $line[] = $enclosure . str_replace($enclosure, '""', $row[$field]) . $enclosure;
            }
            $output .= implode($delimiter, $line) . $newline;
        }

        return $output;
    }
}
