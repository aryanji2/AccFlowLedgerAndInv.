import React, { useState, useEffect, useCallback } from 'react';
import {
  X, FileText, Calendar, TrendingUp, TrendingDown, Receipt, User, AlertCircle, Clock
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';
import autoTable from 'jspdf-autotable';

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

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type?: string;
  original?: any;
}

interface Party {
  id: string;
  name: string;
}

interface PartyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
}

export default function PartyStatementModal({ isOpen, onClose, party }: PartyStatementModalProps) {
  if (!isOpen || !party?.id) return null;
  
  const { selectedFirm } = useApp();
  const navigate = useNavigate();
  const todayISO = new Date().toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({ from: todayISO, to: todayISO });
  const [statement, setStatement] = useState<{
    transactions: TransactionRow[];
    summary: {
      openingBalance: number;
      totalDr: number;
      totalCr: number;
      closingBalance: number;
    };
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = useCallback(async (range: { from: string; to: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get opening balance
      const { data: openingTxns, error: openingErr } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('type', 'opening_balance')
        .order('transaction_date', { ascending: true })
        .limit(1);
      
      if (openingErr) throw openingErr;

      const openingBalance = openingTxns?.[0]?.amount || 0;
      const openingDate = openingTxns?.[0]?.transaction_date?.split('T')[0] || range.from;

      // Get period transactions
      const { data: txns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'approved')
        .neq('type', 'opening_balance')
        .gte('transaction_date', range.from)
        .lte('transaction_date', range.to)
        .order('transaction_date', { ascending: true });
      
      if (error) throw error;

      // Build statement rows
      let running = openingBalance;
      let totalDr = 0;
      let totalCr = 0;
      
      const rows: TransactionRow[] = [{
        id: 'opening',
        date: openingDate,
        description: 'Opening Balance',
        debit: 0,
        credit: 0,
        balance: running,
        type: 'opening_balance'
      }];

      txns.forEach(t => {
        let dr = 0;
        let cr = 0;
        
        if (t.type === 'sale') {
          dr = t.amount;
          running += dr;
          totalDr += dr;
        } else {
          cr = t.amount;
          running -= cr;
          totalCr += cr;
        }
        
        rows.push({
          id: t.id,
          date: t.transaction_date.split('T')[0],
          description: t.type === 'sale' 
            ? `Sale - ${t.bill_number || 'No Bill'}` 
            : `Payment - ${t.payment_method || 'Unknown'}`,
          debit: dr,
          credit: cr,
          balance: running,
          type: t.type,
          original: t
        });
      });

      setStatement({
        transactions: rows,
        summary: { 
          openingBalance, 
          totalDr, 
          totalCr, 
          closingBalance: running 
        }
      });
    } catch (err) {
      console.error('Failed to load statement:', err);
      setError('Failed to load statement. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [party?.id, selectedFirm?.id]);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchInitialDate = async () => {
      try {
        const { data: firstTxn } = await supabase
          .from('transactions')
          .select('transaction_date')
          .eq('party_id', party.id)
          .eq('firm_id', selectedFirm.id)
          .order('transaction_date', { ascending: true })
          .limit(1)
          .single();

        const fromDate = firstTxn?.transaction_date?.split('T')[0] || todayISO;
        setDateRange({ from: fromDate, to: todayISO });
        fetchStatement({ from: fromDate, to: todayISO });
      } catch (err) {
        setDateRange({ from: todayISO, to: todayISO });
        fetchStatement({ from: todayISO, to: todayISO });
      }
    };

    fetchInitialDate();
  }, [isOpen, party?.id, selectedFirm?.id, fetchStatement]);

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    fetchStatement(newRange);
  };

  const exportPDF = () => {
    if (!statement) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text('Account Statement', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Party: ${party.name}`, 15, 25);
    doc.text(`Period: ${formatDisplayDate(dateRange.from)} - ${formatDisplayDate(dateRange.to)}`, 15, 32);
    
    // Table data
    const tableData = statement.transactions.map(t => [
      formatDisplayDate(t.date),
      t.description,
      t.debit ? formatCurrencyPlain(t.debit) : '-',
      t.credit ? formatCurrencyPlain(t.credit) : '-',
      formatCurrencyPlain(t.balance)
    ]);
    
    // Add summary row
    tableData.push([
      '',
      'SUMMARY',
      formatCurrencyPlain(statement.summary.totalDr),
      formatCurrencyPlain(statement.summary.totalCr),
      formatCurrencyPlain(statement.summary.closingBalance)
    ]);
    
    // Create table
    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)']],
      body: tableData,
      headStyles: { fillColor: [41, 128, 185] },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `Generated on: ${new Date().toLocaleDateString()}`,
          pageWidth - 15,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }
    });
    
    doc.save(`${party.name.replace(/\s+/g, '_')}_statement.pdf`);
  };

  const handleRedirectToDayBook = (transaction: TransactionRow) => {
    if (!transaction.type || transaction.type === 'opening_balance') return;
    
    const formType = transaction.type === 'sale' 
      ? 'edit-sale' 
      : 'edit-collection';
      
    navigate(`/daybook?form=${formType}&id=${transaction.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="text-lg font-semibold">{party.name} - Statement</h3>
          <button onClick={onClose} className="hover:bg-blue-700 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        {/* Date controls */}
        <div className="p-4 bg-gray-50 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs block text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => handleDateChange('from', e.target.value)}
              className="border border-gray-300 p-2 rounded text-sm"
              max={dateRange.to}
            />
          </div>
          <div>
            <label className="text-xs block text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => handleDateChange('to', e.target.value)}
              className="border border-gray-300 p-2 rounded text-sm"
              min={dateRange.from}
              max={todayISO}
            />
          </div>
          <button
            onClick={exportPDF}
            className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FileText size={16} />
            Export PDF
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Clock className="animate-pulse text-blue-500" size={48} />
              <p className="mt-4 text-gray-600">Loading statement...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="text-red-500" size={48} />
              <p className="mt-4 text-red-600">{error}</p>
              <button 
                onClick={() => fetchStatement(dateRange)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-right">Debit (₹)</th>
                    <th className="p-3 text-right">Credit (₹)</th>
                    <th className="p-3 text-right">Balance (₹)</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.map((row) => (
                    <tr 
                      key={row.id} 
                      className={`border-t ${row.type === 'opening_balance' ? 'bg-blue-50' : ''}`}
                    >
                      <td className="p-3">{formatDisplayDate(row.date)}</td>
                      <td className="p-3 max-w-xs truncate">{row.description}</td>
                      <td className="p-3 text-right">
                        {row.debit ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(row.debit)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-right">
                        {row.credit ? (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(row.credit)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="p-3 text-right">
                        {row.type !== 'opening_balance' && (
                          <button
                            onClick={() => handleRedirectToDayBook(row)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {statement && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td className="p-3 font-medium">Summary</td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-medium text-green-600">
                        {formatCurrency(statement.summary.totalDr)}
                      </td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {formatCurrency(statement.summary.totalCr)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(statement.summary.closingBalance)}
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}