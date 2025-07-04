import React, { useState, useEffect } from 'react';
import {
  X, FileText, Calendar, jsPDF // trimmed imports for brevity
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export default function PartyStatementModal({ isOpen, onClose, party }) {
  if (!isOpen || !party?.id) return null;

  const { selectedFirm } = useApp();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // We'll set from = first txn date, to = today
  const todayISO = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    from: todayISO,
    to: todayISO,
  });

  // 1️⃣ On open: fetch earliest txn date, then fetch statement
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        // Get earliest transaction_date
        const { data: firstTx, error: firstErr } = await supabase
          .from('transactions')
          .select('transaction_date')
          .eq('party_id', party.id)
          .eq('firm_id', selectedFirm.id)
          .order('transaction_date', { ascending: true })
          .limit(1)
          .single();

        if (firstErr) throw firstErr;

        const firstDate = firstTx?.transaction_date?.split('T')[0] || todayISO;
        setDateRange({ from: firstDate, to: todayISO });
      } catch (err) {
        console.error('Error fetching first transaction date:', err);
        setDateRange({ from: todayISO, to: todayISO });
      }

      // Now fetch the statement over that range
      fetchStatement();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, party?.id]);

  // 2️⃣ If user manually changes dates, refetch
  useEffect(() => {
    if (!isOpen) return;
    fetchStatement();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to]);

  const fetchStatement = async () => {
    setLoading(true);
    setError(null);
    try {
      // Opening balance
      const { data: openingTxns } = await supabase
        .from('transactions')
        .select('amount,transaction_date')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('type', 'opening_balance')
        .order('transaction_date', { ascending: true })
        .limit(1);
      const openingBalance = openingTxns?.[0]?.amount || 0;
      const openingDate = openingTxns?.[0]?.transaction_date?.split('T')[0] || dateRange.from;

      // Period transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .neq('type', 'opening_balance')
        .gte('transaction_date', dateRange.from)
        .lte('transaction_date', dateRange.to)
        .order('transaction_date', { ascending: true });

      // Build summary, running balance
      let running = openingBalance;
      const rows = [{
        id: 'opening',
        date: openingDate,
        description: 'Opening Balance',
        debit: 0, credit: 0,
        balance: running,
      }];

      let totalDr = 0, totalCr = 0;
      txns.forEach(t => {
        let dr = 0, cr = 0;
        if (t.type === 'sale') { dr = t.amount; running += dr; totalDr += dr; }
        else { cr = t.amount; running -= cr; totalCr += cr; }
        rows.push({
          id: t.id,
          date: t.transaction_date.split('T')[0],
          description: t.type === 'sale'
            ? `Sale - ${t.bill_number||'No Bill'}`
            : `Payment - ${t.payment_method||'Unknown'}`,
          debit: dr, credit: cr, balance: running
        });
      });

      setStatement({
        transactions: rows,
        summary: { openingBalance, totalDr, totalCr, closingBalance: running }
      });
    } catch (err) {
      console.error('Error fetching statement:', err);
      setError('Failed to load statement');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!statement) return;
    const doc = new jsPDF();
    // … same PDF logic …
    doc.save(`${party.name}_statement.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between">
          <h3>{party.name} - Statement</h3>
          <button onClick={onClose}><X /></button>
        </div>

        {/* Date filters */}
        <div className="p-4 bg-gray-50 flex space-x-4">
          <div>
            <label className="text-xs">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              className="border p-1 rounded"
            />
          </div>
          <div>
            <label className="text-xs">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              className="border p-1 rounded"
            />
          </div>
          <button onClick={exportPDF} className="ml-auto bg-blue-500 text-white px-3 py-1 rounded">
            Export PDF
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 p-4">
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
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{r.date}</td>
                        <td className="p-2">{r.description}</td>
                        <td className="p-2 text-right">{r.debit ? formatCurrency(r.debit) : ''}</td>
                        <td className="p-2 text-right">{r.credit ? formatCurrency(r.credit) : ''}</td>
                        <td className="p-2 text-right">{formatCurrency(r.balance)}</td>
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
