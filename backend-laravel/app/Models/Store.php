<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'reg_name',
        'contact_person',
        'admin_name',
        'admin_email',
        'admin_password',
        'address',
        'city',
        'state',
        'pincode',
        'phone',
        'email',
        'gstin',
        'state_code',
        'gst_username',
        'einvoice_username',
        'einvoice_password',
        'gst_access_key',
        'pf_esi_no',
        'tan_pan',
        'bank_account_name',
        'account_no',
        'ifsc',
        'website',
        'logo',
        'internal_vendor_margin',
        'as_supplier',
        'as_customer',
        'access_level',
        'access_modules',
        'printer_configurations',
        'receipt_customization',
        'barcode_customization',
        'attendance_settings',
        'is_active',
        'loyalty_point_value',
        'loyalty_redeem_min_points',
        'loyalty_redeem_window_months',
    ];

    protected function casts(): array
    {
        return [
            'is_active'               => 'boolean',
            'as_supplier'             => 'boolean',
            'as_customer'             => 'boolean',
            'internal_vendor_margin'  => 'decimal:2',
            'access_modules'          => 'array',
            'printer_configurations'  => 'array',
            'receipt_customization'   => 'array',
            'barcode_customization'   => 'array',
            'attendance_settings'     => 'array',
            'loyalty_point_value'          => 'decimal:2',
            'loyalty_redeem_min_points'    => 'integer',
            'loyalty_redeem_window_months' => 'integer',
        ];
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function stocks()
    {
        return $this->hasMany(Stock::class);
    }

    public function printerConfigs()
    {
        return $this->hasMany(PrinterConfig::class);
    }

    public function customerOrders()
    {
        return $this->hasMany(CustomerOrder::class);
    }

    public function posSales()
    {
        return $this->hasMany(PosSale::class);
    }
}
