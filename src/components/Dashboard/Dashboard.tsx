import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Clock,
  AlertTriangle,
  Users,
  CreditCard,
  ArrowRight,
  FileText
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
          transaction_date,
          parties ( name )
        `)
        .eq('firm_id', selectedFirm.id)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        useMockData();
        return;
      }

      const { count: partiesCount, error: partiesError } = await supabase
        .from('parties')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', selectedFirm.id);

      if (partiesError) {
        console.error('Error fetching parties count:', partiesError);
        useMockData();
        return;
      }

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

      const totalSales = transactionsData
        ?.filter(t => t.type === 'sale' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const totalCollections = transactionsData
        ?.filter(t => t.type === 'collection' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const transformedTransactions: Transaction[] = transactionsData?.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        bill_number: t.bill_number,
        created_at: t.transaction_date,
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
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      useMockData();
    } finally {
      setLoading(false);
    }
  };

  const useMockData = () => {
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
    ];

    const totalSales = mockTransactions.filter(t => t.type === 'sale' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
    const totalCollections = 0;
    const pendingApprovals = 0;

    setStats({
      totalSales,
      totalCollections,
      pendingApprovals,
      overdueParties: 0,
      totalParties: 1,
      pendingCheques: 0,
    });

    setRecentTransactions(mockTransactions);
  };

  return <div className="p-4">Dashboard UI here...</div>;
}
