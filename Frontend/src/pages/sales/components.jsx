import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function AddCustomerDialog({
  open,
  onOpenChange,
  newCustomerName,
  newCustomerPhone,
  setNewCustomerName,
  setNewCustomerPhone,
  onSave,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Fill in details and click save to add new customer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Label>Customer Name:</Label>
          <Input
            type="text"
            placeholder="Name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            required
          />
          <Label>Customer Phone Number:</Label>
          <Input
            type="text"
            placeholder="Phone (optional)"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onSave}>Save</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SaleItemsTable({ items, onRemove }) {
  return (
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Rate (FEFO)</TableHead>
          <TableHead>Total (FEFO)</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan="7" style={{ textAlign: 'center' }}>
              No items added
            </TableCell>
          </TableRow>
        )}
        {items.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.productName}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{item.saleRate ? `Rs. ${item.saleRate.toFixed(2)}` : 'Auto-calculated'}</TableCell>
            <TableCell>
              {item.saleRate ? `Rs. ${(item.quantity * item.saleRate).toFixed(2)}` : 'Auto-calculated'}
            </TableCell>
            <TableCell>
              <Button variant="destructive" size="sm" onClick={() => onRemove(index)}>
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
