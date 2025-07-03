import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, TrendingDown, Receipt, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

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
  payment_method?: string;
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

      // Transactions within the date range
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm?.id)
        .eq('status', 'approved')
        .gte('transaction_date', dateRange.from)
        .lte('transaction_date', dateRange.to)
        .order('transaction_date', { ascending: true });

      if (txError) throw txError;

      // Transactions before the date range for opening balance
      const { data: priorTxs, error: priorError } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm?.id)
        .eq('status', 'approved')
        .lt('transaction_date', dateRange.from);

      if (priorError) throw priorError;

      let openingBalance = 0;
      for (const tx of priorTxs || []) {
        if (tx.type === 'sale') openingBalance += tx.amount;
        else if (tx.type === 'collection') openingBalance -= tx.amount;
      }

      const transactions: Transaction[] = [];

      if (openingBalance !== 0) {
        transactions.push({
          id: 'opening-balance',
          date: dateRange.from,
          type: 'opening_balance',
          description: 'Opening Balance',
          debit: openingBalance > 0 ? openingBalance : 0,
          credit: openingBalance < 0 ? -openingBalance : 0,
          balance: openingBalance,
          reference: 'OB',
        });
      }

      let runningBalance = openingBalance;
      for (const tx of transactionsData || []) {
        if (tx.type === 'sale') {
          runningBalance += tx.amount;
          transactions.push({
            id: tx.id,
            date: tx.transaction_date,
            type: 'sale',
            description: `Sale - ${tx.bill_number || 'No Bill'}`,
            debit: tx.amount,
            credit: 0,
            balance: runningBalance,
            reference: tx.bill_number,
            payment_method: tx.payment_method,
          });
        } else if (tx.type === 'collection') {
          runningBalance -= tx.amount;
          transactions.push({
            id: tx.id,
            date: tx.transaction_date,
            type: 'collection',
            description: `Payment - ${tx.payment_method || 'Unknown'}${tx.notes ? ` - ${tx.notes}` : ''}`,
            debit: 0,
            credit: tx.amount,
            balance: runningBalance,
            reference: tx.bill_number,
            payment_method: tx.payment_method,
          });
        }
      }

      const totalDebits = transactions
        .filter(t => t.type !== 'opening_balance')
        .reduce((sum, t) => sum + t.debit, 0);
      const totalCredits = transactions
        .filter(t => t.type !== 'opening_balance')
        .reduce((sum, t) => sum + t.credit, 0);

      setStatement({
        party,
        transactions,
        summary: {
          opening_balance: openingBalance,
          closing_balance: runningBalance,
          total_debits: totalDebits,
          total_credits: totalCredits,
        },
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load statement.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

  const getBalanceText = (bal: number) =>
    bal >= 0 ? `${formatCurrency(bal)} DR` : `${formatCurrency(-bal)} CR`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 flex justify-between items-center border-b bg-blue-600 text-white">
          <h2 className="text-lg font-semibold">{party.name} Statement</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : statement ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                <div><strong>Opening Balance:</strong> {getBalanceText(statement.summary.opening_balance)}</div>
                <div><strong>Closing Balance:</strong> {getBalanceText(statement.summary.closing_balance)}</div>
                <div><strong>Total Sales:</strong> {formatCurrency(statement.summary.total_debits)}</div>
                <div><strong>Total Collections:</strong> {formatCurrency(statement.summary.total_credits)}</div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">Debit</th>
                      <th className="p-2 text-right">Credit</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="p-2">{t.description}</td>
                        <td className="p-2 text-right text-red-600">{t.debit ? formatCurrency(t.debit) : '-'}</td>
                        <td className="p-2 text-right text-green-600">{t.credit ? formatCurrency(t.credit) : '-'}</td>
                        <td className={`p-2 text-right font-semibold ${t.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {getBalanceText(t.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}