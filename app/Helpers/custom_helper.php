<?php

use CodeIgniter\Database\BaseConnection;
use Config\Database;

if (!function_exists('execute_query')) {
    function execute_query(string $query)
    {
        $db = Database::connect();
        return $db->query($query)->getResult();
    }
}

if (!function_exists('backup_database')) {
    function backup_database(array $settings)
    {
        $db = Database::connect();

        $backupDir = $settings['backupdir'] ?? WRITEPATH . 'backups';
        $dateFolder = date('d-m-Y');

        if (!is_dir($backupDir . '/' . $dateFolder)) {
            mkdir($backupDir . '/' . $dateFolder, 0777, true);
        }

        $outputFile = $backupDir . '/' . $dateFolder . '/db-backup_logout.sql';

        $tables = $db->listTables();
        $backupSQL = '';

        foreach ($tables as $table) {
            $createTable = $db->query('SHOW CREATE TABLE ' . $table)->getRowArray();
            $backupSQL .= 'DROP TABLE IF EXISTS `' . $table . '`;';
            $backupSQL .= "\n\n" . $createTable['Create Table'] . ";\n\n";

            $query = $db->query('SELECT * FROM ' . $table);
            foreach ($query->getResultArray() as $row) {
                $values = array_map(fn($value) => $db->escape($value), $row);
                $backupSQL .= 'INSERT INTO `' . $table . '` VALUES(' . implode(',', $values) . ");\n";
            }
            $backupSQL .= "\n\n";
        }

        write_file($outputFile, $backupSQL);
    }
}

if (!function_exists('find_user_by_id')) {
    function find_user_by_id($id)
    {
        $db = Database::connect();
        return $db->table('users')->where('id', $id)->get()->getRow();
    }
}

if (!function_exists('mysql_query')) {
    function mysql_query($sql)
    {
        $db = Database::connect();
        return $db->query($sql);
    }
}

if (!function_exists('mysql_fetch_array')) {
    function mysql_fetch_array($query)
    {
        $db = Database::connect();
        if (is_array($query)) {
            return $query;
        } else {
            if ($query->getNumRows() > 1) {
                return $query->getResultArray();
            } else {
                return $query->getRowArray();
            }
        }
    }
}
if (!function_exists('mysqli_fetch_array')) {
    function mysqli_fetch_array($query)
    {
        $db = Database::connect();
        if (is_array($query)) {
            return $query;
        } else {
            if ($query->getNumRows() > 1) {
                return $query->getResultArray();
            } else {
                return $query->getRowArray();
            }
        }
    }
}

if (!function_exists('mysql_num_rows')) {
    function mysql_num_rows($query)
    {
        return $query->getNumRows();
    }
}

if (!function_exists('mysql_fetch_row')) {
    function mysql_fetch_row($query)
    {
        return $query->getRowArray();
    }
}

if (!function_exists('mysql_insert_id')) {
    function mysql_insert_id()
    {
        $db = Database::connect();
        return $db->insertID();
    }
}

if (!function_exists('mysql_fetch_object')) {
    function mysql_fetch_object($query)
    {
        return $query->getRow();
    }
}

if (!function_exists('_hash')) {
    function _hash(string $password)
    {
        $salt = bin2hex(random_bytes(32));
        $hash = hash('sha256', $salt . $password);
        return $salt . $hash;
    }
}

function segment($number)
{
    $uri = service('request')->getUri();
    return $uri->getSegment($number);
}
function isLoggedIn()
{
    $session = session();
    $userId = $session->get('user_id');

    if (empty($userId)) {
        return false;
    }
    return true;
}
