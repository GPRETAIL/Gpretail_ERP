// Shared import configs for all product attribute types.
// Used by both ProductAttributes.jsx (list page) and AddAttributePage.jsx (form page).

export const ATTR_IMPORT_CONFIGS = {
  SIZE: {
    aliases: {
      code: "code", name: "name", sizename: "name", size: "name",
      measurement: "measurement",
      ageset: "ageSet", agegroup: "ageSet", age: "ageSet",
      uom: "UOM", unit: "UOM", unitofmeasure: "UOM",
      sortorder: "sortOrder",
      iscombosize: "IsComboSize", combosize: "IsComboSize",
      ismetersize: "IsMeterSize", metersize: "IsMeterSize",
      isvariant: "isVariant", variant: "isVariant",
    },
    required: ["name"],
    boolFields: ["IsComboSize", "IsMeterSize", "isVariant"],
    endpoint: "/sizes/bulk",
    transform: (r) => ({
      name:        String(r.name).trim(),
      code:        r.code || null,
      measurement: r.measurement || null,
      ageSet:      r.ageSet || null,
      UOM:         r.UOM || null,
      sortOrder:   r.sortOrder,
      IsComboSize: r.IsComboSize,
      IsMeterSize: r.IsMeterSize,
      isVariant:   r.isVariant,
    }),
  },
  SIZEGROUP: {
    aliases: {
      code: "code", name: "name", groupname: "name",
      sortorder: "sortOrder",
      enablesizeratio: "enableSizeRatio", sizeratio: "enableSizeRatio",
    },
    required: ["name"],
    boolFields: ["enableSizeRatio"],
    endpoint: "/size-groups/bulk",
    transform: (r) => ({
      name:            String(r.name).trim(),
      code:            r.code || null,
      sortOrder:       r.sortOrder,
      enableSizeRatio: r.enableSizeRatio,
    }),
  },
  MARKER: {
    aliases: {
      code: "code", name: "name",
      displayorder: "displayOrder", sortorder: "displayOrder",
      incentivevalue: "incentiveValue",
      giftcouponvalid: "giftCouponValid",
      giftcouponexpiry: "giftCouponExpiry",
      billvalueabove: "billValueAbove",
      giftvoucherpercentage: "giftVoucherPercentage",
      giftvouchervalue: "giftVoucherValue",
      couponvalidafterdays: "couponValidAfterDays",
      couponexpirydays: "couponExpiryDays",
      onlinestock: "onlineStock",
      damagedgoods: "damagedGoods",
      giftcouponmarker: "giftCouponMarker",
      giftmarker: "giftMarker",
    },
    required: ["name"],
    boolFields: ["onlineStock", "damagedGoods", "giftCouponMarker", "giftMarker"],
    endpoint: "/attributes/marker/bulk",
    transform: (r) => ({
      name:       String(r.name).trim(),
      code:       r.code || null,
      sort_order: r.displayOrder ? parseInt(r.displayOrder) : 0,
      is_active:  true,
      extra_data: {
        incentive_value:         r.incentiveValue        || null,
        gift_coupon_valid:        r.giftCouponValid       || null,
        gift_coupon_expiry:       r.giftCouponExpiry      || null,
        bill_value_above:         r.billValueAbove        || null,
        gift_voucher_percentage:  r.giftVoucherPercentage || null,
        gift_voucher_value:       r.giftVoucherValue      || null,
        coupon_valid_after_days:  r.couponValidAfterDays  || null,
        coupon_expiry_days:       r.couponExpiryDays      || null,
        online_stock:             !!r.onlineStock,
        damaged_goods:            !!r.damagedGoods,
        gift_coupon_marker:       !!r.giftCouponMarker,
        gift_marker:              !!r.giftMarker,
      },
    }),
  },
  PRICETAGS: {
    aliases: {
      code: "code", name: "name",
      displayorder: "displayOrder", sortorder: "displayOrder",
      locationprice: "LocationPrice",
    },
    required: ["name"],
    boolFields: ["LocationPrice"],
    endpoint: "/attributes/pricetags/bulk",
    transform: (r) => ({
      name:       String(r.name).trim(),
      code:       r.code || null,
      sort_order: r.displayOrder ? parseInt(r.displayOrder) : 0,
      is_active:  true,
      extra_data: { location_price: !!r.LocationPrice },
    }),
  },
  DIVISION: {
    aliases: {
      code: "code", name: "name",
      deadstockage: "deadstockAge", deadstockagedays: "deadstockAge",
      sortorder: "sortOrder",
      issales: "IsSales", costing: "Costing",
    },
    required: ["name"],
    boolFields: ["IsSales", "Costing"],
    endpoint: "/attributes/division/bulk",
    transform: (r) => ({
      name:       String(r.name).trim(),
      code:       r.code || null,
      sort_order: r.sortOrder ? parseInt(r.sortOrder) : 0,
      is_active:  true,
      extra_data: {
        deadstock_age: r.deadstockAge || null,
        is_sales:      !!r.IsSales,
        costing:       !!r.Costing,
      },
    }),
  },
};

// Generic config for all other attribute types (code, name, sort order)
export const GENERIC_ATTR_CONFIG = {
  aliases: { code: "code", name: "name", sortorder: "sortOrder", sort_order: "sortOrder" },
  required: ["name"],
  boolFields: [],
};

export const GENERIC_ATTR_TRANSFORM = (r) => ({
  name:       String(r.name).trim(),
  code:       r.code || null,
  sort_order: r.sortOrder ? parseInt(r.sortOrder) : 0,
  is_active:  true,
});

/**
 * Returns { endpoint, fieldConfig, transform } for any given productType string.
 */
export function getImportProps(productType) {
  if (!productType) return null;
  const cfg = ATTR_IMPORT_CONFIGS[productType];
  return {
    endpoint:    cfg?.endpoint    ?? `/attributes/${productType.toLowerCase()}/bulk`,
    fieldConfig: cfg
      ? { aliases: cfg.aliases, required: cfg.required, boolFields: cfg.boolFields }
      : GENERIC_ATTR_CONFIG,
    transform:   cfg?.transform   ?? GENERIC_ATTR_TRANSFORM,
  };
}
