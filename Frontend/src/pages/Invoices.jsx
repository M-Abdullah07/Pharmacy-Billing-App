import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import {
  Search,
  CreditCard,
  Clock,
  User,
  Mail,
  MapPin,
  Phone,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Credit,
  ArrowRight,
  Loader2,
  UserCheck,
  CreditCardCheck
} from 'lucide-react';
import {
  Popover as PopoverComponent,
  PopoverTrigger as PopoverTriggerComponent,
  PopoverContent as PopoverContentComponent
} from 'lucide-react';
import {
  Tooltip as TooltipComponent,
  Tooltip as TooltipTriggerComponent
} from 'lucide-react';

export default function Invoices() {
  // Core data states
  const [invoices, setInvoices] = useState([]);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState(null);
  const [selectedProductInfo, setSelectedProductInfo] = useState(null);
  const [selectedBatchInfo, setSelectedBatchInfo] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedBatchDate, setSelectedBatchDate] = useState(new Date());

  // Selected values
  const [selectedBatchDateInput, setSelectedBatchDateInput] = useState("");

  // Sale item inputs
  const [quantity, setQuantity] = useState(1);
  const [saleRate, setSaleRate] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // Sale items list
  const [saleItems, setSaleItems] = useState([]);

  // Credit sale checkbox
  const [isCredit, setIsCredit] = useState(false);

  // Loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Electron API shortcut
  const api = window.electronAPI;

  // Mock data for undefined variables (to prevent crashes)
  const paymentMethods = [];
  const bills = [];
  const selectedPatientId = { patientId: 'N/A' };
  const [paymentMethod, setPaymentMethod] = useState({});

  // States to show add forms
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batch_no: "",
    purchase_rate: "",
    quantity: "",
    expiry: ""
  });
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(false);

  // Fetch invoices from DB
  const refreshInvoices = async () => {
    try {
      const result = await api.getInvoices();
      setInvoices(result || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setErrors(prev => ({ ...prev, invoices: 'Failed to load invoices' }));
    }
  };

  // Fetch products from DB
  const refreshProducts = async () => {
    try {
      const result = await api.getProducts();
      setProducts(result || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrors(prev => ({ ...prev, products: 'Failed to load products' }));
    }
  };

  // Fetch batches for selected product and with stock > 0
  const refreshBatches = async (productId) => {
    try {
      const result = await api.getStockByProduct(productId);
      setBatches(result || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setErrors(prev => ({ ...prev, batches: 'Failed to load batches' }));
    }
  };

  // Initial load of invoices
  useEffect(() => {
    refreshInvoices();
    refreshProducts();
  }, []);

  // Load batches when product changes
  useEffect(() => {
    if (selectedProduct) {
      refreshBatches(selectedProduct);
      setSelectedBatch("");
    } else {
      setBatches([]);
      setSelectedBatch("");
    }
  }, [selectedProduct]);

  // Auto fill sale rate on batch change
  useEffect(() => {
    if (selectedBatch) {
      const batch = batches.find(b => b.batch_id === selectedBatch);
      if (batch && batch.mrp) {
        setSaleRate(batch.mrp.toString());
      }
    }
  }, [selectedBatch, batches]);

  // Load batch details when date changes
  useEffect(() => {
    const batch = batches.find(b => b.batch_id === selectedBatchDateInput);
    if (batch) {
      setSelectedBatchInfo(prev => prev ? {...prev, batchNumber: batch.batch_number, quantity_available: batch.quantity_available} : { batchNumber: batch.batch_number, quantity_available: 0 });
      setSaleRate(batch.mrp.toString());
    }
  }, [selectedBatchDateInput, batches]);

  // Handlers for adding new Batch
  const handleAddBatch = async () => {
    if (!newBatch.batch_no.trim() || !newBatch.purchase_rate || !newBatch.quantity || !newBatch.expiry || !selectedProduct) {
      alert("Please fill all batch fields and select a product");
      return;
    }
    if (!selectedCustomer) {
      alert("Please select a customer first");
      return;
    }
    try {
      setIsLoading(true);
      const result = await api.addBatch({
        product_id: selectedProduct,
        batch_number: newBatch.batch_no.trim(),
        purchase_cost_per_unit: parseFloat(newBatch.purchase_rate),
        quantity_received: parseInt(newBatch.quantity, 10),
        expiry_date: newBatch.expiry,
        supplier_id: null,
        manufacturing_date: null,
        mrp: parseFloat(newBatch.purchase_rate) * 1.2 // Default markup
      });
      if (result.success) {
        await refreshInvoices();
        await refreshBatches(selectedProduct);
        setSelectedBatch(result.batchId);
        setSelectedBatchDateInput(result.batchId);
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
    const batch = batches.find(b => b.batch_id === selectedBatch);
    const product = products.find(p => p.product_id === selectedProduct);

    if (!batch || !product) {
      alert("Invalid selection");
      return;
    }

    if (quantity > batch.quantity_available) {
      alert(`Insufficient stock! Available: ${batch.quantity_available}`);
      return;
    }

    const existingItem = saleItems.find(item => item.batchId === batch.batch_id);
    if (existingItem) {
      alert("This batch is already added. Remove it first to change quantity.");
      return;
    }

    const totalAmount = quantity * parseFloat(saleRate);

    setSaleItems(prev => [
      ...prev,
      {
        batchId: batch.batch_id,
        productName: product.name,
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
    setSelectedProduct("");
  };

  const handleHandleRemoveItem = (index) => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  // Get selected payment method details
  const getPaymentMethodDetails = () => {
    if (!selectedPaymentMethod) return {};
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!method) return {};
    return {
      ...method,
      batchNumber: selectedBatch ? batches.find(b => b.batch_id === selectedBatch)?.batch_number : ''
    };
  };

  // Handle payment method change
  const handlePaymentMethodChange = (id) => {
    if (selectedPaymentMethod === id) {
      setSelectedPaymentMethod(null);
      setPaymentMethod({});
    } else {
      const methodDetails = getPaymentMethodDetails();
      setPaymentMethod(methodDetails);
      setSaleRate(methodDetails.rate);
    }
  };

  // Submit the sale & reduce stock in DB
  const handleSubmitSale = async () => {
    if (!selectedCustomer || selectedBatch) {
      alert("Please select a batch and add at least one item.");
      return;
    }

    try {
      setIsLoading(true);
      const totalAmount = saleItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const result = await api.addSale({
        customerId: selectedCustomer,
        isCredit,
        items: saleItems,
        totalAmount,
        selectedPaymentMethod: selectedBatch ? selectedBatchInfo.batchId : ''
      });
      if (result.success) {
        alert(`Sale recorded successfully! Sale ID: ${result.saleId}`);
        // Reset form
        setSaleItems([]);
        setSelectedPaymentMethod(null);
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

  const selectedBatchDate = new Date(selectedBatchDateInput || new Date()).toLocaleDateString();
  const selectedBatchDateObj = new Date(selectedBatchDateInput || new Date()).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" className="mb-4" onClick={() => { setSelectedPaymentMethod(null); setPaymentMethod({}); }}>
          <ArrowRight className="w-4 h-4" />
          Back to Invoices
        </Button>
        <Badge>Patient Billing</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Info Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Patient Information
              </CardHeader>
              <CardDescription>
                {selectedPatientInfo?.name || ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Patient ID</span>
                  <span className="font-semibold">{selectedPatientId?.patientId || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-semibold">{selectedPatientInfo?.name || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-semibold">{selectedPatientInfo?.phone || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-semibold">{selectedPatientInfo?.address || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-semibold">{selectedPatientInfo?.dateOfBirth || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Allergies</span>
                  <span className="font-semibold">{selectedPatientInfo?.allergies || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Bill Summary
              </CardHeader>
              <CardDescription>
                Total: {grandTotal.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium">Patient</div>
                  <div className="font-semibold">{selectedPatientInfo?.name || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">{selectedPatientInfo?.patientId || 'N/A'}</div>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium">Bill Date</div>
                  <div className="font-semibold">{selectedBatchDate || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">Bill Period: Present</div>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium">Total Amount</div>
                  <div className="font-bold text-lg">{grandTotal.toFixed(2)}</div>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium">Items</div>
                  <div className="font-semibold">{saleItems.length}</div>
                  <div className="text-sm text-muted-foreground">Total: {saleItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}</div>
                </div>
              </div>

              {selectedPaymentMethod && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCardCheck className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium">Payment Method</div>
                      <div className="text-sm">{selectedPaymentMethod.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Batch: {selectedBatchInfo?.batchNumber}</Badge>
                    <Badge variant="outline">Qty: {selectedBatchInfo?.quantity_available}</Badge>
                    <Badge variant="outline">Rate: {selectedPaymentMethod.rate.toFixed(2)}</Badge>
                    <Badge variant="outline">Amount: {selectedPaymentMethod.amount?.toFixed(2)}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bills.map(batch => (
                  <div key={batch.batch_id} className="border rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Batch: {batch.batch_number}</Badge>
                      <Badge variant="outline" className="text-xs">Qty: {batch.quantity_available}</Badge>
                    </div>
                    <div className="font-medium">Rate: ₹{parseFloat(batch.mrp) || 0}</div>
                    <div className="font-semibold">Amount: ₹{batch.mrp}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Checkbox
                  id="full-payment"
                  checked={true}
                  onCheckedChange={setIsFullPayment}
                />
                <Label htmlFor="full-payment">Mark as full payment</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Selection */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Batch Selection
              </CardHeader>
              <CardDescription>
                Select batch to add to sale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Batch Details */}
              <div className="border rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium">Batch Number</div>
                <div className="text-sm">{selectedBatchInfo?.batchNumber || 'N/A'}</div>
              </div>

              {/* Batch Expiry */}
              <div className="border rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium">Expiry Date</div>
                <div className="flex gap-2">
                  <Popover open={!!selectedBatchDateInput} onOpenChange={() => {
                    setSelectedBatch("batchId");
                    const date = new Date();
                    setSelectedBatchDate(date.toLocaleDateString());
                    setDate(date);
                    setDate(true);
                  }} className="flex-1">
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        {selectedBatchDateInput ? date.toLocaleDateString(selectedBatchDateInput.split('/')) : 'Select Date'}
                        <CalendarIcon className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        captionLayout="dropdown"
                        onSelect={(selectedDate) => {
                          setDate(selectedDate);
                          setSelectedBatchDateInput(selectedDate.toISOString().split('T')[0]);
                          setOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Products */}
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Product</div>
                  <Badge variant="outline" className="text-xs">{products.length}</Badge>
                </div>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {products.map(p => (
                        <SelectItem key={p.product_id} value={p.product_id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Batches */}
              <div className=" {batches.length > 0 ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'grid'} border rounded-lg p-4 space-y-2">
                {bills.map(b => (
                  <div key={b.batch_id} className={selectedBatch === b.batch_id ? 'border-blue-600' : 'border'}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {b.batch_number}
                        <Badge variant="outline" className="text-xs">{b.quantity_available}</Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedBatch(b.batch_id)}>
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add Batch */}
          <Dialog open={showAddBatch} onOpenChange={setShowAddBatch}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Batch</DialogTitle>
                <DialogDescription>
                  Fill in the details and click save to add a new batch.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-4">
                <div className="space-y-1">
                  <Label>Batch Number</Label>
                  <Input
                    type="text"
                    placeholder="Batch Number"
                    value={newBatch.batch_no}
                    onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Rate (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newBatch.purchase_rate}
                    onChange={(e) => setNewBatch({ ...newBatch, purchase_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    min="1"
                    value={newBatch.quantity}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Expiry</Label>
                  <Input
                    type="date"
                    value={newBatch.expiry || ''}
                    onChange={(e) => setNewBatch({ ...newBatch, expiry: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button onClick={handleAddBatch}>Save</ {showAddBatch ? <Minus className="w-4 h-4" /> : ''}>Save</Button>
                <Button variant="outline" onClick={() => setShowAddBatch(false)}>Cancel</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Add Items Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Add Items to Sale
          </CardHeader>
          <CardDescription>
            Enter quantity and sale rate, then add to sale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              disabled={!selectedBatch || !quantity || !saleRate
            >
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sale Items Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {saleItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items added
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="w-24">
                    <Label>Product</Label>
                  </TableCell>
                  <TableCell className="w-32">
                    <Label>Batch</Label>
                  </TableCell>
                  <TableCell className="text-right">
                    <Label>Qty</Label>
                  </TableCell>
                  <TableCell>
                    <Label>Rate</Label>
                  </TableCell>
                  <TableCell className="text-right">
                    <Label>Amount</Label>
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(saleItems.length - 1)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="p-2">
                      <Badge variant="outline">{item.productName}</Badge>
                    </TableCell>
                    <TableCell className="p-2">
                      <Badge variant="outline">{item.batchNumber}</Badge>
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          setSaleItems(prev => prev.map(i => i.batchId === item.batchId ? { ...i, quantity: parseInt(e.target.value) }));
                        }}
                        className="w-20 font-semibold"
                      />
                    </TableCell>
                    <TableCell className="p-2 text-right font-medium">
                      ₹{(parseFloat(item.saleRate).toFixed(2))}
                    </TableCell>
                    <TableCell className="p-2 text-right font-medium">
                      ₹{(parseFloat(item.saleRate) * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(index)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </ <TableBody>
              {saleItems.length > 0 && (
                <TableRow>
                  <TableCell colSpan="4" style={{ fontWeight: 'bold', textAlign: 'right' }}>
                    <span>Total</span>
                  </TableCell>
                  <TableCell colSpan="2" style={{ fontWeight: 'bold', textAlign: 'right' }}>
                    <span>Amount</span>
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan="4" style={{ fontWeight: 'bold', textAlign: 'right' }}>
                  <span>Grand Total:</span>
                </TableCell>
                <TableCell colSpan="2" style={{ fontWeight: 'bold' }}>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </TableCell>
              </TableRow>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 {selectedBatch && batches.length > 0 ? 'grid grid-cols-2 gap-2' : ''}">
            {bills.map(batch => (
              <Badge key={batch.batch_id} variant="outline" className={selectedBatch === batch.batch_id ? 'bg-blue-600' : ''}>
                {batch.batch_number} (Stock: {batch.quantity_available})
              </Badge>
            ))}
            {selectedBatch && batches.length > 0 && (
              <Button
                onClick={() => setSelectedBatch(bills.find(b => b.batch_id === selectedBatch)?.batch_id || 'batchId')}
                className="rounded-full px-6 py-1"
              >
                + Select Batch
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Sale */}
      <div className="flex items-center justify-between mt-8 border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="credit"
            checked={isCredit}
            onCheckedChange={setIsCredit}
          />
          <Label htmlFor="credit">Credit Sale</Label>
        </div>
        <Button onClick={handleSubmitSale} disabled={saleItems.length === 0 || !selectedCustomer}>
          Submit Sale
        </Button>
      </div>
    </div>
  );
}

export default Invoices;
