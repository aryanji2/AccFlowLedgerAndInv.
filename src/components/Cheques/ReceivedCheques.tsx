import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Filter, Eye, Clock, Check, X, AlertTriangle, Calendar, Download, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Cheque {
  id: string;
  firm_id: string;
  party_id: string;
  party_name: string;
  cheque_number: string;
  amount: number;
  received_date: string;
  due_date: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  bank_name?: string;
  notes?: string;
  cleared_date?: string;
  bounced_date?: string;
  created_by: string;
  created_at: string;
}

export default function ChequeManagement() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');

  useEffect(() => {
    if (selectedFirm) {
      fetchCheques();
    }
  }, [selectedFirm]);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      
      if (!selectedFirm?.id) {
        throw new Error('No firm selected');
      }

      // Fetch cheques from Supabase
      const { data, error } = await supabase
        .from('cheques')
        .select(`
          *,
          parties (
            name
          )
        `)
        .eq('firm_id', selectedFirm.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching cheques:', error);
        // Fallback to mock data
        useMockCheques();
        return;
      }

      // Transform the data to match our interface
      const transformedCheques: Cheque[] = data?.map(cheque => ({
        id: cheque.id,
        firm_id: cheque.firm_id,
        party_id: cheque.party_id,
        party_name: cheque.parties?.name || 'Unknown Party',
        cheque_number: cheque.cheque_number,
        amount: cheque.amount,
        received_date: cheque.received_date,
        due_date: cheque.due_date,
        status: cheque.status,
        bank_name: cheque.bank_name,
        notes: cheque.notes,
        cleared_date: cheque.cleared_date,
        bounced_date: cheque.bounced_date,
        created_by: cheque.created_by,
        created_at: cheque.created_at,
      })) || [];

      setCheques(transformedCheques);
    } catch (error) {
      console.error('Error fetching cheques:', error);
      useMockCheques();
    } finally {
      setLoading(false);
    }
  };

  const useMockCheques = () => {
    // Mock cheques data as fallback
    const mockCheques: Cheque[] = [
      {
        id: 'chq-1',
        firm_id: selectedFirm?.id || '',
        party_id: 'party-1',
        party_name: 'ABC Retailers',
        cheque_number: 'CHQ123456',
        amount: 25000,
        received_date: '2024-01-15',
        due_date: '2024-01-20',
        status: 'pending',
        bank_name: 'HDFC Bank',
        created_by: 'field-1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'chq-2',
        firm_id: selectedFirm?.id || '',
        party_id: 'party-2',
        party_name: 'XYZ Distributors',
        cheque_number: 'CHQ789012',
        amount: 18000,
        received_date: '2024-01-12',
        due_date: '2024-01-18',
        status: 'cleared',
        bank_name: 'SBI',
        cleared_date: '2024-01-18',
        created_by: 'accountant-1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'chq-3',
        firm_id: selectedFirm?.id || '',
        party_id: 'party-3',
        party_name: 'Quick Mart',
        cheque_number: 'CHQ345678',
        amount: 12000,
        received_date: '2024-01-10',
        due_date: '2024-01-25',
        status: 'bounced',
        bank_name: 'ICICI Bank',
        notes: 'Insufficient funds',
        bounced_date: '2024-01-25',
        created_by: 'field-1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'chq-4',
        firm_id: selectedFirm?.id || '',
        party_id: 'party-4',
        party_name: 'Super Store',
        cheque_number: 'CHQ901234',
        amount: 35000,
        received_date: '2024-01-08',
        due_date: '2024-01-22',
        status: 'pending',
        bank_name: 'Axis Bank',
        created_by: 'accountant-1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'chq-5',
        firm_id: selectedFirm?.id || '',
        party_id: 'party-5',
        party_name: 'Tech Solutions',
        cheque_number: 'CHQ567890',
        amount: 8000,
        received_date: '2024-01-05',
        due_date: '2024-01-15',
        status: 'cleared',
        bank_name: 'Kotak Bank',
        cleared_date: '2024-01-15',
        created_by: 'field-1',
        created_at: new Date().toISOString(),
      },
    ];

    setCheques(mockCheques);
  };

  const handleStatusUpdate = async (chequeId: string, newStatus: 'cleared' | 'bounced' | 'cancelled', notes?: string) => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Prepare update data based on status
      const updateData: any = {
        status: newStatus,
        notes: notes || undefined
      };
      
      if (newStatus === 'cleared') {
        updateData.cleared_date = currentDate;
      } else if (newStatus === 'bounced') {
        updateData.bounced_date = currentDate;
      }
      
      // Update in Supabase
      const { error } = await supabase
        .from('cheques')
        .update(updateData)
        .eq('id', chequeId);
        
      if (error) {
        console.error('Error updating cheque status:', error);
        throw error;
      }
      
      // Update local state
      setCheques(prev => prev.map(cheque => 
        cheque.id === chequeId 
          ? { 
              ...cheque, 
              status: newStatus,
              cleared_date: newStatus === 'cleared' ? currentDate : cheque.cleared_date,
              bounced_date: newStatus === 'bounced' ? currentDate : cheque.bounced_date,
              notes: notes || cheque.notes
            } 
          : cheque
      ));
      
      console.log(`Cheque ${chequeId} status updated to ${newStatus}`, { notes });
    } catch (error) {
      console.error('Error updating cheque status:', error);
    }
  };

  const handleClearCheque = (chequeId: string) => {
    if (confirm('Are you sure you want to mark this cheque as cleared?')) {
      handleStatusUpdate(chequeId, 'cleared');
    }
  };

  const handleBounceCheque = (chequeId: string) => {
    const reason = prompt('Please enter the reason for bouncing this cheque:');
    if (reason !== null) {
      handleStatusUpdate(chequeId, 'bounced', reason);
    }
  };

  const filteredCheques = cheques.filter((cheque) => {
    const matchesSearch = cheque.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cheque.cheque_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cheque.status === filterStatus;
    
    let matchesDateRange = true;
    const today = new Date();
    const dueDate = new Date(cheque.due_date);
    
    if (filterDateRange === 'overdue') {
      matchesDateRange = dueDate < today && cheque.status === 'pending';
    } else if (filterDateRange === 'due_today') {
      matchesDateRange = dueDate.toDateString() === today.toDateString() && cheque.status === 'pending';
    } else if (filterDateRange === 'due_week') {
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      matchesDateRange = dueDate <= weekFromNow && dueDate >= today && cheque.status === 'pending';
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
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
      case 'cleared': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'bounced': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'bounced': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status === 'pending';
  };
  const canManageCheques = userProfile?.role === 'admin';

  const stats = {
    total: cheques.length,
    pending: cheques.filter(c => c.status === 'pending').length,
    overdue: cheques.filter(c => isOverdue(c.due_date, c.status)).length,
    cleared: cheques.filter(c => c.status === 'cleared').length,
    bounced: cheques.filter(c => c.status === 'bounced').length,
    totalAmount: cheques.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-500 to-blue-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Cheque Management</h1>
            <p className="text-green-100">Manage and process all cheque collections</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-green-100">Pending Amount</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-sm text-gray-500">Overdue</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-xl font-bold text-green-600">{stats.cleared}</div>
          <div className="text-sm text-gray-500">Cleared</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-xl font-bold text-red-600">{stats.bounced}</div>
          <div className="text-sm text-gray-500">Bounced</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-xl font-bold text-blue-600">
            {cheques.filter(c => new Date(c.due_date).toDateString() === new Date().toDateString() && c.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-500">Due Today</div>
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
                placeholder="Search by party, cheque number, or status"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="overdue">Overdue</option>
              <option value="due_today">Due Today</option>
              <option value="due_week">Due This Week</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              Showing {filteredCheques.length} of {cheques.length} cheques
            </div>
            <div className="text-sm font-medium text-gray-900">
              Total filtered amount: {formatCurrency(filteredCheques.reduce((sum, c) => sum + c.amount, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Cheques List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Cheques ({filteredCheques.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredCheques.map((cheque) => (
            <div 
              key={cheque.id} 
              className={`p-6 hover:bg-gray-50 transition-colors ${
                isOverdue(cheque.due_date, cheque.status) ? 'border-l-4 border-red-500 bg-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{cheque.party_name}</h4>
                      {isOverdue(cheque.due_date, cheque.status) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Cheque No:</span> {cheque.cheque_number}
                      </div>
                      <div>
                        <span className="font-medium">Received:</span> {new Date(cheque.received_date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Due Date:</span> {new Date(cheque.due_date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Bank:</span> {cheque.bank_name || 'Not specified'}
                      </div>
                    </div>
                    
                    {cheque.notes && (
                      <div className="text-xs text-gray-400 mt-1">
                        Notes: {cheque.notes}
                      </div>
                    )}
                    
                    {cheque.cleared_date && (
                      <div className="text-xs text-green-600 mt-1">
                        Cleared on: {new Date(cheque.cleared_date).toLocaleDateString()}
                      </div>
                    )}
                    
                    {cheque.bounced_date && (
                      <div className="text-xs text-red-600 mt-1">
                        Bounced on: {new Date(cheque.bounced_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(cheque.amount)}
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(cheque.status)}`}>
                      {getStatusIcon(cheque.status)}
                      <span className="ml-1 capitalize">{cheque.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {cheque.status === 'pending' && canManageCheques && (
                      <>
                        <button
                          onClick={() => handleBounceCheque(cheque.id)}
                          className="flex items-center space-x-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Bounce</span>
                        </button>
                        <button
                          onClick={() => handleClearCheque(cheque.id)}
                          className="flex items-center space-x-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredCheques.length === 0 && (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2">No cheques found</div>
              <div className="text-sm text-gray-400">
                {searchTerm || filterStatus !== 'all' || filterDateRange !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Cheques will appear here when collections are made via cheque'
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}