export const GST_SLABS = [0, 5, 12, 18, 28];
export const DRUG_SCHEDULES = ['OTC', 'G', 'H', 'H1', 'X'];
export const UOM_OPTIONS = ['Strip', 'Bottle', 'Vial', 'Sachet', 'Piece', 'Box', 'Ampoule'];
export const FORM_OPTIONS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Cream',
  'Drops',
  'Inhaler',
  'Powder',
  'Gel',
  'Patch',
];

export const EMPTY_FORM = {
  name: '',
  manufacturer_id: '',
  category_id: '',
  form: '',
  uom: 'Strip',
  quantity_in_uom: 1,
  hsn_code: '',
  gst_rate: 0,
  drug_schedule: 'OTC',
  generic_formula: '',
  default_sale_rate: '',
  default_purchase_rate: '',
  shelf_no: '',
};

export function validateProductForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'This field is required.';
  if (!form.manufacturer_id) errors.manufacturer_id = 'This field is required.';
  if (!form.category_id) errors.category_id = 'This field is required.';
  if (!form.hsn_code.trim()) errors.hsn_code = 'This field is required.';
  if (!GST_SLABS.includes(Number(form.gst_rate))) {
    errors.gst_rate = 'Please select a valid FBR GST rate.';
  }
  if (!form.drug_schedule) errors.drug_schedule = 'This field is required.';
  if (form.quantity_in_uom && Number(form.quantity_in_uom) < 1) {
    errors.quantity_in_uom = 'Quantity must be at least 1.';
  }
  if (form.default_sale_rate && Number(form.default_sale_rate) < 0) {
    errors.default_sale_rate = 'Sale rate cannot be negative.';
  }
  if (form.default_purchase_rate && Number(form.default_purchase_rate) < 0) {
    errors.default_purchase_rate = 'Purchase rate cannot be negative.';
  }
  return errors;
}
