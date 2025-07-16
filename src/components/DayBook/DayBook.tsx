import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Plus, FileText, Calendar, Edit, Trash, ArrowLeft, ArrowRight, 
  Search, Filter, RefreshCw, Download, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { format, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Utility functions
const formatDisplayDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'dd MMMM yyyy');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

// Type definitions
interface Transaction {
  id: string;
  transaction_date: string;
  amount: number;
  type: 'sale' | 'collection';
  party_id: string;
  firm_id: string;
  status: string;
  bill_number?: string | null;
  payment_method?: string | null;
  party: {
    name: string;
  } | null;
}

interface Party {
  id: string;
  name: string;
}

export default function Daybook() {
  const { selectedFirm } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'collection'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Fetch parties for dropdown
  const fetchParties = useCallback(async () => {
    if (!selectedFirm?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('id, name')
        .eq('firm_id', selectedFirm.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setParties(data || []);
    } catch (err) {
      console.error('Failed to fetch parties:', err);
    }
  }, [selectedFirm?.id]);

  // Fetch transactions for selected date
  const fetchTransactions = useCallback(async () => {
    if (!selectedFirm?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const startDate = startOfDay(new Date(selectedDate)).toISOString();
      const endDate = endOfDay(new Date(selectedDate)).toISOString();
      
      let query = supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          amount,
          type,
          status,
          bill_number,
          payment_method,
          party_id,
          firm_id,
          parties (name)
        `)
        .eq('firm_id', selectedFirm.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: true });

      // Apply type filter if not 'all'
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTransactions(data as Transaction[] || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedFirm?.id, filterType]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  useEffect(() => {
    if (selectedFirm?.id) {
      fetchTransactions();
    }
  }, [selectedDate, selectedFirm?.id, fetchTransactions]);

  // Navigation between days
  const navigateDays = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  // Sort transactions
  const sortedTransactions = React.useMemo(() => {
    if (!sortConfig) return transactions;
    
    return [...transactions].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [transactions, sortConfig]);

  // Filter transactions based on search
  const filteredTransactions = React.useMemo(() => {
    if (!searchTerm) return sortedTransactions;
    
    const term = searchTerm.toLowerCase();
    return sortedTransactions.filter(txn => 
      txn.party?.name?.toLowerCase().includes(term) ||
      txn.bill_number?.toLowerCase().includes(term) ||
      txn.payment_method?.toLowerCase().includes(term) ||
      txn.amount.toString().includes(term)
    );
  }, [sortedTransactions, searchTerm]);

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Open form for new transaction
  const handleNewTransaction = (type: 'sale' | 'collection') => {
    setCurrentTransaction({
      id: '',
      transaction_date: new Date().toISOString(),
      amount: 0,
      type,
      party_id: '',
      firm_id: selectedFirm?.id || '',
      status: 'approved',
      bill_number: '',
      payment_method: type === 'collection' ? 'cash' : '',
      party: null
    });
    setShowForm(true);
  };

  // Open form for editing transaction
  const handleEditTransaction = (txn: Transaction) => {
    setCurrentTransaction(txn);
    setShowForm(true);
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  // Save transaction (create or update)
  const handleSaveTransaction = async (txn: Transaction) => {
    try {
      let error;
      
      if (txn.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            amount: txn.amount,
            party_id: txn.party_id,
            bill_number: txn.bill_number,
            payment_method: txn.payment_method
          })
          .eq('id', txn.id);
        
        error = updateError;
      } else {
        // Create new
        const { error: createError } = await supabase
          .from('transactions')
          .insert({
            transaction_date: txn.transaction_date,
            amount: txn.amount,
            type: txn.type,
            party_id: txn.party_id,
            firm_id: selectedFirm?.id,
            status: 'approved',
            bill_number: txn.bill_number,
            payment_method: txn.payment_method
          });
        
        error = createError;
      }
      
      if (error) throw error;
      
      setShowForm(false);
      fetchTransactions();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      alert('Failed to save transaction. Please try again.');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text('Daybook Report', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Date: ${formatDisplayDate(selectedDate)}`, 15, 25);
    doc.text(`Firm: ${selectedFirm?.name || 'N/A'}`, 15, 32);
    
    // Prepare table data
    const tableData = filteredTransactions.map(txn => [
      txn.party?.name || 'N/A',
      txn.type === 'sale' ? 'Sale' : 'Collection',
      txn.bill_number || txn.payment_method || 'N/A',
      format(parseISO(txn.transaction_date), 'HH:mm'),
      formatCurrency(txn.amount)
    ]);
    
    // Create table
    autoTable(doc, {
      startY: 40,
      head: [['Party', 'Type', 'Reference', 'Time', 'Amount']],
      body: tableData,
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Generated on: ${new Date().toLocaleString()}`,
          pageWidth - 15,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }
    });
    
    doc.save(`daybook_${selectedDate}.pdf`);
  };

  // Calculate totals
  const calculateTotals = () => {
    return filteredTransactions.reduce((acc, txn) => {
      if (txn.type === 'sale') {
        acc.sales += txn.amount;
      } else {
        acc.collections += txn.amount;
      }
      return acc;
    }, { sales: 0, collections: 0 });
  };

  const totals = calculateTotals();

  // Transaction Form Modal
  const TransactionForm = () => {
    const [formData, setFormData] = useState(currentTransaction || {} as Transaction);
    
    useEffect(() => {
      if (currentTransaction) {
        setFormData(currentTransaction);
      }
    }, [currentTransaction]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSaveTransaction(formData);
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
          <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {formData.id ? 'Edit' : 'New'} {formData.type === 'sale' ? 'Sale' : 'Collection'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party
              </label>
              <select
                name="party_id"
                value={formData.party_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              >
                <option value="">Select Party</option>
                {parties.map(party => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2"
                min="1"
                required
              />
            </div>
            
            {formData.type === 'sale' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Number
                </label>
                <input
                  type="text"
                  name="bill_number"
                  value={formData.bill_number || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="payment_method"
                  value={formData.payment_method || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {formData.id ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Daybook</h1>
              <p className="opacity-90">Daily transaction records</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30 transition-colors"
              >
                <Download size={18} /> Export
              </button>
              <button
                onClick={() => fetchTransactions()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30 disabled:opacity-50"
              >
                <RefreshCw size={18} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDays(-1)}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-md border">
              <Calendar size={18} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => navigateDays(1)}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ArrowRight size={20} />
            </button>
            
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
            >
              Today
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="sale">Sales</option>
                <option value="collection">Collections</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-b flex gap-3">
          <button
            onClick={() => handleNewTransaction('sale')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus size={18} /> New Sale
          </button>
          <button
            onClick={() => handleNewTransaction('collection')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus size={18} /> New Collection
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-gray-600 text-sm font-medium">Total Transactions</h3>
            <p className="text-2xl font-bold">{filteredTransactions.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="text-gray-600 text-sm font-medium">Total Sales</h3>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.sales)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-gray-600 text-sm font-medium">Total Collections</h3>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(totals.collections)}</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="text-red-500 mb-3" size={48} />
              <p className="text-red-600 text-center mb-4">{error}</p>
              <button 
                onClick={() => fetchTransactions()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="text-gray-400 mb-3" size={48} />
              <p className="text-gray-600 mb-4">No transactions found for this day</p>
              <button 
                onClick={() => handleNewTransaction('sale')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={16} /> Create Transaction
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('party')}
                  >
                    <div className="flex items-center">
                      Party
                      {sortConfig?.key === 'party' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp size={14} className="ml-1" /> : 
                          <ChevronDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      Amount
                      {sortConfig?.key === 'amount' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp size={14} className="ml-1" /> : 
                          <ChevronDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {txn.party?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        txn.type === 'sale' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {txn.type === 'sale' ? 'Sale' : 'Collection'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {txn.type === 'sale' ? txn.bill_number : txn.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(txn.transaction_date), 'hh:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditTransaction(txn)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(txn.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showForm && <TransactionForm />}
    </div>
  );
}