// full updated Dashboard.tsx with correct date formatting
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Clock,
  AlertTriangle,
  Users,
  CreditCard,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalSales: number;
  totalCollections: number;
  pendingApprovals: number;
  overdueParties: number;
  totalParties: number;
  pendingCheques: number;
  salesGrowth: number;
  collectionsGrowth: number;
  urgentApprovals: number;
  criticalOverdue: number;
  newParties: number;
  chequesToday: number;
}

interface Transaction {
  id: string;
  type: 'sale' | 'collection' | 'payment';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bill_number?: string;
  created_at: string;
  party_name: string;
}

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalCollections: 0,
    pendingApprovals: 0,
    overdueParties: 0,
    totalParties: 0,
    pendingCheques: 0,
    salesGrowth: 0,
    collectionsGrowth: 0,
    urgentApprovals: 0,
    criticalOverdue: 0,
    newParties: 0,
    chequesToday: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedFirm) {
      fetchDashboardData();
    }
  }, [selectedFirm]);

  const fetchDashboardData = async () => {
    if (!selectedFirm) return;
    try {
      setLoading(true);
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          status,
          bill_number,
          created_at,
          parties (name)
        `)
        .eq('firm_id', selectedFirm.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;

      const { count: partiesCount } = await supabase
        .from('parties')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id);

      const { count: pendingApprovalsCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'pending');

      const { count: pendingChequesCount } = await supabase
        .from('cheques')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'pending');

      const totalSales = transactionsData?.filter(t => t.type === 'sale' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalCollections = transactionsData?.filter(t => t.type === 'collection' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0) || 0;

      const transformedTransactions: Transaction[] = transactionsData?.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        bill_number: t.bill_number,
        created_at: t.created_at,
        party_name: t.parties?.name || 'Unknown Party'
      })) || [];

      setRecentTransactions(transformedTransactions);

      setStats({
        totalSales,
        totalCollections,
        pendingApprovals: pendingApprovalsCount || 0,
        overdueParties: 0,
        totalParties: partiesCount || 0,
        pendingCheques: pendingChequesCount || 0,
        salesGrowth: 0,
        collectionsGrowth: 0,
        urgentApprovals: 0,
        criticalOverdue: 0,
        newParties: 0,
        chequesToday: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRecentTransactions([]);
      setStats({
        totalSales: 0,
        totalCollections: 0,
        pendingApprovals: 0,
        overdueParties: 0,
        totalParties: 0,
        pendingCheques: 0,
        salesGrowth: 0,
        collectionsGrowth: 0,
        urgentApprovals: 0,
        criticalOverdue: 0,
        newParties: 0,
        chequesToday: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

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
      case 'payment': return <CreditCard className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-blue-50 text-blue-600';
      case 'collection': return 'bg-green-50 text-green-600';
      case 'payment': return 'bg-purple-50 text-purple-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Recent Transactions */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {transaction.party_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {transaction.type} {transaction.bill_number && `- ${transaction.bill_number}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 text-sm">
                  {formatCurrency(transaction.amount)}
                </div>
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))}

          {recentTransactions.length === 0 && (
            <div className="text-center py-6 text-gray-400">No recent transactions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
