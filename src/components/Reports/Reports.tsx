import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt, 
  CreditCard, 
  Calendar, 
  Download, 
  Filter,
  FileText,
  PieChart,
  DollarSign,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import SalesReport from './SalesReport';
import CollectionReport from './CollectionReport';
import PartyReport from './PartyReport';
import FinancialReport from './FinancialReport';
import ChequeReport from './ChequeReport';

export default function Reports() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [activeReport, setActiveReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalCollections: 0,
    totalParties: 0,
    pendingCheques: 0,
    overdueAmount: 0,
    salesGrowth: 0,
    collectionGrowth: 0,
    topParties: [],
    recentTransactions: [],
  });

  useEffect(() => {
    if (selectedFirm) {
      fetchReportData();
    }
  }, [selectedFirm, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Mock report data
      const mockData = {
        totalSales: 2450000,
        totalCollections: 1890000,
        totalParties: 45,
        pendingCheques: 12,
        overdueAmount: 350000,
        salesGrowth: 15.5,
        collectionGrowth: 8.2,
        topParties: [
          { name: 'ABC Retailers', amount: 450000, transactions: 25 },
          { name: 'XYZ Distributors', amount: 380000, transactions: 18 },
          { name: 'Super Store', amount: 320000, transactions: 22 },
          { name: 'Quick Mart', amount: 280000, transactions: 15 },
          { name: 'Tech Solutions', amount: 250000, transactions: 12 },
        ],
        recentTransactions: [
          { id: '1', party: 'ABC Retailers', type: 'sale', amount: 45000, date: '2024-01-15' },
          { id: '2', party: 'XYZ Distributors', type: 'collection', amount: 28000, date: '2024-01-14' },
          { id: '3', party: 'Quick Mart', type: 'sale', amount: 15000, date: '2024-01-13' },
        ],
      };

      setReportData(mockData);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
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

  const reportTypes = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'bg-blue-500' },
    { id: 'sales', label: 'Sales Report', icon: Receipt, color: 'bg-green-500' },
    { id: 'collections', label: 'Collections Report', icon: TrendingUp, color: 'bg-teal-500' },
    { id: 'parties', label: 'Party Report', icon: Users, color: 'bg-purple-500' },
    { id: 'financial', label: 'Financial Report', icon: DollarSign, color: 'bg-orange-500' },
    { id: 'cheques', label: 'Cheque Report', icon: CreditCard, color: 'bg-indigo-500' },
  ];

  const canAccessReports = userProfile?.role === 'admin' || userProfile?.role === 'accountant';

  if (!canAccessReports) {
    return (
      <div className="p-6 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <div className="text-gray-500 mb-2">Access Denied</div>
        <div className="text-sm text-gray-400">
          Only administrators and accountants can access reports
        </div>
      </div>
    );
  }

  const renderReportContent = () => {
    switch (activeReport) {
      case 'sales':
        return <SalesReport dateRange={dateRange} />;
      case 'collections':
        return <CollectionReport dateRange={dateRange} />;
      case 'parties':
        return <PartyReport dateRange={dateRange} />;
      case 'financial':
        return <FinancialReport dateRange={dateRange} />;
      case 'cheques':
        return <ChequeReport dateRange={dateRange} />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-600">+{reportData.salesGrowth}%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(reportData.totalSales)}
          </div>
          <div className="text-sm text-gray-500">Total Sales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-teal-600">+{reportData.collectionGrowth}%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(reportData.totalCollections)}
          </div>
          <div className="text-sm text-gray-500">Total Collections</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-600">High Risk</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(reportData.overdueAmount)}
          </div>
          <div className="text-sm text-gray-500">Overdue Amount</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {reportData.totalParties}
          </div>
          <div className="text-sm text-gray-500">Active Parties</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {reportData.pendingCheques}
          </div>
          <div className="text-sm text-gray-500">Pending Cheques</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(reportData.totalSales - reportData.totalCollections)}
          </div>
          <div className="text-sm text-gray-500">Outstanding</div>
        </div>
      </div>

      {/* Top Parties */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Parties by Volume</h3>
        <div className="space-y-4">
          {reportData.topParties.map((party, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-medium text-sm">{index + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{party.name}</div>
                  <div className="text-sm text-gray-500">{party.transactions} transactions</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{formatCurrency(party.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Transactions</h3>
        <div className="space-y-4">
          {reportData.recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  transaction.type === 'sale' ? 'bg-blue-50' : 'bg-green-50'
                }`}>
                  {transaction.type === 'sale' ? (
                    <Receipt className="w-4 h-4 text-blue-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{transaction.party}</div>
                  <div className="text-sm text-gray-500 capitalize">{transaction.type}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</div>
                <div className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold mb-2">Business Reports</h1>
            <p className="text-blue-100">Comprehensive analytics and insights for your business</p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Period:</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-1 text-sm text-gray-900 bg-white rounded border-0 focus:ring-2 focus:ring-white focus:ring-opacity-50"
              />
              <span className="text-sm">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-1 text-sm text-gray-900 bg-white rounded border-0 focus:ring-2 focus:ring-white focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const isActive = activeReport === report.id;
              
              return (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{report.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
}