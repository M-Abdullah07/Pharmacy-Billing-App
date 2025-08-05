import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

export default function AddSale() {
  // Core data states
  const [customers, setCustomers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  // Selected values
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  // Sale item inputs
  const [quantity, setQuantity] = useState(1);
  const [saleRate, setSaleRate] = useState("");

  // Sale items list
  const [saleItems, setSaleItems] = useState([]);

  // Credit sale checkbox
  const [isCredit, setIsCredit] = useState(false);

  // Loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // States to show add forms
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [newMedicine, setNewMedicine] = useState({ name: "", type: "" });

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batch_no: "",
    purchase_rate: "",
    quantity: "",
    expiry: ""
  });
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(false)

  // Electron API shortcut
  const api = window.electronAPI;

  // Fetch customers from DB
  const refreshCustomers = async () => {
    try {
      const result = await api.queryDb("SELECT id, name FROM customers");
      setCustomers(result || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setErrors(prev => ({ ...prev, customers: 'Failed to load customers' }));
    }
  };

  // Fetch medicines from DB
  const refreshMedicines = async () => {
    try {
      const result = await api.queryDb("SELECT id, name FROM medicines");
      setMedicines(result || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setErrors(prev => ({ ...prev, medicines: 'Failed to load medicines' }));
    }
  };

  // Fetch batches for selected medicine and with stock > 0
  const refreshBatches = async (medicineId) => {
    try {
      const result = await api.queryDb(
        "SELECT * FROM batches WHERE medicine_id = ? AND quantity_available > 0", [medicineId]
      );
      setBatches(result || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setErrors(prev => ({ ...prev, batches: 'Failed to load batches' }));
    }
  };

  // Initial load of customers and medicines
  useEffect(() => {
    refreshCustomers();
    refreshMedicines();
  }, []);

  // Load batches when medicine changes
  useEffect(() => {
    if (selectedMedicine) {
      refreshBatches(selectedMedicine);
      setSelectedBatch("");
    } else {
      setBatches([]);
      setSelectedBatch("");
    }
  }, [selectedMedicine]);

  // Auto fill sale rate on batch change
  useEffect(() => {
    if (selectedBatch) {
      const batch = batches.find(b => b.id === parseInt(selectedBatch));
      if (batch && batch.sale_rate) {
        setSaleRate(batch.sale_rate.toString());
      }
    }
  }, [selectedBatch, batches]);

  // Handlers for adding new Customer
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert("Customer name is required");
      return;
    }
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke("add-customer", {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim()
      });
      if (result.success) {
        await refreshCustomers();
        setSelectedCustomer(result.customerId.toString());
        setShowAddCustomer(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
      } else {
        alert("Failed to add customer: " + (result.error || "Unknown Error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for adding new Medicine
  const handleAddMedicine = async () => {
    if (!newMedicine.name.trim()) {
      alert("Medicine name is required");
      return;
    }
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke("add-medicine", {
        name: newMedicine.name.trim(),
        type: newMedicine.type.trim()
      });
      if (result.success) {
        await refreshMedicines();
        setSelectedMedicine(result.medicineId.toString());
        setShowAddMedicine(false);
        setNewMedicine({ name: "", type: "" });
      } else {
        alert("Failed to add medicine: " + (result.error || "Unknown Error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for adding new Batch
  const handleAddBatch = async () => {
    const { batch_no, purchase_rate, quantity, expiry } = newBatch;
    if (!batch_no.trim() || !purchase_rate || !quantity || !expiry) {
      alert("Please fill all batch fields");
      return;
    }
    if (!selectedMedicine) {
      alert("Please select a medicine first");
      return;
    }
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke("add-batch", {
        medicineId: selectedMedicine,
        batch_no: batch_no.trim(),
        purchase_rate: parseFloat(purchase_rate),
        quantity: parseInt(quantity, 10),
        expiry_date: expiry
      });
      if (result.success) {
        await refreshBatches(selectedMedicine);
        setSelectedBatch(result.batchId.toString());
        setShowAddBatch(false);
        setNewBatch({ batch_no: "", purchase_rate: "", quantity: "", expiry: "" });
      } else {
        alert("Failed to add batch: " + (result.error || "Unknown Error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add an item to the sale list
  const handleAddItem = () => {
    if (!selectedBatch || !quantity || !saleRate) {
      alert("Please fill all fields");
      return;
    }
    const batch = batches.find(b => b.id === parseInt(selectedBatch));
    const medicine = medicines.find(m => m.id === parseInt(selectedMedicine));

    if (!batch || !medicine) {
      alert("Invalid selection");
      return;
    }

    if (quantity > batch.quantity_available) {
      alert(`Insufficient stock! Available: ${batch.quantity_available}`);
      return;
    }

    const existingItem = saleItems.find(item => item.batchId === batch.id);
    if (existingItem) {
      alert("This batch is already added. Remove it first to change quantity.");
      return;
    }

    const totalAmount = quantity * parseFloat(saleRate);

    setSaleItems(prev => [
      ...prev,
      {
        batchId: batch.id,
        medicineName: medicine.name,
        batchNumber: batch.batch_number,
        quantity: parseInt(quantity),
        saleRate: parseFloat(saleRate),
        totalAmount,
        expiry: batch.expiry_date
      }
    ]);

    // Reset input controls
    setQuantity(1);
    setSaleRate("");
    setSelectedBatch("");
    setSelectedMedicine("");
  };

  const handleRemoveItem = (index) => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit the sale & reduce stock in DB
  const handleSubmitSale = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      alert("Please select a customer and add at least one item.");
      return;
    }

    try {
      setIsLoading(true);
      const totalAmount = saleItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const result = await window.electron.ipcRenderer.invoke("execute-transaction", {
        type: "add-sale",
        data: {
          customerId: selectedCustomer,
          isCredit,
          items: saleItems,
          totalAmount
        }
      });
      if (result.success) {
        alert(`Sale recorded successfully! Sale ID: ${result.saleId}`);
        // Reset form
        setSaleItems([]);
        setSelectedCustomer("");
        setIsCredit(false);
        setSelectedMedicine("");
        setSelectedBatch("");
        setQuantity(1);
        setSaleRate("");
      } else {
        alert("Failed to record sale: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error submitting sale: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const grandTotal = saleItems.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="grid grid-cols-1">

      {isLoading && <p>Loading...</p>}

      {/* Customer select */}
      {/* Customer select */}
      <Label className="mb-2">Customers:</Label>
      <div className="flex flex-row items-center gap-2 mb-4">
        <Select>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Customers</SelectLabel>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button variant="link" size="sm" onClick={() => setShowAddCustomer(true)}>
          + Add Customer
        </Button>
      </div>

      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the details and click save to add a new customer.
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
              className="input-class"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleAddCustomer}>Save</Button>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Medicine select */}
      <Label className="mb-2">Medicine:</Label>
      <div className="flex flex-row items-center gap-2 mb-4">
        <Select>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Medicine" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Medicines</SelectLabel>
              {medicines.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button variant="link" size="sm" onClick={() => setShowAddMedicine(true)}>+ Add Medicine</Button>
      </div>
      <Dialog open={showAddMedicine} onOpenChange={setShowAddMedicine}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>
              Fill in the details and click save to add a new Medicine.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-4">
            <Label>Medicine Info:</Label>
            <Input
              type="text"
              placeholder="Name"
              value={newMedicine.name}
              onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
            />
            <Input
              type="text"
              placeholder="Type"
              value={newMedicine.type}
              onChange={(e) => setNewMedicine({ ...newMedicine, type: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleAddCustomer}>Save</Button>
            <Button variant="outline" onClick={() => setShowAddMedicine(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch select */}
      <Label className="mb-2">Batch:</Label>
      <div className="flex flex-row items-center gap-2 mb-4">
        <Select>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Batches</SelectLabel>
              {batches.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button variant="link" size="sm" onClick={() => setShowAddBatch(true)}>+ Add Batch</Button>
      </div>
      <Dialog open={showAddBatch} onOpenChange={setShowAddBatch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Batch</DialogTitle>
            <DialogDescription>
              Fill in the details and click save to add a new Batch.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-4">
            <Label>Batch Info:</Label>
            <Input
              type="text"
              placeholder="Batch Number"
              value={newBatch.batch_no}
              onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Purchase Rate"
              value={newBatch.purchase_rate}
              onChange={(e) => setNewBatch({ ...newBatch, purchase_rate: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step={1}
              placeholder="Quantity"
              value={newBatch.quantity}
              onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
            />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" id="date" className="justify-center font-normal">
                  {date ? date.toLocaleDateString() : "Select Expirty date"}
                  <CalendarIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  captionLayout="dropdown"
                  onSelect={(selectedDate) => {
                    setDate(selectedDate)
                    setNewBatch({ ...newBatch, expiry: selectedDate?.toISOString().split("T")[0] || "" })
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleAddCustomer}>Save</Button>
            <Button variant="outline" onClick={() => setShowAddMedicine(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity and Sale Rate Inputs */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 w-full max-w-xl space-y-4">
        <div className="space-y-1">
          <Label className="text-lg font-semibold">Add Items to Sale</Label>
          <p className="text-sm text-muted-foreground">Enter quantity and sale rate, then add to sale.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            type="number"
            min="1"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Sale Rate"
            value={saleRate}
            onChange={(e) => setSaleRate(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={handleAddItem}
            disabled={!selectedBatch || !quantity || !saleRate}
            className="w-full"
          >
            Add Item
          </Button>
        </div>
      </div>


      {/* Sale items table */}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {saleItems.length === 0 && (
            <TableRow><TableCell colSpan="7" style={{ textAlign: 'center' }}>No items added</TableCell></TableRow>
          )}
          {saleItems.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.medicineName}</TableCell>
              <TableCell>{item.batchNumber}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>₹{item.saleRate.toFixed(2)}</TableCell>
              <TableCell>₹{item.totalAmount.toFixed(2)}</TableCell>
              <TableCell>{item.expiry}</TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(index)}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
          {saleItems.length > 0 && (
            <TableRow>
              <TableCell colSpan="4" style={{ fontWeight: 'bold', textAlign: 'right' }}>Grand Total:</TableCell>
              <TableCell colSpan="3" style={{ fontWeight: 'bold' }}>₹{grandTotal.toFixed(2)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Credit sale */}
      <div className="flex items-center justify-between mt-8 border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox id="credit" />
          <Label htmlFor="credit">Credit Sale</Label>
        </div>
        <Button onClick={handleSubmitSale} disabled={saleItems.length === 0 || !selectedCustomer}> Submit Sale </Button>
      </div>
    </div>
  );
}
