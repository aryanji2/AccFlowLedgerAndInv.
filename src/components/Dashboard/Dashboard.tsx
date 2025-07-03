import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  Receipt, 
  Clock, 
  AlertTriangle,
  Users,
  CreditCard,
  ArrowRight,
  Eye,
  X,
  Check,
  FileText,
  Calendar
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
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          status,
          bill_number,
          created_at,
          parties (
            name
          )
        `)
        .eq('firm_id', selectedFirm.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        useMockData();
        return;
      }
      
      // Fetch parties count
      const { count: partiesCount, error: partiesError } = await supabase
        .from('parties')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id);
      
      if (partiesError) {
        console.error('Error fetching parties count:', partiesError);
        useMockData();
        return;
      }
      
      // Fetch pending approvals count
      const { count: pendingApprovalsCount, error: approvalsError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'pending');
      
      if (approvalsError) {
        console.error('Error fetching pending approvals count:', approvalsError);
        useMockData();
        return;
      }
      
      // Fetch pending cheques count
      const { count: pendingChequesCount, error: chequesError } = await supabase
        .from('cheques')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id)
        .eq('status', 'pending');
      
      if (chequesError) {
        console.error('Error fetching pending cheques count:', chequesError);
        useMockData();
        return;
      }
      
      // Calculate total sales and collections
      const totalSales = transactionsData
        ?.filter(t => t.type === 'sale' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
        
      const totalCollections = transactionsData
        ?.filter(t => t.type === 'collection' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      
      // Transform transactions data
      const transformedTransactions: Transaction[] = transactionsData?.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        bill_number: t.bill_number,
        created_at: t.created_at,
        party_name: t.parties?.name || 'Unknown Party'
      })) || [];
      
      // Set the data
      setRecentTransactions(transformedTransactions);
      
      setStats({
        totalSales,
        totalCollections,
        pendingApprovals: pendingApprovalsCount || 0,
        overdueParties: 5, // Mock data for now
        totalParties: partiesCount || 0,
        pendingCheques: pendingChequesCount || 0,
        salesGrowth: 12, // Mock data for now
        collectionsGrowth: 8, // Mock data for now
        urgentApprovals: 2, // Mock data for now
        criticalOverdue: 2, // Mock data for now
        newParties: 3, // Mock data for now
        chequesToday: 1, // Mock data for now
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      useMockData();
    } finally {
      setLoading(false);
    }
  };
  
  const useMockData = () => {
    // Fallback to mock data
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'sale',
        amount: 25000,
        status: 'approved',
        bill_number: 'INV-001',
        created_at: new Date().toISOString(),
        party_name: 'ABC Retailers'
      },
      {
        id: '2',
        type: 'collection',
        amount: 18000,
        status: 'pending',
        created_at: new Date().toISOString(),
        party_name: 'XYZ Distributors'
      },
      {
        id: '3',
        type: 'sale',
        amount: 15000,
        status: 'approved',
        bill_number: 'INV-002',
        created_at: new Date().toISOString(),
        party_name: 'Quick Mart'
      },
      {
        id: '4',
        type: 'collection',
        amount: 22000,
        status: 'approved',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        party_name: 'Super Store'
      },
      {
        id: '5',
        type: 'sale',
        amount: 35000,
        status: 'pending',
        bill_number: 'INV-003',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        party_name: 'Tech Solutions'
      }
    ];

    const totalSales = mockTransactions.filter(t => t.type === 'sale' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
    const totalCollections = mockTransactions.filter(t => t.type === 'collection' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
    const pendingApprovals = mockTransactions.filter(t => t.status === 'pending').length;

    setStats({
      totalSales,
      totalCollections,
      pendingApprovals,
      overdueParties: 5,
      totalParties: 12,
      pendingCheques: 3,
      salesGrowth: 12,
      collectionsGrowth: 8,
      urgentApprovals: 2,
      criticalOverdue: 2,
      newParties: 3,
      chequesToday: 1,
    });

    setRecentTransactions(mockTransactions);
  };

  const handleQuickAction = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
  };

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

  // Determine which quick actions to show based on user role
  const showApprovals = userProfile?.role === 'admin';
  const showReports = userProfile?.role === 'admin' || userProfile?.role === 'accountant';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">
              Welcome back, {userProfile?.full_name || 'User'}!
            </h1>
            <p className="text-blue-100 mb-2 sm:mb-4 text-xs sm:text-sm lg:text-base">
              Here's what's happening with your business today
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm">Sales ↑{stats.salesGrowth}% this week</span>
              </div>
              {showApprovals && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium text-xs sm:text-sm">{stats.pendingApprovals} pending approvals</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Sales */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-green-600">+{stats.salesGrowth}%</span>
          </div>
          <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(stats.totalSales)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Total Sales</div>
        </div>

        {/* Total Collections */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-teal-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-teal-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-green-600">+{stats.collectionsGrowth}%</span>
          </div>
          <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(stats.totalCollections)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Total Collections</div>
        </div>

        {/* Pending Approvals - Only for Admin */}
        {showApprovals && (
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-red-600">{stats.urgentApprovals} urgent</span>
            </div>
            <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">
              {stats.pendingApprovals}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Pending Approvals</div>
          </div>
        )}

        {/* Overdue Parties */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-red-600">{stats.criticalOverdue} critical</span>
          </div>
          <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">
            {stats.overdueParties}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Overdue Parties</div>
        </div>

        {/* Total Parties */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-green-600">{stats.newParties} new</span>
          </div>
          <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">
            {stats.totalParties}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Total Parties</div>
        </div>

        {/* Pending Cheques */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-orange-600">{stats.chequesToday} today</span>
          </div>
          <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">
            {stats.pendingCheques}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Pending Cheques</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button 
            onClick={() => handleQuickAction('transactions')}
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 text-xs sm:text-sm font-medium"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                  {getTransactionIcon(transaction.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                    {transaction.party_name}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 truncate">
                    <span className="capitalize">
                      {transaction.type}({new Date(transaction.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })})</span>
                    {transaction.bill_number && ` - ${transaction.bill_number}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(transaction.created_at), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                  {formatCurrency(transaction.amount)}
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))}

          {recentTransactions.length === 0 && (
            <div className="text-center py-6 sm:py-8">
              <Receipt className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2 text-sm sm:text-base">No recent transactions</div>
              <div className="text-xs sm:text-sm text-gray-400">
                Transactions will appear here as they are created
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {showApprovals && (
            <button 
              onClick={() => handleQuickAction('approvals')}
              className="flex items-center space-x-3 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-gray-900 text-sm sm:text-base">Pending Approvals</div>
                <div className="text-xs sm:text-sm text-gray-500">Review transactions</div>
              </div>
            </button>
          )}
          
          <button 
            onClick={() => handleQuickAction('cheques')}
            className="flex items-center space-x-3 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-gray-900 text-sm sm:text-base">Cheque Management</div>
              <div className="text-xs sm:text-sm text-gray-500">Manage cheques</div>
            </div>
          </button>
          
          <button 
            onClick={() => handleQuickAction('parties')}
            className="flex items-center space-x-3 p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-gray-900 text-sm sm:text-base">Party Management</div>
              <div className="text-xs sm:text-sm text-gray-500">Manage parties</div>
            </div>
          </button>
          
          <button 
            onClick={() => handleQuickAction('daybook')}
            className="flex items-center space-x-3 p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-gray-900 text-sm sm:text-base">Day Book</div>
              <div className="text-xs sm:text-sm text-gray-500">Daily entries</div>
            </div>
          </button>
        </div>
      </div>

      {/* Business Insights - Only show for admin and accountant */}
      {showReports && (
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Business Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Sales Performance */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">Sales Performance</h4>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {formatCurrency(stats.totalSales)}
              </div>
              <div className="text-sm text-blue-700">
                ↑ {stats.salesGrowth}% increase from last month
              </div>
            </div>

            {/* Collection Efficiency */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-900">Collection Efficiency</h4>
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900 mb-1">
                {stats.totalSales > 0 ? Math.round((stats.totalCollections / stats.totalSales) * 100) : 0}%
              </div>
              <div className="text-sm text-green-700">
                Collection rate this month
              </div>
            </div>

            {/* Outstanding Summary */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-orange-900">Outstanding Amount</h4>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900 mb-1">
                {formatCurrency(stats.totalSales - stats.totalCollections)}
              </div>
              <div className="text-sm text-orange-700">
                {stats.overdueParties} parties overdue
              </div>
            </div>

            {/* Party Growth */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-purple-900">Party Network</h4>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {stats.totalParties}
              </div>
              <div className="text-sm text-purple-700">
                {stats.newParties} new parties this month
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}