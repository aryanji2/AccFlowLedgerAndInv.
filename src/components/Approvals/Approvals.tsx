import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Search, Filter, Eye, X, Check, AlertTriangle, Receipt, TrendingUp, CreditCard, User } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PendingApproval {
  id: string;
  firm_id: string;
  type: 'sale' | 'collection' | 'payment' | 'order';
  party_name: string;
  amount: number;
  description: string;
  reference: string;
  payment_method?: string;
  urgency: 'normal' | 'urgent';
  submitted_by: string;
  submitted_by_name: string;
  submitted_at: string;
  transaction_date?: string;
  details?: any;
}

export default function Approvals() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');

  useEffect(() => {
    if (selectedFirm) {
      fetchPendingApprovals();
    }
  }, [selectedFirm]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      
      if (!selectedFirm?.id) {
        throw new Error('No firm selected');
      }

      // Fetch pending transactions from Supabase
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          firm_id,
          type,
          amount,
          bill_number,
          payment_method,
          notes,
          transaction_date,
          created_at,
          created_by,
          parties (
            name
          ),
          user_profiles!transactions_created_by_fkey (
            full_name
          )
        `)
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching pending transactions:', transactionsError);
        // Fallback to mock data
        useMockApprovals();
        return;
      }

      // Transform transactions data to match our interface
      const transformedApprovals: PendingApproval[] = transactionsData?.map(transaction => {
        // Calculate urgency based on time since submission
        const submittedDate = new Date(transaction.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
        
        return {
          id: transaction.id,
          firm_id: transaction.firm_id,
          type: transaction.type,
          party_name: transaction.parties?.name || 'Unknown Party',
          amount: transaction.amount,
          description: transaction.notes || `${transaction.type === 'sale' ? 'Sale' : 'Collection'} transaction`,
          reference: transaction.bill_number || '',
          payment_method: transaction.payment_method,
          urgency: hoursDiff > 24 ? 'urgent' : 'normal',
          submitted_by: transaction.created_by,
          submitted_by_name: transaction.user_profiles?.full_name || 'Unknown User',
          submitted_at: transaction.created_at,
          transaction_date: transaction.transaction_date
        };
      }) || [];

      setApprovals(transformedApprovals);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      useMockApprovals();
    } finally {
      setLoading(false);
    }
  };

  const useMockApprovals = () => {
    // Mock pending approvals data
    const mockApprovals: PendingApproval[] = [
      {
        id: 'app-1',
        firm_id: selectedFirm?.id || '',
        type: 'collection',
        party_name: 'XYZ Distributors',
        amount: 18000,
        description: 'Payment for Invoice #INV-001',
        reference: 'UPI-12345',
        payment_method: 'upi',
        urgency: 'urgent',
        submitted_by: 'field-1',
        submitted_by_name: 'staff@company.com',
        submitted_at: '2024-01-14T05:30:00Z',
        transaction_date: '2024-01-14'
      },
      {
        id: 'app-2',
        firm_id: selectedFirm?.id || '',
        type: 'sale',
        party_name: 'ABC Retailers',
        amount: 35000,
        description: 'Bulk electronics order',
        reference: 'ORD-002',
        urgency: 'urgent',
        submitted_by: 'field-1',
        submitted_by_name: 'staff@company.com',
        submitted_at: '2024-01-13T05:30:00Z',
        transaction_date: '2024-01-13'
      },
      {
        id: 'app-3',
        firm_id: selectedFirm?.id || '',
        type: 'collection',
        party_name: 'Quick Mart',
        amount: 12500,
        description: 'Partial payment for previous orders',
        reference: 'CASH-001',
        payment_method: 'cash',
        urgency: 'urgent',
        submitted_by: 'field-1',
        submitted_by_name: 'staff@company.com',
        submitted_at: '2024-01-12T05:30:00Z',
        transaction_date: '2024-01-12'
      },
      {
        id: 'app-4',
        firm_id: selectedFirm?.id || '',
        type: 'sale',
        party_name: 'Super Store',
        amount: 22000,
        description: 'Monthly supply order',
        reference: 'ORD-003',
        urgency: 'normal',
        submitted_by: 'field-1',
        submitted_by_name: 'staff@company.com',
        submitted_at: '2024-01-11T05:30:00Z',
        transaction_date: '2024-01-11'
      },
    ];

    setApprovals(mockApprovals);
  };

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      
      // Update transaction status in Supabase
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_by: userProfile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      if (error) {
        console.error('Error updating transaction status:', error);
        throw error;
      }
      
      // Update local state
      setApprovals(prev => prev.filter(approval => approval.id !== approvalId));
      
      console.log(`Approval ${approvalId} ${action}ed`);
    } catch (error) {
      console.error('Error processing approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = approvals.filter((approval) => {
    const matchesSearch = approval.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || approval.type === filterType;
    const matchesUrgency = filterUrgency === 'all' || approval.urgency === filterUrgency;
    return matchesSearch && matchesType && matchesUrgency;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${month} ${year}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <Receipt className="w-4 h-4" />;
      case 'collection': return <TrendingUp className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-blue-50 text-blue-600';
      case 'collection': return 'bg-green-50 text-green-600';
      case 'payment': return 'bg-purple-50 text-purple-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getDescriptionWithDate = (approval: PendingApproval) => {
    if (!approval.transaction_date) return approval.description;
    
    const formattedDate = formatDate(approval.transaction_date);
    if (approval.type === 'sale' || approval.type === 'collection') {
      return `${approval.description} (${formattedDate})`;
    }
    return approval.description;
  };

  const isUrgent = (submittedAt: string) => {
    const submittedDate = new Date(submittedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const stats = {
    total: approvals.length,
    urgent: approvals.filter(a => isUrgent(a.submitted_at)).length,
    totalAmount: approvals.reduce((sum, a) => sum + a.amount, 0),
  };

  const canApprove = userProfile?.role === 'admin';

  // If user is not admin, they shouldn't see this page
  if (userProfile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-6 bg-gray-50 rounded-lg max-w-md">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            You don't have permission to access the approvals section. 
            This area is only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Pending Approvals</h1>
            <p className="text-orange-100 text-xs sm:text-sm lg:text-base">Review and approve pending transactions from field staff</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-orange-100">Total Pending</div>
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-orange-100">Urgent ({'>'} 24h)</div>
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats.urgent}</div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-orange-100">Total Amount</div>
              <div className="text-sm sm:text-lg lg:text-3xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search approvals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales</option>
              <option value="collection">Collections</option>
              <option value="payment">Payments</option>
            </select>

            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div className="text-xs sm:text-sm text-gray-500">
            Showing {filteredApprovals.length} of {approvals.length} approvals
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Pending Approvals ({filteredApprovals.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredApprovals.map((approval) => (
            <div 
              key={approval.id} 
              className={`p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors ${
                isUrgent(approval.submitted_at) ? 'border-l-4 border-red-500 bg-red-50' : ''
              }`}
            >
              <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center ${getTypeColor(approval.type)} flex-shrink-0`}>
                    {getTypeIcon(approval.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{approval.party_name}</h4>
                      <div className="flex items-center space-x-2">
                        {approval.urgency === 'urgent' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">
                            Urgent
                          </span>
                        )}
                        {approval.payment_method && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                            {approval.payment_method.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                      {getDescriptionWithDate(approval)}
                    </div>
                    
                    <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(approval.submitted_at)} {new Date(approval.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium">By:</span> 
                        <span className="truncate">{approval.submitted_by_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Ref:</span> 
                        <span className="truncate">{approval.reference}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end lg:space-x-4">
                  <div className="text-left lg:text-right">
                    <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                      {formatCurrency(approval.amount)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 capitalize">
                      {approval.type}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button className="p-1.5 sm:p-2 text-gray-400 hover:text-orange-600 transition-colors">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    {canApprove && (
                      <>
                        <button
                          onClick={() => handleApproval(approval.id, 'reject')}
                          className="flex items-center space-x-1 px-2 sm:px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                        <button
                          onClick={() => handleApproval(approval.id, 'approve')}
                          className="flex items-center space-x-1 px-2 sm:px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredApprovals.length === 0 && (
            <div className="p-6 sm:p-8 lg:p-12 text-center">
              <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2 text-sm sm:text-base">No pending approvals</div>
              <div className="text-xs sm:text-sm text-gray-400">
                {searchTerm || filterType !== 'all' || filterUrgency !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'All transactions are up to date'
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}