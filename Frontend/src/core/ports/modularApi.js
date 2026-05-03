import { productsService } from '@/features/products/productsService';
import { purchaseInvoiceService } from '@/features/purchaseInvoice/purchaseInvoiceService';
import { customersService } from '@/features/customers/customersService';
import { salesService } from '@/features/sales/salesService';

export const modularApi = {
  ...productsService,
  ...purchaseInvoiceService,
  ...customersService,
  ...salesService,
};
