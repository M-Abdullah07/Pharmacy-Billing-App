import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, Input, Label } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Plus, CreditCard, Users, Package, CreditCard, Truck, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

function PatientInfoPage() {
  const [billingDate, setBillingDate] = useState(new Date());
  const [patientInfo, setPatientInfo] = useState({ name: '', email: '', phone: '', address: '', dateOfBirth: '' });
  const [contactInfo, setContactInfo] = useState({ name: '', relationship: '', phone: '', address: '', email: '' });
  const [bills, setBills] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const handleAddBatch = () => {
    if (!selectedProduct || !selectedPaymentMethod) return;
    const batch = {
      batchId: Date.now().toString(),
      batchNumber: 'B' + (bills.length + 1),
      batch_no: '',
      expiry_date: '',
      mrp: '',
      quantity_available: 0,
      purchase_rate: ''
    };
    setBills(prev => [...prev, batch]);
    setSelectedBatch(batch.batchId);
    setSelectedProduct(null);
    setSelectedPaymentMethod(null);
  };

  const handleRemoveBatch = (batchId) => {
    setBills(prev => prev.filter(b => b.batchId !== batchId));
    if (selectedBatch === batchId) setSelectedBatch(null);
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedBatch || !selectedPaymentMethod) return;
    const item = {
      batchId: selectedBatch,
      product: selectedProduct.name,
      batchNumber: selectedBatch,
      productName: selectedProduct.name,
      batchNumber: selectedBatch,
      quantity: 1,
      saleRate: parseFloat(selectedPaymentMethod.rate),
      totalAmount: parseFloat(selectedPaymentMethod.rate)
    };
    setBills(prev => [...prev, item]);
    setSelectedProduct(null);
    setSelectedBatch(null);
    setSelectedPaymentMethod(null);
  };

  const handleRemoveItem = (index) => {
    setBills(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, update) => {
    const newBills = [...bills];
    newBills[index] = { ...newBills[index], ...update };
    setBills(newBills);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Button variant="outline" className="mb-4" onClick={() => { setPatientInfo({}); setContactInfo({}); setBills([]); setPaymentMethods([]); setBillingDate(new Date()); }}>
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Button>

      <div className="flex items-center gap-2 mb-6">
        <Badge>Patient Information</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Details */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Patient Name</Label>
                <div className="flex gap-2">
                  <Input placeholder="Name" value={patientInfo.name} onChange={e => setPatientInfo(prev => ({ ...prev, name: e.target.value }))} />
                  <Select onValueChange={(value) => setPatientId(value)} value={patientId} className="w-32">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Patient ID" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectLabel>
                        {patients.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            Patient {p.id}
                          </SelectItem>
                        ))}
                      </SelectLabel>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Patient ID</Label>
                <Input placeholder="Patient ID" value={patientInfo.id || ''} readOnly />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input placeholder="Email" value={patientInfo.email || ''} readOnly />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Phone</Label>
                <Input placeholder="Phone" value={patientInfo.phone || ''} readOnly />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Date of Birth</Label>
                <Input type="date" value={patientInfo.dateOfBirth || ''} onChange={e => setPatientInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Sex</Label>
                <Select onValueChange={(value) => setGenderInfo(g => ({ ...g, gender: value }))} value={patientInfo.gender || ''}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectLabel>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectLabel>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Address</Label>
              <Input placeholder="Address" value={patientInfo.address || ''} onChange={e => setPatientInfo(prev => ({ ...prev, address: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Medical Condition</Label>
                <Input placeholder="Condition" value={patientInfo.medicalCondition || ''} onChange={e => setPatientInfo(prev => ({ ...prev, medicalCondition: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Allergies</Label>
                <Input placeholder="Allergies" value={patientInfo.allergies || ''} onChange={e => setPatientInfo(prev => ({ ...prev, allergies: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddBatch}>+ Add Batch</Button>
              <Button>Save</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Contact Name</Label>
                <div className="flex gap-2">
                  <Input placeholder="Name" value={contactInfo.name || ''} onChange={e => setContactInfo(prev => ({ ...prev, name: e.target.value }))} />
                  <Select onValueChange={(value) => setContactId(value)} value={contactId} className="w-32">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Contact ID" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectLabel>
                        {contacts.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            Contact {c.id}
                          </SelectItem>
                        ))}
                      </SelectLabel>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Contact ID</Label>
                <Input placeholder="Contact ID" value={contactInfo.id || ''} readOnly />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Relationship</Label>
                <Select onValueChange={(value) => setContactRelationship(value)} value={contactRelationship}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectLabel>
                      <SelectItem value="Doctor">Doctor</SelectItem>
                      <SelectItem value="Nurse">Nurse</SelectItem>
                      <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="Other">
                        Other ({contacts.length + 1})
                      </SelectItem>
                    </SelectLabel>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Phone</Label>
                <Input placeholder="Phone" value={contactInfo.phone || ''} onChange={e => setContactInfo(prev => ({ ...prev, phone: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Address</Label>
                <Input placeholder="Address" value={contactInfo.address || ''} onChange={e => setContactInfo(prev => ({ ...prev, address: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input placeholder="Email" value={contactInfo.email || ''} onChange={e => setContactInfo(prev => ({ ...prev, email: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddBatch}>+ Add Contact</Button>
              <Button>Save</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill Items */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Items</CardTitle>
            <CardDescription>
              Add items to the bill by selecting product, batch, and payment method.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">Product Code</Badge>
                  <Input placeholder="Product Code" value={selectedProduct?.productCode || ''} readOnly />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">Batch</Badge>
                  <Select value={selectedBatch || ''} onValueChange={(value) => setSelectedBatch(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectLabel>
                        {bills.map(b => (
                          <SelectItem key={b.batchId} value={b.batchId}>
                            Batch #{b.batchNumber}
                          </SelectItem>
                        ))}
                      </SelectLabel>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">Rate</Badge>
                  <div className="flex flex-col">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={selectedPaymentMethod?.rate || ''}
                      onChange={e => setPaymentMethod(prev => prev && ({ ...prev, rate: e.target.value }))}
                      readOnly
                    />
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">Qty</Badge>
                  <Input
                    type="number"
                    placeholder="1"
                    min="1"
                    value={selectedItem?.quantity || 1}
                    onChange={e => setItem(prev => prev && ({ ...prev, quantity: e.target.value }))}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">Total</Badge>
                  <span className="font-semibold">₹{(selectedItem?.total || selectedPaymentMethod?.rate).toFixed(2)}</span>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddItem} disabled={!selectedProduct || !selectedBatch}>+ Add Item</Button>
                  <Button>Update</Button>
                  <Button variant="outline">Remove</Button>
                </div>
              </div>
            </div>

            {selectedItem && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    Product: <span className="ml-2">{selectedItem.product}</span>
                  </div>
                  <Button onClick={() => setItems([])} variant="outline" size="sm" className="text-xs">
                    Clear
                  </Button>
                </div>
                <Table className="w-full">
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Quantity</TableCell>
                      <TableCell className="text-right">
                        <div className="text-right">
                          <input
                            type="number"
                            min="1"
                            value={selectedItem.quantity}
                            onChange={e => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1);
                              setItems(prev => prev.map(i => i.batchId === selectedItem.batchId ? { ...i, quantity: qty }));
                            }}
                            className="w-20 font-semibold"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddBatch}>+ Add Batch</Button>
              <Button>Save</Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              Select payment method for this bill.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method, idx) => (
                <div key={method.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {method.type}
                    </div>
                    <Badge variant="outline">{method.amount} ₹</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {method.name}
                  </div>
                  <div className="space-y-2">
                    <Label>Selected Batch:</Label>
                    <Badge variant="outline" className="uppercase text-sm">{method.batchNumber || 'N/A'}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setPaymentMethod(method)}>Select</Button>
                    <Button variant="outline" onClick={() => setPaymentMethods(prev => prev.filter(p => p.id !== method.id))}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                onClick={() => setPaymentMethods(prev => [...prev, { id: Date.now().toString(), type: 'Cash', amount: 0, name: 'Cash', batchNumber: 'N/A' }])}
                variant="outline"
              >
                Add Cash
              </Button>
              <Button
                onClick={() => setPaymentMethods(prev => [...prev, { id: Date.now().toString(), type: 'Check', amount: 0, name: 'Check', batchNumber: 'N/A' }])}
                variant="outline"
              >
                Add Check
              </Button>
              <Button
                onClick={() => setPaymentMethods(prev => [...prev, { id: Date.now().toString(), type: 'Credit Card', amount: 0, name: 'Credit Card', batchNumber: 'N/A' }])}
                variant="outline"
              >
                Add Credit Card
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PatientInfoPage;
