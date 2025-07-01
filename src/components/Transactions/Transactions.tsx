import React, { useState, useEffect } from 'react';
import { Receipt, TrendingUp, Search, Filter, Eye, X, Check, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Transaction } from '../../types';
import TransactionModal from './TransactionModal';
import { mockAuth } from '../../lib/mockAuth';

export default function Transactions() {
  const { selectedFirm } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'sale' | 'collection'>('sale');

  useEffect(() => {
    if (selectedFirm) {
      fetchTransactions();
    }
  }, [selectedFirm]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Mock transactions data
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          firm_id: selectedFirm?.id || '',
          party_id: 'party-1',
          type: 'sale',
          amount: 25000,
          status: 'approved',
          bill_number: 'INV-001',
          created_by: 'admin-1',
          created_at: '2024-01-15T05:30:00Z',
          party: { id: 'party-1', firm_id: selectedFirm?.id || '', name: 'ABC Retailers', balance: 25000, type: 'customer', created_at: '' }
        },
        {
          id: '2',
          firm_id: selectedFirm?.id || '',
          party_id: 'party-2',
          type: 'collection',
          amount: 18000,
          status: 'pending',
          payment_method: 'upi',
          created_by: 'accountant-1',
          created_at: '2024-01-14T05:30:00Z',
          party: { id: 'party-2', firm_id: selectedFirm?.id || '', name: 'XYZ Distributors', balance: -15000, type: 'supplier', created_at: '' }
        },
        {
          id: '3',
          firm_id: selectedFirm?.id || '',
          party_id: 'party-3',
          type: 'collection',
          amount: 12500,
          status: 'pending',
          payment_method: 'cheque',
          created_by: 'field-1',
          created_at: '2024-01-13T05:30:00Z',
          party: { id: 'party-3', firm_id: selectedFirm?.id || '', name: 'Quick Mart', balance: 12500, type: 'customer', created_at: '' }
        },
        {
          id: '4',
          firm_id: selectedFirm?.id || '',
          party_id: 'party-4',
          type: 'sale',
          amount: 35000,
          status: 'pending',
          bill_number: 'INV-002',
          created_by: 'field-1',
          created_at: '2024-01-12T05:30:00Z',
          party: { id: 'party-4', firm_id: selectedFirm?.id || '', name: 'Super Store', balance: 35000, type: 'customer', created_at: '' }
        }
      ];

      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (transactionId: string, status: 'approved' | 'rejected') => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTransactions(prev => prev.map(t => 
        t.id === transactionId ? { ...t, status } : t
      ));
      
      console.log(`Transaction ${transactionId} ${status}`);
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  };

  const openModal = (type: 'sale' | 'collection') => {
    setModalType(type);
    setShowModal(true);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.party?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    const matchesType = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale': return <Receipt className="w-4 h-4" />;
      case 'collection': return <TrendingUp className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    approved: transactions.filter(t => t.status === 'approved').length,
    totalValue: transactions.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Transactions</h1>
            <p className="text-blue-100">Manage and approve all business transactions</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => openModal('sale')}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
            >
              <Receipt className="w-4 h-4" />
              <span>Record Sale</span>
            </button>
            <button
              onClick={() => openModal('collection')}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Record Collection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</div>
          <div className="text-sm text-gray-500">Total Value</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales</option>
              <option value="collection">Collections</option>
              <option value="payment">Payments</option>
            </select>
          </div>

          <div className="text-sm text-gray-500">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transactions ({filteredTransactions.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    transaction.type === 'sale' ? 'bg-blue-50' : 'bg-teal-50'
                  }`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900">
                      {transaction.party?.name || 'Unknown Party'}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="capitalize">{transaction.type}</span>
                      {transaction.bill_number && ` - Bill No: ${transaction.bill_number}`}
                      {transaction.payment_method && ` - ${transaction.payment_method.toUpperCase()}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(transaction.created_at).toLocaleDateString()} at{' '}
                      {new Date(transaction.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {transaction.type}
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {transaction.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproval(transaction.id, 'rejected')}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApproval(transaction.id, 'approved')}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2">No transactions found</div>
              <div className="text-sm text-gray-400">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Start by recording your first transaction'
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={modalType}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}