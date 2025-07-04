// --- START OF UPDATED PartyStatementModal.tsx ---
import React, { useState, useEffect } from 'react';
import {
  X, FileText, Download, Calendar, TrendingUp, TrendingDown, Receipt, User, AlertCircle, Clock
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

function formatCurrency(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

function formatDateFull(dateStr: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  };
  return new Date(dateStr).toLocaleDateString('en-IN', options);
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

      // ✅ Get opening_balance directly from parties table
      const { data: partyWithOpeningBalance, error: partyErr } = await supabase
        .from('parties')
        .select('opening_balance')
        .eq('id', party.id)
        .single();

      if (partyErr) throw partyErr;

      const openingBalance = partyWithOpeningBalance?.opening_balance ?? 0;
      const openingDate = dateRange.from;

      // ✅ Fetch approved transactions within date range
      const { data: txns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .neq('type', 'opening_balance')
        .gte('transaction_date', dateRange.from)
        .lte('transaction_date', dateRange.to)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // ✅ Calculate totals and balances
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
        date: openingDate,
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
          reference: t.bill_number,
          payment_method: t.payment_method,
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
      setError('Failed to fetch statement. Please check console.');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${party.name} - Account Statement`, 10, 10);
    let y = 20;
    statement.transactions.forEach(t => {
      const line = `${formatDateFull(t.date)} | ${t.description} | Debit: ${t.debit} | Credit: ${t.credit} | Bal: ${t.balance}`;
      doc.text(line, 10, y);
      y += 8;
    });
    doc.save(`${party.name}_statement.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
          <div className="text-lg font-semibold">{party.name} - Account Statement</div>
          <div className="flex space-x-2">
            <button onClick={exportToPDF} className="bg-white text-blue-700 px-3 py-1 rounded">Export PDF</button>
            <button onClick={onClose}><X /></button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex gap-4">
          <div>
            <label className="text-xs text-gray-600 block">From</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="text-sm px-2 py-1 border rounded" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block">To</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="text-sm px-2 py-1 border rounded" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
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
// --- END OF UPDATED PartyStatementModal.tsx ---
