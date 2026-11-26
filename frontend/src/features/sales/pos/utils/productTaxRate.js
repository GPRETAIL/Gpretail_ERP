/**
 * The GST % a sales screen should charge for a product row from `GET /products`.
 * The API sends the sales tax as `sales_tax.rate` (snake_case, a string like "18.00") and the general tax as `tax.rate`.
 * An older shape, `salesTax.tax_percentage`, is still read so a screen given that shape keeps working.
 */
export default function productTaxRate(product) {
  const rate = product?.sales_tax?.rate ?? product?.tax?.rate ?? product?.salesTax?.tax_percentage;
  const number = Number(rate);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
