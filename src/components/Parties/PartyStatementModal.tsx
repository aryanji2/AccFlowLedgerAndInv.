import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Receipt, TrendingDown, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // For better tables in PDF

// --- Interfaces (assuming they are defined as you provided) ---
interface Party {
  id: string;
  firm_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  type: 'customer' | 'supplier';
  debtor_days: number;
  last_payment_date?: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'collection' | 'opening_balance';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
}

interface PartyStatement {
  party: Party;
  transactions: Transaction[];
  summary: {
    opening_balance: number;
    closing_balance: number;
    total_debits: number;
    total_credits: number;
  };
}

interface PartyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
}

export default function PartyStatementModal({ isOpen, onClose, party }: PartyStatementModalProps) {
  const { selectedFirm } = useApp();
  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    if (isOpen && party) {
      fetchPartyStatement();
    }
  }, [isOpen, party, dateRange]);

  const fetchPartyStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!selectedFirm || !party) return;

      // Fetch transactions within the date range, ordered from newest to oldest for backward calculation
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, transaction_date, type, amount, bill_number, payment_method, notes')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .gte('transaction_date', dateRange.from)
        .lte('transaction_date', dateRange.to)
        .order('transaction_date', { ascending: false }) // KEY CHANGE: newest first
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw new Error('Failed to load transaction data.');
      }

      // --- NEW LOGIC: Calculate balance backward from the known closing balance ---
      let runningBalance = party.balance; // Start with the correct closing balance
      let totalDebits = 0;
      let totalCredits = 0;

      const processedTransactions: Transaction[] = transactionsData.map(t => {
        let debit = 0;
        let credit = 0;
        const currentBalance = runningBalance; // The balance *after* this transaction

        if (t.type === 'sale') {
          debit = t.amount;
          totalDebits += debit;
          runningBalance -= debit; // To find the balance *before* this sale, we subtract it
        } else if (t.type === 'collection') {
          credit = t.amount;
          totalCredits += credit;
          runningBalance += credit; // To find balance *before* this collection, we add it back
        }
        
        return {
          id: t.id,
          date: t.transaction_date,
          type: t.type as 'sale' | 'collection',
          description: t.type === 'sale' 
            ? `Sale - Bill #${t.bill_number || 'N/A'}` 
            : `Payment Received (${t.payment_method || 'Other'}) ${t.notes ? `- ${t.notes}` : ''}`,
          debit,
          credit,
          balance: currentBalance,
          reference: t.bill_number || t.notes || '',
        };
      });

      // The final runningBalance is now the opening balance for the period
      const openingBalance = runningBalance;

      // Create a virtual opening balance transaction for display
      const displayTransactions: Transaction[] = [
        {
          id: 'opening-balance',
          date: dateRange.from,
          type: 'opening_balance',
          description: 'Opening Balance',
          debit: 0,
          credit: 0,
          balance: openingBalance,
          reference: '---',
        },
        // Add the processed transactions, and sort them back to ascending for display
        ...processedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      ];
      
      setStatement({
        party,
        transactions: displayTransactions,
        summary: {
          opening_balance: openingBalance,
          closing_balance: party.balance, // Use the correct closing balance
          total_debits: totalDebits,
          total_credits: totalCredits,
        }
      });

    } catch (error) {
      console.error('Error fetching party statement:', error);
      setError(error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  // --- Helper functions for formatting ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };
  
  const getBalanceText = (balance: number) => {
    const formatted = formatCurrency(Math.abs(balance));
    if (balance === 0) return formatCurrency(0);
    // For customers, positive balance means they owe us (DR - Debit)
    return balance > 0 ? `${formatted} DR` : `${formatted} CR`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return 'text-gray-800';
    return balance > 0 ? 'text-red-600' : 'text-green-600';
  };
  
  const exportStatementToPDF = () => {
    if (!statement || !selectedFirm) return;
    // ... (Your PDF export logic can be placed here, it should work with the new statement structure)
    // ... For brevity, this is omitted but your original logic should be fine.
  };

  if (!isOpen) return null;

  // --- JSX for the Modal ---
  // The JSX can remain largely the same. It will now be powered by the reliable `statement` state object.
  // Below is a condensed version.
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header with Party Name and Date Range */}
        <div className="p-6 border-b flex-shrink-0 bg-gray-50">
           {/* ... Header JSX from your original code ... */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
          {error && <div className="text-center p-12 text-red-600"><AlertCircle className="mx-auto w-10 h-10 mb-2"/>{error}</div>}
          
          {statement && !loading && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-100 p-4 rounded-lg"><div className="text-sm text-gray-600">Opening Balance</div><div className={`text-lg font-bold ${getBalanceColor(statement.summary.opening_balance)}`}>{getBalanceText(statement.summary.opening_balance)}</div></div>
                <div className="bg-gray-100 p-4 rounded-lg"><div className="text-sm text-gray-600">Total Debits</div><div className="text-lg font-bold text-red-600">{formatCurrency(statement.summary.total_debits)}</div></div>
                <div className="bg-gray-100 p-4 rounded-lg"><div className="text-sm text-gray-600">Total Credits</div><div className="text-lg font-bold text-green-600">{formatCurrency(statement.summary.total_credits)}</div></div>
                <div className="bg-gray-100 p-4 rounded-lg"><div className="text-sm text-gray-600">Closing Balance</div><div className={`text-lg font-bold ${getBalanceColor(statement.summary.closing_balance)}`}>{getBalanceText(statement.summary.closing_balance)}</div></div>
              </div>

              {/* Transactions Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y">
                    {statement.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-sm">{tx.description}</td>
                        <td className="px-6 py-4 text-sm text-right font-mono">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-right font-mono">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                        <td className={`px-6 py-4 text-sm text-right font-bold ${getBalanceColor(tx.balance)}`}>{getBalanceText(tx.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}