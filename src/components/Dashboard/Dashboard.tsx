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
  transaction_date: string;
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
        useMockApprovals();
        return;
      }

      const transformedApprovals: PendingApproval[] = transactionsData?.map(transaction => {
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
          transaction_date: transaction.transaction_date,
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
        transaction_date: '2024-01-13T00:00:00Z',
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
        transaction_date: '2024-01-12T00:00:00Z',
      },
    ];

    setApprovals(mockApprovals);
  };

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);

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

      setApprovals(prev => prev.filter(approval => approval.id !== approvalId));
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
      {/* ... Header & Filters code remains unchanged ... */}

      {/* Inside approval list card, change this block: */}
      <div className="text-xs sm:text-sm text-gray-500 capitalize">
        {approval.type} ({new Date(approval.transaction_date).toLocaleDateString()})
      </div>

      {/* ... Rest of the JSX remains unchanged ... */}
    </div>
  );
}
