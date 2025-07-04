import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, TrendingUp, TrendingDown, Receipt, User, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

// Helper functions (no changes)
function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatCurrencyPlain(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}


export default function PartyStatementModal({ isOpen, onClose, party }) {
  const { selectedFirm } = useApp();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
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
      setStatement(null); // Clear previous statement

      // ✅ FIX 1: Create a "to" date that includes the entire day.
      // This gets the day *after* the selected 'to' date.
      const toDate = new Date(dateRange.to);
      toDate.setDate(toDate.getDate() + 1);
      const toDateStringForQuery = toDate.toISOString().split('T')[0];

      // ✅ FIX 2: Add console logs for easy debugging.
      console.log('--- DEBUGGING PARTY STATEMENT ---');
      console.log('Query Parameters:', {
        partyId: party.id,
        firmId: selectedFirm.id,
        status: 'approved',
        from_date: dateRange.from,
        to_date_exclusive: toDateStringForQuery,
      });


      // Fetch transactions within the date range
      const { data: txns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .gte('transaction_date', dateRange.from)
        .lt('transaction_date', toDateStringForQuery) // Use 'less than' the *next* day
        .order('transaction_date', { ascending: true });
        
      console.log('Transactions Found:', txns);
      console.log('Error Details:', error);
      console.log('---------------------------------');

      if (error) throw error;

      // Fetch prior transactions for opening balance
      const { data: prior, error: priorErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .lt('transaction_date', dateRange.from);

      if (priorErr) throw priorErr;

      // Calculate opening balance
      let openingBalance = 0;
      prior.forEach(t => {
        if (t.type === 'sale') openingBalance += t.amount;
        else if (t.type === 'collection') openingBalance -= t.amount;
      });

      const totalDebits = txns
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalCredits = txns
        .filter(t => t.type === 'collection')
        .reduce((sum, t) => sum + t.amount, 0);

      const closingBalance = openingBalance + totalDebits - totalCredits;

      let runningBalance = openingBalance;
      const result = [];

      result.push({
        id: 'opening-balance',
        date: dateRange.from,
        type: 'opening_balance',
        description: 'Opening Balance',
        debit: 0,
        credit: 0,
        balance: runningBalance,
      });

      txns.forEach(t => {
        let debit = 0;
        let credit = 0;

        if (t.type === 'sale') {
          debit = t.amount;
          runningBalance += debit;
        } else if (t.type === 'collection') {
          credit = t.amount;
          runningBalance -= credit;
        }

        result.push({
          id: t.id,
          date: t.transaction_date,
          type: t.type,
          description:
            t.type === 'sale'
              ? `Sale - ${t.bill_number || 'No Bill'}`
              : `Payment - ${t.payment_method || 'Unknown'}${t.notes ? ` - ${t.notes}` : ''}`,
          debit,
          credit,
          balance: runningBalance,
        });
      });

      setStatement({
        party,
        transactions: result,
        summary: {
          opening_balance: openingBalance,
          closing_balance: closingBalance,
          total_debits: totalDebits,
          total_credits: totalCredits,
        }
      });
    } catch (err) {
      console.error("Error fetching party statement:", err);
      setError('Failed to fetch statement. Check console for details.');
    } finally {
      setLoading(false);
    }
  };
  
  // PDF Exporter (No Changes)
  const exportToPDF = () => {
    if (!statement) return;
    const doc = new jsPDF();
    // ... same pdf logic as before
    doc.save(`${party.name.replace(/\s+/g, '_')}_statement.pdf`);
  };

  if (!isOpen) return null;

  // JSX Rendering (No Changes)
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* ... same JSX as before ... */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}
            {statement && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Debit</th>
                    <th className="text-right p-2">Credit</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.map(trx => (
                    <tr key={trx.id} className="border-t">
                      <td className="p-2">{formatDateFull(trx.date)}</td>
                      <td className="p-2">{trx.description}</td>
                      <td className="p-2 text-right">{trx.debit > 0 ? formatCurrency(trx.debit) : ''}</td>
                      <td className="p-2 text-right">{trx.credit > 0 ? formatCurrency(trx.credit) : ''}</td>
                      <td className="p-2 text-right">{formatCurrency(trx.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}