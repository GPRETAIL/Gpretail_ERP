<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class Backup extends Controller
{
    public function dbBackup()
    {
        helper('filesystem');

        // Load database config
        $dbConfig = new \Config\Database();
        $cfg = $dbConfig->default;

        $host   = $cfg['hostname'] ?? '127.0.0.1';
        $port   = $cfg['port'] ?? 3306;
        $user   = $cfg['username'] ?? '';
        $pass   = $cfg['password'] ?? '';
        $dbname = $cfg['database'] ?? '';

        if (empty($dbname)) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'No database configured.']);
        }

        // Backup directory setup
        $backupDir = WRITEPATH . 'backups/';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $timestamp = date('Y-m-d_H-i-s');
        $sqlFile = $backupDir . "backup-{$timestamp}.sql";
        $zipFile = $backupDir . "backup-{$timestamp}.zip";

        // Run mysqldump or fallback to PHP dump
        try {
            $this->runMysqldumpFast($host, $port, $user, $pass, $dbname, $sqlFile);
        } catch (\Throwable $e) {
            // fallback to PHP-based dump if library available
            if (class_exists('\Ifsnop\Mysqldump\Mysqldump')) {
                try {
                    $this->runPhpDump($host, $port, $user, $pass, $dbname, $sqlFile);
                } catch (\Throwable $e2) {
                    return $this->response->setJSON([
                        'status' => 'error',
                        'message' => 'Backup failed using both mysqldump and PHP library.',
                        'mysqldump_error' => $e->getMessage(),
                        'phpdump_error' => $e2->getMessage(),
                    ]);
                }
            } else {
                return $this->response->setJSON([
                    'status' => 'error',
                    'message' => 'mysqldump failed and ifsnop/mysqldump-php not found.',
                    'mysqldump_error' => $e->getMessage(),
                    'hint' => 'Run composer require ifsnop/mysqldump-php'
                ]);
            }
        }

        // Compress SQL file to ZIP
        if (extension_loaded('zip')) {
            $zip = new \ZipArchive();
            if ($zip->open($zipFile, \ZipArchive::CREATE) === true) {
                $zip->addFile($sqlFile, basename($sqlFile));
                $zip->close();
                @unlink($sqlFile); // cleanup raw SQL
            } else {
                return $this->response->setJSON(['status' => 'error', 'message' => 'Unable to create zip file.']);
            }
        }

        // Optional: auto-clean older backups (keep last 10)
        $this->cleanOldBackups($backupDir, 10);

        return $this->response->setJSON([
            'status' => 'success',
            'file'   => file_exists($zipFile) ? $zipFile : $sqlFile,
            'message' => 'Database backup completed successfully.'
        ]);
    }

    /**
     * Fast mysqldump execution
     */
    protected function runMysqldumpFast($host, $port, $user, $pass, $dbname, $outFile)
    {
        // Find mysqldump path
        $mysqldump = trim((string) shell_exec('which mysqldump 2>/dev/null'));
        if (empty($mysqldump)) {
            // fallback Windows
            $mysqldump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
            if (!file_exists($mysqldump)) {
                throw new \RuntimeException('mysqldump binary not found.');
            }
        }

        // Use MYSQL_PWD to avoid password in command line
        if (!empty($pass)) {
            putenv('MYSQL_PWD=' . $pass);
        }

        $cmd = sprintf(
            '"%s" --single-transaction --quick --skip-lock-tables --compress --max_allowed_packet=512M --set-gtid-purged=OFF -h %s -P %s -u %s %s > %s 2>&1',
            $mysqldump,
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($user),
            escapeshellarg($dbname),
            escapeshellarg($outFile)
        );

        exec($cmd, $output, $returnVar);
        putenv('MYSQL_PWD');

        if ($returnVar !== 0 || !file_exists($outFile) || filesize($outFile) == 0) {
            throw new \RuntimeException('mysqldump failed: ' . implode("\n", $output));
        }
    }

    /**
     * Fallback: PHP-based dump using ifsnop/mysqldump-php
     */
    protected function runPhpDump($host, $port, $user, $pass, $dbname, $outFile)
    {
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname}";
        $dump = new \Ifsnop\Mysqldump\Mysqldump($dsn, $user, $pass, [
            'skip-triggers' => false,
            'add-drop-table' => true,
            'single-transaction' => true,
            'lock-tables' => false,
            'compress' => \Ifsnop\Mysqldump\Mysqldump::NONE,
        ]);
        $dump->start($outFile);
    }

    /**
     * Remove older backup files (keep latest N)
     */
    protected function cleanOldBackups($dir, $keep = 10)
    {
        $files = glob($dir . 'backup-*.zip');
        if (count($files) > $keep) {
            usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a));
            $old = array_slice($files, $keep);
            foreach ($old as $file) {
                @unlink($file);
            }
        }
    }
}
