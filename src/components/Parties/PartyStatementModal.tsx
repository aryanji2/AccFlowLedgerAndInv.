// --- START OF PartyStatementModal.tsx ---
import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, TrendingUp, TrendingDown, Receipt, User, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

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

      const { data: txns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .gte('transaction_date', dateRange.from)
        .lte('transaction_date', dateRange.to)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      const { data: prior, error: priorErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .lt('transaction_date', dateRange.from);

      if (priorErr) throw priorErr;

      let openingBalance = 0;
      prior.forEach(t => {
        if (t.type === 'sale') openingBalance += t.amount;
        else if (t.type === 'collection') openingBalance -= t.amount;
      });

      let runningBalance = openingBalance;
      const result = [];

      if (openingBalance !== 0) {
        result.push({
          id: 'ob',
          date: dateRange.from,
          type: 'opening_balance',
          description: 'Opening Balance',
          debit: openingBalance > 0 ? openingBalance : 0,
          credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
          balance: runningBalance,
        });
      }

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

      const totalDebits = result.filter(r => r.type !== 'opening_balance').reduce((sum, r) => sum + r.debit, 0);
      const totalCredits = result.filter(r => r.type !== 'opening_balance').reduce((sum, r) => sum + r.credit, 0);

      setStatement({
        party,
        transactions: result,
        summary: {
          opening_balance: openingBalance,
          closing_balance: runningBalance,
          total_debits: totalDebits,
          total_credits: totalCredits,
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch statement');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!statement) return;

    const doc = new jsPDF();
    const margin = 15;
    let y = margin;

    doc.setFontSize(18);
    doc.text('Account Statement', 105, y, { align: 'center' });

    y += 10;
    doc.setFontSize(12);
    doc.text(selectedFirm?.name || 'Firm', 105, y, { align: 'center' });

    y += 8;
    doc.setFontSize(10);
    doc.text(`From: ${formatDateFull(dateRange.from)} To: ${formatDateFull(dateRange.to)}`, 105, y, { align: 'center' });

    y += 12;
    doc.setFontSize(11);
    doc.text(`Party: ${party.name}`, margin, y);
    y += 6;
    doc.text(`Contact: ${party.contact_person || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`Phone: ${party.phone || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`Email: ${party.email || 'N/A'}`, margin, y);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Opening Balance: ${formatCurrency(statement.summary.opening_balance)}`, margin, y);
    y += 6;
    doc.text(`Closing Balance: ${formatCurrency(statement.summary.closing_balance)}`, margin, y);
    y += 6;
    doc.text(`Total Debits: ${formatCurrency(statement.summary.total_debits)}`, margin, y);
    y += 6;
    doc.text(`Total Credits: ${formatCurrency(statement.summary.total_credits)}`, margin, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', margin, y);
    doc.text('Desc', margin + 35, y);
    doc.text('DR', margin + 100, y);
    doc.text('CR', margin + 120, y);
    doc.text('Bal', margin + 140, y);

    doc.setFont('helvetica', 'normal');
    y += 5;

    statement.transactions.forEach(trx => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }

      doc.text(formatDateFull(trx.date), margin, y);
      doc.text(trx.description.slice(0, 40), margin + 35, y);
      if (trx.debit > 0) doc.text(formatCurrencyPlain(trx.debit), margin + 100, y);
      if (trx.credit > 0) doc.text(formatCurrencyPlain(trx.credit), margin + 120, y);
      doc.text(formatCurrencyPlain(trx.balance), margin + 140, y);
      y += 6;
    });

    doc.save(`${party.name.replace(/\s+/g, '_')}_statement.pdf`);
  };

  if (!isOpen) return null;

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
// --- END OF PartyStatementModal.tsx ---
