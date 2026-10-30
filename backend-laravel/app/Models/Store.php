<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string|null $logo
 * @property string|null $reg_name
 * @property string|null $contact_person
 * @property string|null $admin_name
 * @property string|null $admin_email
 * @property string|null $tan_pan
 * @property bool $as_supplier
 * @property bool $as_customer
 * @property array<string, mixed>|null $printer_configurations
 */
class Store extends Model
{
    use HasFactory;

    protected $hidden = ['platform_licence_token', 'admin_password', 'backup_settings'];

    protected $fillable = [
        'platform_store_id', 'platform_company_code', 'activation_required', 'activated_at',
        'platform_active_till', 'platform_licence_token', 'platform_subscription',
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
        'backup_settings',
        'theme_customization',
        'is_active',
        'loyalty_point_value',
        'loyalty_redeem_min_points',
        'loyalty_redeem_window_months',
    ];

    protected function casts(): array
    {
        return [
            'activation_required' => 'boolean', 'activated_at' => 'datetime',
            'platform_active_till' => 'datetime', 'platform_subscription' => 'array',
            'is_active' => 'boolean',
            'as_supplier' => 'boolean',
            'as_customer' => 'boolean',
            'internal_vendor_margin' => 'decimal:2',
            'access_modules' => 'array',
            'printer_configurations' => 'array',
            'receipt_customization' => 'array',
            'barcode_customization' => 'array',
            'attendance_settings' => 'array',
            'backup_settings' => 'array',
            'theme_customization' => 'array',
            'loyalty_point_value' => 'decimal:2',
            'loyalty_redeem_min_points' => 'integer',
            'loyalty_redeem_window_months' => 'integer',
        ];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<Stock, $this> */
    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    /** @return HasMany<PrinterConfig, $this> */
    public function printerConfigs(): HasMany
    {
        return $this->hasMany(PrinterConfig::class);
    }

    /** @return HasMany<CustomerOrder, $this> */
    public function customerOrders(): HasMany
    {
        return $this->hasMany(CustomerOrder::class);
    }

    /** @return HasMany<PosSale, $this> */
    public function posSales(): HasMany
    {
        return $this->hasMany(PosSale::class);
    }

    /** @return HasMany<ThemePreset, $this> */
    public function themePresets(): HasMany
    {
        return $this->hasMany(ThemePreset::class);
    }
}
