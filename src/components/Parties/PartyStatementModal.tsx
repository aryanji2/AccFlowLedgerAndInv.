import React, { useState, useEffect } from 'react';
import {
  X, FileText, Calendar, TrendingUp, TrendingDown, Receipt, User, AlertCircle, Clock
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'long' }).toLowerCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
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
  if (!isOpen || !party?.id) return null;
  const { selectedFirm } = useApp();
  const navigate = useNavigate();

  const todayISO = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: todayISO, to: todayISO });
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1️⃣ When the modal opens, get the earliest txn date, then fetch statement
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const { data: firstTxn, error: firstErr } = await supabase
          .from('transactions')
          .select('transaction_date')
          .eq('party_id', party.id)
          .eq('firm_id', selectedFirm.id)
          .order('transaction_date', { ascending: true })
          .limit(1)
          .single();
        const fromDate = firstErr || !firstTxn?.transaction_date
          ? todayISO
          : firstTxn.transaction_date.split('T')[0];
        setDateRange({ from: fromDate, to: todayISO });
      } catch {
        setDateRange({ from: todayISO, to: todayISO });
      }
    })();
  }, [isOpen, party.id, selectedFirm.id]);

  // 2️⃣ Whenever dateRange changes (after initial), fetch statement
  useEffect(() => {
    if (!isOpen) return;
    fetchStatement();
  }, [dateRange]);

  const fetchStatement = async () => {
    setLoading(true);
    setError(null);
    try {
      // Opening balance
      const { data: openingTxns, error: openingErr } = await supabase
        .from('transactions')
        .select('amount,transaction_date')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('type', 'opening_balance')
        .order('transaction_date', { ascending: true })
        .limit(1);
      if (openingErr) throw openingErr;
      const openingBalance = openingTxns?.[0]?.amount || 0;
      const openingDate = openingTxns?.[0]?.transaction_date?.split('T')[0] || dateRange.from;

      // Period transactions
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

      // Build rows & totals
      let running = openingBalance;
      let totalDr = 0, totalCr = 0;
      const rows = [{
        id: 'opening',
        date: openingDate,
        description: 'Opening Balance',
        debit: 0, credit: 0,
        balance: running
      }];

      txns.forEach(t => {
        let dr = 0, cr = 0;
        if (t.type === 'sale') { dr = t.amount; running += dr; totalDr += dr; }
        else               { cr = t.amount; running -= cr; totalCr += cr; }
        rows.push({
          id: t.id,
          date: t.transaction_date.split('T')[0],
          description: t.type === 'sale'
            ? `Sale - ${t.bill_number || 'No Bill'}`
            : `Payment - ${t.payment_method || 'Unknown'}`,
          debit: dr, credit: cr, balance: running
        });
      });

      setStatement({
        transactions: rows,
        summary: { openingBalance, totalDr, totalCr, closingBalance: running }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load statement.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!statement) return;
    const doc = new jsPDF();
    const m = 15;
    let y = m;
    doc.setFontSize(18);
    doc.text('Account Statement', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.text(
      `Party: ${party.name}`,
      m, y
    );
    y += 6;
    doc.text(
      `Period: ${formatDisplayDate(dateRange.from)} — ${formatDisplayDate(dateRange.to)}`,
      m, y
    );
    y += 10;
    doc.setFont('helvetica', 'bold').text('Date', m, y);
    doc.text('Desc', m + 40, y);
    doc.text('DR', m + 100, y);
    doc.text('CR', m + 120, y);
    doc.text('Bal', m + 140, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    statement.transactions.forEach(r => {
      if (y > 280) { doc.addPage(); y = m; }
      doc.text(formatDisplayDate(r.date), m, y);
      doc.text(r.description.slice(0, 30), m + 40, y);
      if (r.debit)  doc.text(formatCurrencyPlain(r.debit), m + 100, y);
      if (r.credit) doc.text(formatCurrencyPlain(r.credit), m + 120, y);
      doc.text(formatCurrencyPlain(r.balance), m + 140, y);
      y += 6;
    });
    doc.save(`${party.name.replace(/\s+/g,'_')}_statement.pdf`);
  };

  const handleRedirectToDayBook = (transactionDate) => {
    console.log(`Redirecting to Day Book for date: ${transactionDate}`); // Debug log
    navigate(`/daybook?date=${transactionDate}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="text-lg">{party.name} - Statement</h3>
          <button onClick={onClose}><X /></button>
        </div>

        {/* Date controls */}
        <div className="p-4 bg-gray-50 flex space-x-4">
          <div>
            <label className="text-xs block">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
              className="border p-1 rounded"
            />
          </div>
          <div>
            <label className="text-xs block">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
              className="border p-1 rounded"
            />
          </div>
          <button
            onClick={exportPDF}
            className="ml-auto bg-blue-600 text-white px-3 py-1 rounded"
          >
            Export PDF
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading
            ? <div>Loading…</div>
            : error
              ? <div className="text-red-600">{error}</div>
              : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">Debit</th>
                      <th className="p-2 text-right">Credit</th>
                      <th className="p-2 text-right">Balance</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{formatDisplayDate(r.date)}</td>
                        <td className="p-2">{r.description}</td>
                        <td className="p-2 text-right">{r.debit ? formatCurrency(r.debit) : ''}</td>
                        <td className="p-2 text-right">{r.credit ? formatCurrency(r.credit) : ''}</td>
                        <td className="p-2 text-right">{formatCurrency(r.balance)}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleRedirectToDayBook(r.date)}
                            className="bg-blue-600 text-white px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      </div>
    </div>
  );
}
