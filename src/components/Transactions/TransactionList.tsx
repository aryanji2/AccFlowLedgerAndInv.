import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../contexts/AppContext';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  party_name: string;
  transaction_date: string;
  type: 'sale' | 'collection';
  amount: number;
  created_by: string;
  status: string;
}

export default function TransactionList() {
  const { selectedFirm } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [staffFilter, setStaffFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchTransactions = async () => {
    if (!selectedFirm) return;
    const { data, error } = await supabase
      .from('transactions')
      .select(`id, amount, transaction_date, type, status, created_by, parties(name)`)
      .eq('firm_id', selectedFirm.id)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      const parsed: Transaction[] = data.map((t) => ({
        id: t.id,
        amount: t.amount,
        transaction_date: t.transaction_date,
        type: t.type,
        status: t.status,
        created_by: t.created_by,
        party_name: t.parties?.name || 'Unknown',
      }));
      setTransactions(parsed);
      setFiltered(parsed);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedFirm]);

  useEffect(() => {
    let filtered = transactions;

    if (staffFilter) {
      filtered = filtered.filter((t) => t.created_by === staffFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter((t) => new Date(t.transaction_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((t) => new Date(t.transaction_date) <= new Date(dateTo));
    }
    if (search.trim()) {
      filtered = filtered.filter((t) =>
        t.party_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(filtered);
  }, [staffFilter, typeFilter, dateFrom, dateTo, search, transactions]);

  const formatRupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

  const exportCSV = () => {
    const headers = ['Date', 'Party', 'Type', 'Amount', 'Status', 'Created By'];
    const rows = filtered.map((t) => [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      t.party_name,
      t.type,
      (t.amount / 100).toFixed(2),
      t.status,
      t.created_by,
    ]);

    const csvContent =
      [headers, ...rows]
        .map((row) => row.map((v) => `"${v}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by party"
          className="border px-3 py-2 rounded w-full"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        >
          <option value="">All Types</option>
          <option value="sale">Sale</option>
          <option value="collection">Collection</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        />
        <input
          type="text"
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          placeholder="Created by (User ID)"
          className="border px-3 py-2 rounded w-full col-span-2"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Party</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Created By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{format(new Date(t.transaction_date), 'dd MMM yyyy')}</td>
                <td className="px-4 py-2">{t.party_name}</td>
                <td className="px-4 py-2 capitalize">{t.type}</td>
                <td className="px-4 py-2 text-right">{formatRupees(t.amount)}</td>
                <td className="px-4 py-2">{t.status}</td>
                <td className="px-4 py-2">{t.created_by}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-4">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
