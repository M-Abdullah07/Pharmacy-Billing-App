import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Search, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { PageContainer, PageSection, MessageAlert, LoadingState, EmptyState } from '@/components/PageLayout';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: '', amount: '', description: '', expense_date: new Date() });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('get-expenses');
      setExpenses(result || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setMessage({ type: 'error', text: 'Failed to load expenses' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.expense_date) {
      setMessage({ type: 'error', text: 'Category, amount, and date are required' });
      return;
    }

    try {
      setIsLoading(true);

      const expenseData = {
        category: form.category.trim(),
        amount: parseFloat(form.amount),
        description: form.description.trim() || '',
        expense_date: format(form.expense_date, 'yyyy-MM-dd')
      };

      if (editId !== null) {
        // Update existing expense
        const result = await window.electron.ipcRenderer.invoke('update-expense', editId, expenseData);

        if (result.success) {
          setMessage({ type: 'success', text: 'Expense updated successfully!' });
          await loadExpenses();
        } else {
          setMessage({ type: 'error', text: 'Failed to update: ' + (result.error || 'Unknown error') });
        }
      } else {
        // Add new expense
        const result = await window.electron.ipcRenderer.invoke('add-expense', expenseData);

        if (result.success) {
          setMessage({ type: 'success', text: 'Expense added successfully!' });
          await loadExpenses();
        } else {
          setMessage({ type: 'error', text: 'Failed to add: ' + (result.error || 'Unknown error') });
        }
      }

      setForm({ category: '', amount: '', description: '', expense_date: new Date() });
      setEditId(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (expense) => {
    setForm({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || '',
      expense_date: new Date(expense.expense_date)
    });
    setEditId(expense.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;

    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('delete-expense', id);

      if (result.success) {
        setMessage({ type: 'success', text: 'Expense deleted successfully!' });
        await loadExpenses();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete: ' + (result.error || 'Unknown error') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(e =>
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <PageContainer
      title="Expense Tracker"
      description="Track and manage business expenses"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Add/Edit Form */}
      <PageSection
        title={editId ? 'Edit Expense' : 'Add New Expense'}
        description="Record business expenses"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g., Rent, Utilities, Salaries"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Expense Date *</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.expense_date ? format(form.expense_date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.expense_date}
                  onSelect={(date) => {
                    setForm(prev => ({ ...prev, expense_date: date }));
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={isLoading} className="flex-1 md:flex-initial">
              {isLoading ? 'Saving...' : editId ? 'Update Expense' : 'Add Expense'}
            </Button>
            {editId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditId(null);
                  setForm({ category: '', amount: '', description: '', expense_date: new Date() });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </PageSection>

      {/* Expenses List */}
      <PageSection
        title={`Expenses (${filteredExpenses.length})`}
        description={`Total: Rs. ${totalExpenses.toFixed(2)}`}
        noPadding
      >
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search by category or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading expenses..." />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={search ? "No expenses found" : "No expenses yet"}
            description={search ? "Try adjusting your search criteria" : "Add your first expense using the form above"}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.category}</TableCell>
                    <TableCell>Rs. {parseFloat(expense.amount).toFixed(2)}</TableCell>
                    <TableCell>{expense.description || 'N/A'}</TableCell>
                    <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(expense.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)} className="text-destructive hover:text-destructive">
                          <Trash2 size={16} />
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
    </PageContainer>
  );
}
