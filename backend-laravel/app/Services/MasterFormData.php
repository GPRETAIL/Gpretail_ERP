<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/** Keeps supplemental master form fields without allowing them to overwrite ownership or audit data. */
class MasterFormData
{
    private const FIELDS = [
        'transport_entries' => 'transport_id lr_no lr_date source destination packages_count weight_kg freight_charges status lr_mode received_date supplier_id agent_id commission from_city_id receiving_city_id auto_transfer_location purchase_manager stock_holding_period no_of_bundles no_of_pieces goods_value additional_margin no_of_boxes actual_wgt charged_weight lr_entry_date lr_entry_no due_date pay_mode invoice_no dev_date package_slip_no slip_date freight_charge freight_charge_amount loading_charge loading_charge_amount bundle_rate section remark file_type company_name supplier_name transport_name',
        'hr_departments' => 'name code description is_active is_sales location_id minimum_full_day minimum_present from_time to_time working_hours',
        'hr_designations' => 'name code department_id is_active role_id role_name',
        'employees' => 'employee_code contact_no name surname gender department_id company_id section_id designation_id working_location_id floor_id manager_designation_id email_id date_of_birth date_of_joining hold_salary hold_salary_date reason_checked reason allow_system system_username salary_mode salary_structure_id working_mode working_hour_id week_off gross_pay incentive_pct referred_by leave_encashment e_ot m_ot beta pf_no pf_eligible_date pf_uan esi_no esi_eligible_date father_name father_alive father_number father_live_with mother_name mother_alive mother_number mother_live_with marital_status marriage_date spouse_name spouse_alive spouse_mobile_no spouse_live_with languages_known strength blood_group nationality expected_salary expected_designation bank_id bank_account_name bank_account_no bank_ifsc license_number license_issue_date license_issue_at license_expiry aadhar_number voter_id smart_card_number pan_number passport_number passport_expiry npr_number curr_resident_no curr_resident_name curr_street curr_area curr_village curr_city_id curr_district curr_state_id curr_pincode perm_resident_no perm_resident_name perm_street perm_area perm_village perm_city_id perm_district perm_state_id perm_pincode is_active families educations experiences additional_infos trainings classifications email phone address salary joining_date',
        'brands' => 'name code logo description is_active printing_name min_margin max_margin brand_type discount_type discount_value product_ids product_margins',
        'suppliers' => 'name code code_type gst company_reg_name contact_person contact_no address city state city_id state_id country pincode email_id transport_id supplier_group_id buyer_group_id delivery_location_id min_discount_pct interest_days cash_discount_days cash_discount_pct margin_min margin_max payment_credit_days sold_percentage auto_po_limit auto_po_rating limit_amount taxable urd support_po msme_group_id msme_no agent_id tan pan bank_id bank_branch bank_account_name ifsc account_no added_on removed_on is_renamed renamed_to interstate_sale internal_transfer is_active advance_address_type advance_contact_no advance_address advance_city advance_state advance_country advance_pincode advance_product_name advance_brand_name advance_remarks advance_attachment_type opening_balance current_balance company_name gstin phone email',
        'transports' => 'name code business_mode contact_person contact_no email_id address city_id state_id pan gst bank_id branch bank_account_name ifsc account_no price tax_id vehicles loading_per_box loading_per_bundle allowed_payment_mode rcm is_active rates phone vehicle_no',
        'products' => 'name code sku barcode category_id brand_id tax_id size_group_id unit hsn_code cost_price selling_price mrp min_stock max_stock description image is_active parent_product_id design type_id style_id size_id color_id pattern_id material_id fit_id sleeve_id auto_po_min auto_po_max stock_age po_days item_level_pricing disable_po dealer_price bill_rate min_rate show_in_list touch_pos gln_uan_gs1 gln_uan_gs1_value expiry expiry_value discount_scheme discount_scheme_value',
    ];

    private const ALIASES = [
        'transport_entries' => ['no_of_bundles' => 'packages_count', 'actual_wgt' => 'weight_kg', 'freight_charge_amount' => 'freight_charges'],
        'purchase_invoices' => ['net_amount' => 'grand_total', 'tax_charges' => 'tax_amount', 'base_amount' => 'subtotal', 'discount' => 'discount_amount'],
        'employees' => ['additionalInfos' => 'additional_infos', 'employee_code' => 'code', 'contact_no' => 'phone', 'email_id' => 'email', 'date_of_joining' => 'joining_date', 'gross_pay' => 'salary'],
        'suppliers' => ['gst' => 'gstin', 'company_reg_name' => 'company_name', 'contact_no' => 'phone', 'email_id' => 'email', 'transport' => 'transport_id', 'supplier_group' => 'supplier_group_id', 'buyer_group' => 'buyer_group_id', 'delivery_location' => 'delivery_location_id', 'min_discount_percentage' => 'min_discount_pct', 'cash_discount_percentage' => 'cash_discount_pct', 'limit' => 'limit_amount', 'msme_input' => 'msme_no', 'msme_group' => 'msme_group_id', 'agent_name' => 'agent_id', 'tan_pan1' => 'tan', 'tan_pan2' => 'pan', 'ifsc_account_no1' => 'ifsc', 'ifsc_account_no2' => 'account_no', 'added_removed_on1' => 'added_on', 'added_removed_on2' => 'removed_on', 'renamed' => 'renamed_to', 'active' => 'is_active'],
        'transports' => ['contact_no' => 'phone', 'email_id' => 'email', 'active' => 'is_active'],
        'products' => ['selling_name' => 'name', 'item_code' => 'code', 'printing_name' => 'description', 'pur_rate' => 'cost_price', 'sale_rate' => 'selling_price', 'reorder_min' => 'min_stock', 'reorder_max' => 'max_stock', 'active' => 'is_active', 'product_id' => 'parent_product_id'],
    ];

    public static function normalize(array $data): array
    {
        $normalized = [];
        foreach ($data as $key => $value) {
            $snake = strtolower(preg_replace('/([a-z0-9])([A-Z])/', '$1_$2', preg_replace('/([A-Z]+)([A-Z][a-z])/', '$1_$2', $key)));
            $normalized[$snake] = $value;
        }

        return $normalized;
    }

    public static function prepare(Request $request, Model $model): array
    {
        $table = $model->getTable();
        $input = self::normalize($request->all());
        foreach (self::ALIASES[$table] ?? [] as $alias => $canonical) {
            if (array_key_exists($alias, $input) && ! array_key_exists($canonical, $input)) {
                $input[$canonical] = $input[$alias];
            }
            unset($input[$alias]);
        }
        foreach (['city', 'state'] as $field) {
            if ($table === 'suppliers' && isset($input[$field]) && is_numeric($input[$field])) {
                $input[$field.'_id'] = $input[$field];
            }
        }
        if (isset($input['rates']) && is_array($input['rates'])) {
            $input['rates'] = array_map(self::normalize(...), $input['rates']);
        }
        $allowed = explode(' ', self::FIELDS[$table]);
        // Alias destinations must also be accepted, even when they have no legacy SQL column.
        $allowed = array_merge($allowed, array_values(self::ALIASES[$table] ?? []));
        $data = array_intersect_key($input, array_flip($allowed));
        unset($data['store_id'], $data['company_id'], $data['created_by'], $data['updated_by']);
        foreach ($data as $key => &$value) {
            if (in_array($key, ['is_active', 'is_sales', 'taxable', 'urd', 'support_po', 'is_renamed', 'interstate_sale', 'internal_transfer', 'rcm', 'item_level_pricing', 'disable_po', 'show_in_list', 'touch_pos', 'gln_uan_gs1', 'expiry', 'discount_scheme'], true)) {
                $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
            } elseif (str_ends_with($key, '_id') && $value === '') {
                $value = null;
            }
        }
        unset($value);
        if ($table === 'products') {
            // Optional blank form inputs must not override NOT NULL database defaults.
            foreach (['cost_price', 'selling_price', 'mrp', 'min_stock', 'max_stock'] as $field) {
                if (array_key_exists($field, $data) && ($data[$field] === null || $data[$field] === '')) {
                    $data[$field] = 0;
                }
            }
        }
        if ($table === 'employees') {
            if (array_key_exists('salary', $data) && ($data['salary'] === '' || $data['salary'] === null)) {
                $data['salary'] = 0;
            }
            if (array_key_exists('joining_date', $data) && $data['joining_date'] === '') {
                $data['joining_date'] = null;
            }
        }
        $columns = array_flip(Schema::getColumnListing($table));
        $stored = array_intersect_key($data, $columns);
        $details = array_diff_key($data, $columns);
        $stored['master_details'] = array_replace($model->master_details ?? [], $details);

        return $stored;
    }

    public static function present(Model $model, array $attributes): array
    {
        $data = array_replace($attributes['master_details'] ?? [], $attributes);
        unset($data['master_details']);
        foreach (self::ALIASES[$model->getTable()] ?? [] as $alias => $canonical) {
            $data[$alias] = $data[$canonical] ?? null;
        }
        if ($model->getTable() === 'employees') {
            $data['date_of_joining'] = $model->getAttribute('joining_date')?->format('Y-m-d');
        }
        $data['company_id'] ??= $data['store_id'] ?? null;

        return $data;
    }
}
