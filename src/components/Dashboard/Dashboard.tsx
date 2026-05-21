import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
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
  salesGrowth: number | null;
  collectionsGrowth: number | null;
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
  transaction_date: string;
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
    salesGrowth: null,
    collectionsGrowth: null,
    urgentApprovals: 0,
    criticalOverdue: 0,
    newParties: 0,
    chequesToday: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showApprovals = userProfile?.role === 'admin';

  const showReports =
    userProfile?.role === 'admin' ||
    userProfile?.role === 'accountant';

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';

      case 'pending':
        return 'text-yellow-600 bg-yellow-50';

      case 'rejected':
        return 'text-red-600 bg-red-50';

      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Receipt className="w-4 h-4" />;

      case 'collection':
        return <TrendingUp className="w-4 h-4" />;

      case 'payment':
        return <CreditCard className="w-4 h-4" />;

      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-blue-50 text-blue-600';

      case 'collection':
        return 'bg-green-50 text-green-600';

      case 'payment':
        return 'bg-purple-50 text-purple-600';

      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const handleQuickAction = useCallback(
    (action: string) => {
      if (onNavigate) {
        onNavigate(action);
      }
    },
    [onNavigate]
  );

  const fetchDashboardData = useCallback(async () => {
    if (!selectedFirm) return;

    try {
      setLoading(true);
      setError(null);

      const [
        analyticsResult,
        recentTransactionsResult,
        partiesResult,
        approvalsResult,
        chequesResult,
      ] = await Promise.all([
        // ALL transactions for analytics
        supabase
          .from('transactions')
          .select(
            `
            id,
            type,
            amount,
            status,
            transaction_date,
            created_at
          `
          )
          .eq('firm_id', selectedFirm.id),

        // ONLY latest 10 for UI
        supabase
          .from('transactions')
          .select(
            `
            id,
            type,
            amount,
            status,
            bill_number,
            transaction_date,
            created_at,
            parties (
              name
            )
          `
          )
          .eq('firm_id', selectedFirm.id)
          .order('created_at', { ascending: false })
          .limit(10),

        // Total parties
        supabase
          .from('parties')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('firm_id', selectedFirm.id),

        // Pending approvals
        supabase
          .from('transactions')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('firm_id', selectedFirm.id)
          .eq('status', 'pending'),

        // Pending cheques
        supabase
          .from('cheques')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('firm_id', selectedFirm.id)
          .eq('status', 'pending'),
      ]);

      // Error handling
      if (
        analyticsResult.error ||
        recentTransactionsResult.error ||
        partiesResult.error ||
        approvalsResult.error ||
        chequesResult.error
      ) {
        console.error({
          analyticsError: analyticsResult.error,
          recentTransactionsError:
            recentTransactionsResult.error,
          partiesError: partiesResult.error,
          approvalsError: approvalsResult.error,
          chequesError: chequesResult.error,
        });

        throw new Error('Failed to fetch dashboard data');
      }

      const analyticsData = analyticsResult.data || [];

      // Correct analytics
      const totalSales = analyticsData
        .filter(
          (t) =>
            t.type === 'sale' &&
            t.status === 'approved'
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCollections = analyticsData
        .filter(
          (t) =>
            t.type === 'collection' &&
            t.status === 'approved'
        )
        .reduce((sum, t) => sum + t.amount, 0);

      // Recent transactions
      const transformedTransactions: Transaction[] =
        recentTransactionsResult.data?.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          bill_number: t.bill_number,
          transaction_date: t.transaction_date,
          created_at: t.created_at,
          party_name:
            (t.parties as any)?.name || 'Unknown Party',
        })) || [];

      setRecentTransactions(transformedTransactions);

      setStats({
        totalSales,
        totalCollections,
        pendingApprovals:
          approvalsResult.count || 0,
        overdueParties: 0,
        totalParties: partiesResult.count || 0,
        pendingCheques: chequesResult.count || 0,
        salesGrowth: null,
        collectionsGrowth: null,
        urgentApprovals: 0,
        criticalOverdue: 0,
        newParties: 0,
        chequesToday: 0,
      });
    } catch (err) {
      console.error(err);

      setError(
        'Failed to load dashboard data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedFirm]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // No firm selected
  if (!selectedFirm) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />

          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            No Firm Selected
          </h2>

          <p className="text-gray-500">
            Please select a firm to view dashboard
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />

          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Something went wrong
          </h2>

          <p className="text-gray-500 mb-4">{error}</p>

          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-gray-200 animate-pulse" />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>

        <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 rounded-xl p-4 lg:p-6 text-white">
        <h1 className="text-xl lg:text-2xl font-bold mb-2">
          Welcome back,{' '}
          {userProfile?.full_name || 'User'}!
        </h1>

        <p className="text-blue-100 text-sm lg:text-base">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sales */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>

            <span className="text-sm font-medium text-gray-500">
              {stats.salesGrowth !== null
                ? `+${stats.salesGrowth}%`
                : 'N/A'}
            </span>
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalSales)}
          </div>

          <div className="text-sm text-gray-500">
            Total Sales
          </div>
        </div>

        {/* Collections */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>

            <span className="text-sm font-medium text-gray-500">
              {stats.collectionsGrowth !== null
                ? `+${stats.collectionsGrowth}%`
                : 'N/A'}
            </span>
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalCollections)}
          </div>

          <div className="text-sm text-gray-500">
            Total Collections
          </div>
        </div>

        {/* Pending approvals */}
        {showApprovals && (
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>

            <div className="text-2xl font-bold text-gray-900">
              {stats.pendingApprovals}
            </div>

            <div className="text-sm text-gray-500">
              Pending Approvals
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            Recent Transactions
          </h3>

          <button
            onClick={() =>
              handleQuickAction('transactions')
            }
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTransactionColor(
                    transaction.type
                  )}`}
                >
                  {getTransactionIcon(transaction.type)}
                </div>

                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {transaction.party_name}
                  </div>

                  <div className="text-sm text-gray-500">
                    {transaction.type} •{' '}
                    {new Date(
                      transaction.transaction_date
                    ).toLocaleDateString('en-IN')}
                  </div>

                  <div className="text-xs text-gray-400">
                    {transaction.created_at
                      ? format(
                          new Date(
                            transaction.created_at
                          ),
                          'dd MMM yyyy, hh:mm a'
                        )
                      : '-'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatCurrency(transaction.amount)}
                </div>

                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    transaction.status
                  )}`}
                >
                  {transaction.status}
                </span>
              </div>
            </div>
          ))}

          {recentTransactions.length === 0 && (
            <div className="text-center py-10">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />

              <div className="text-gray-500">
                No recent transactions
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-6">
          Quick Actions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {showApprovals && (
            <button
              onClick={() =>
                handleQuickAction('approvals')
              }
              className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
            >
              <Clock className="w-6 h-6 text-blue-600" />

              <div className="text-left">
                <div className="font-medium">
                  Pending Approvals
                </div>

                <div className="text-sm text-gray-500">
                  Review transactions
                </div>
              </div>
            </button>
          )}

          <button
            onClick={() =>
              handleQuickAction('cheques')
            }
            className="flex items-center gap-3 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition"
          >
            <CreditCard className="w-6 h-6 text-green-600" />

            <div className="text-left">
              <div className="font-medium">
                Cheque Management
              </div>

              <div className="text-sm text-gray-500">
                Manage cheques
              </div>
            </div>
          </button>

          <button
            onClick={() =>
              handleQuickAction('parties')
            }
            className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition"
          >
            <Users className="w-6 h-6 text-purple-600" />

            <div className="text-left">
              <div className="font-medium">
                Party Management
              </div>

              <div className="text-sm text-gray-500">
                Manage parties
              </div>
            </div>
          </button>

          <button
            onClick={() =>
              handleQuickAction('daybook')
            }
            className="flex items-center gap-3 p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition"
          >
            <FileText className="w-6 h-6 text-orange-600" />

            <div className="text-left">
              <div className="font-medium">
                Day Book
              </div>

              <div className="text-sm text-gray-500">
                Daily entries
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Insights */}
      {showReports && (
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-6">
            Business Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">
                  Collection Efficiency
                </h4>

                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>

              <div className="text-2xl font-bold text-blue-900">
                {stats.totalSales > 0
                  ? Math.round(
                      (stats.totalCollections /
                        stats.totalSales) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>

            <div className="p-4 rounded-lg bg-orange-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-orange-900">
                  Outstanding Amount
                </h4>

                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>

              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(
                  stats.totalSales -
                    stats.totalCollections
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}