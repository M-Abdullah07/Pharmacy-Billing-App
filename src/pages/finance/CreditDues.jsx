import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, DollarSign, Phone, MapPin, History } from "lucide-react";
import { PageContainer, PageSection, MessageAlert, LoadingState, EmptyState } from "@/components/PageLayout";

export default function CreditDues() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadCustomersWithDues();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.phone && c.phone.includes(searchTerm))
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const loadCustomersWithDues = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke(
        "get-customers-with-dues"
      );
      setCustomers(result || []);
      setFilteredCustomers(result || []);
    } catch (error) {
      console.error("Error loading customers:", error);
      setMessage({ type: "error", text: "Failed to load customers" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentHistory = async (customerId) => {
    try {
      const result = await window.electron.ipcRenderer.invoke(
        "get-credit-payments",
        customerId
      );
      setPaymentHistory(result || []);
    } catch (error) {
      console.error("Error loading payment history:", error);
    }
  };

  const handleRecordPayment = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount("");
    setPaymentNotes("");
    setShowPaymentDialog(true);
  };

  const handleViewHistory = async (customer) => {
    setSelectedCustomer(customer);
    await loadPaymentHistory(customer.id);
    setShowHistoryDialog(true);
  };

  const submitPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid payment amount" });
      return;
    }

    if (parseFloat(paymentAmount) > selectedCustomer.credit_amount) {
      setMessage({
        type: "error",
        text: "Payment amount cannot exceed credit due",
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke(
        "add-credit-payment",
        {
          customer_id: selectedCustomer.id,
          amount: parseFloat(paymentAmount),
          payment_date: new Date().toISOString().split("T")[0],
          notes: paymentNotes,
        }
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: "Payment recorded successfully!",
        });
        setShowPaymentDialog(false);
        await loadCustomersWithDues();
      } else {
        setMessage({
          type: "error",
          text: "Failed to record payment: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error: " + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const totalDues = filteredCustomers.reduce(
    (sum, c) => sum + (c.credit_amount || 0),
    0
  );

  return (
    <PageContainer
      title="Credit Dues"
      description="Manage customer credit payments and track outstanding balances"
      actions={
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold text-destructive">
            ₹{totalDues.toFixed(2)}
          </p>
        </div>
      }
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Search */}
      <PageSection noPadding>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </PageSection>

      {/* Customers Table */}
      <PageSection
        title={`Customers with Outstanding Credit (${filteredCustomers.length})`}
        noPadding
      >
        {isLoading ? (
          <LoadingState message="Loading customers..." />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={searchTerm ? "No customers found" : "No outstanding credit"}
            description={searchTerm ? "Try adjusting your search criteria" : "All customers have cleared their dues"}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Credit Due</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted-foreground" />
                        {customer.phone || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground" />
                        {customer.area_name || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      ₹{(customer.credit_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(customer)}
                        >
                          <DollarSign size={16} className="mr-1" />
                          Record Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewHistory(customer)}
                        >
                          <History size={16} className="mr-1" />
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a credit payment for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm text-muted-foreground">
                Current Credit Due
              </Label>
              <p className="text-2xl font-bold text-destructive">
                ₹{(selectedCustomer?.credit_amount || 0).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter payment amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Input
                id="payment-notes"
                type="text"
                placeholder="Add any notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            {paymentAmount && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Remaining Due</p>
                <p className="text-xl font-semibold">
                  ₹
                  {(
                    (selectedCustomer?.credit_amount || 0) -
                    parseFloat(paymentAmount || 0)
                  ).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={isLoading}>
              {isLoading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              Payment history for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {paymentHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title="No payment history"
                description="No payments have been recorded for this customer yet"
              />
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">₹{payment.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                      {payment.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
