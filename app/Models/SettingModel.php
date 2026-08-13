<?php

namespace App\Models;

use CodeIgniter\Model;

class SettingModel extends Model
{
    protected $table            = 'settings';
    protected $primaryKey       = 'id';
    protected $returnType       = 'object';
    protected $useAutoIncrement = true;
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';
    // protected $allowedFields    = [
    //     'site_name',
    //     'timezone',
    //     'language',
    //     'currency',
    //     'other_field1',
    //     'other_field2',
    //     'attime'
    // ];
    protected $allowedFields = [
        'companyname',
        'phone',
        'mystate',
        'keyboard',
        'timezone',
        'currency',
        'gstnoo',
        'discount',
        'pann',
        'aaco',
        'bbank',
        'bbranch',
        'iifs',
        'pptt',
        'printersizew',
        'regidd',
        'tax',
        'decimals',
        'receiptheader',
        'declaration',
        'receiptfooter',
        'stripe',
        'stripe_secret_key',
        'stripe_publishable_key',
        'backupdir',
        'backcloud',
        'frmemail',
        'toemail',
        'smtp_host',
        'pport',
        'smtpsecure',
        'smtp_email',
        'smtp_password',
        'ct_point_perrs',
        'ct_month',
        'min_ponint',
        'theme',
        'logo', // for the uploaded file
        'attime',
    ];


    /**
     * Get a setting by ID
     */
    public function getSetting($id)
    {
        return $this->find($id);
    }

    /**
     * Get all settings
     */
    public function getAllSettings()
    {
        return $this->findAll();
    }

    /**
     * Insert a new setting
     */
    public function insertSetting(array $data)
    {
        return $this->insert($data);
    }

    /**
     * Update a setting
     */
    public function updateSetting($id, array $data)
    {
        return $this->update($id, $data);
    }

    /**
     * Delete a setting
     */
    public function deleteSetting($id)
    {
        return $this->delete($id);
    }

    /**
     * Static-style find method (alternative to CI3 style)
     */
    public static function findById($id)
    {
        return (new self())->find($id);
    }
}
