import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Eye, Edit, MapPin, Download, Calendar, FileText, TrendingUp, TrendingDown, Receipt, Trash2, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CreatePartyModal from './CreatePartyModal';
import LocationGroupModal from './LocationGroupModal';
import PartyStatementModal from './PartyStatementModal';
import jsPDF from 'jspdf';

interface LocationGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface Party {
  id: string;
  firm_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  location_group_id: string;
  location_group?: LocationGroup;
  balance: number;
  type: 'customer' | 'supplier';
  debtor_days: number;
  last_payment_date?: string;
  created_at: string;
}

interface PartiesProps {
  searchQuery?: string;
  onPartySelect?: (party: Party) => void;
}

export default function Parties({ searchQuery, onPartySelect }: PartiesProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
  const [showLocationGroupModal, setShowLocationGroupModal] = useState(false);
  const [selectedPartyForStatement, setSelectedPartyForStatement] = useState<Party | null>(null);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedFirm) {
      fetchData();
    }
  }, [selectedFirm]);

  // Function to calculate current balance and debtor days from transactions
  const calculatePartyMetrics = async (partyId: string) => {
    try {
      // This would typically fetch from transactions table
      // For now, we'll use the stored balance and debtor_days
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', partyId)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return { balance: 0, debtor_days: 0 };
      }

      // Calculate running balance
      let balance = 0;
      let lastPaymentDate: Date | null = null;

      transactions?.forEach(transaction => {
        if (transaction.type === 'debit') {
          balance += transaction.amount;
        } else if (transaction.type === 'credit') {
          balance -= transaction.amount;
          if (!lastPaymentDate || new Date(transaction.transaction_date) > lastPaymentDate) {
            lastPaymentDate = new Date(transaction.transaction_date);
          }
        }
      });

      // Calculate debtor days (days since last payment)
      const debtor_days = lastPaymentDate 
        ? Math.floor((new Date().getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return { balance, debtor_days, lastPaymentDate: lastPaymentDate?.toISOString() };
    } catch (error) {
      console.error('Error calculating party metrics:', error);
      return { balance: 0, debtor_days: 0 };
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedFirm?.id) {
        throw new Error('No firm selected');
      }

      // Fetch location groups
      const { data: locationGroupsData, error: locationGroupsError } = await supabase
        .from('location_groups')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .order('name');

      if (locationGroupsError) {
        console.error('Error fetching location groups:', locationGroupsError);
        throw locationGroupsError;
      }

      setLocationGroups(locationGroupsData || []);

      // Fetch parties
      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .eq('is_active', true)
        .order('name');

      if (partiesError) {
        console.error('Error fetching parties:', partiesError);
        throw partiesError;
      }

      // Calculate real-time metrics for each party
      const partiesWithMetrics = await Promise.all(
        (partiesData || []).map(async (party) => {
          const metrics = await calculatePartyMetrics(party.id);
          const locationGroup = locationGroupsData?.find(lg => lg.id === party.location_group_id);
          
          return {
            ...party,
            balance: metrics.balance,
            debtor_days: metrics.debtor_days,
            last_payment_date: metrics.lastPaymentDate || party.last_payment_date,
            location_group: locationGroup
          };
        })
      );

      setParties(partiesWithMetrics);
      setIsUsingMockData(false);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      
      // Fallback to mock data
      useMockData();
    } finally {
      setLoading(false);
    }
  };

  const useMockData = () => {
    // Mock location groups
    const mockLocationGroups: LocationGroup[] = [
      { id: 'loc-1', name: 'Mumbai Central', description: 'Central Mumbai area', created_at: new Date().toISOString() },
      { id: 'loc-2', name: 'Delhi NCR', description: 'Delhi and surrounding areas', created_at: new Date().toISOString() },
      { id: 'loc-3', name: 'Bangalore Tech Hub', description: 'Bangalore tech district', created_at: new Date().toISOString() },
      { id: 'loc-4', name: 'Chennai', description: 'Chennai metropolitan area', created_at: new Date().toISOString() },
    ];
    
    // Mock parties with realistic data
    const mockParties: Party[] = [
      { 
        id: 'party-1', 
        firm_id: selectedFirm?.id || '',
        name: 'ABC Retailers', 
        contact_person: 'John Smith', 
        phone: '+91 98765 43210', 
        email: 'john@abcretailers.com',
        address: '123 Main St, Mumbai',
        location_group_id: 'loc-1',
        location_group: mockLocationGroups[0],
        balance: 321286,
        type: 'customer',
        debtor_days: 65,
        last_payment_date: '2023-12-15',
        created_at: new Date().toISOString()
      },
      { 
        id: 'party-2', 
        firm_id: selectedFirm?.id || '',
        name: 'XYZ Distributors', 
        contact_person: 'Sarah Johnson', 
        phone: '+91 87654 32109', 
        email: 'sarah@xyzdist.com',
        address: '456 Business Park, Delhi',
        location_group_id: 'loc-2',
        location_group: mockLocationGroups[1],
        balance: 116044,
        type: 'customer',
        debtor_days: 45,
        last_payment_date: '2024-01-05',
        created_at: new Date().toISOString()
      },
      { 
        id: 'party-3', 
        firm_id: selectedFirm?.id || '',
        name: 'Quick Mart', 
        contact_person: 'Mike Chen', 
        phone: '+91 76543 21098', 
        email: 'mike@quickmart.com',
        address: '789 Tech Park, Bangalore',
        location_group_id: 'loc-3',
        location_group: mockLocationGroups[2],
        balance: 225284,
        type: 'customer',
        debtor_days: 28,
        last_payment_date: '2024-01-18',
        created_at: new Date().toISOString()
      },
      { 
        id: 'party-4', 
        firm_id: selectedFirm?.id || '',
        name: 'Super Store', 
        contact_person: 'Lisa Wang', 
        phone: '+91 65432 10987', 
        email: 'lisa@superstore.com',
        address: '101 Market St, Chennai',
        location_group_id: 'loc-4',
        location_group: mockLocationGroups[3],
        balance: 666980,
        type: 'customer',
        debtor_days: 52,
        last_payment_date: '2024-01-02',
        created_at: new Date().toISOString()
      },
      { 
        id: 'party-5', 
        firm_id: selectedFirm?.id || '',
        name: 'Global Suppliers', 
        contact_person: 'Raj Patel', 
        phone: '+91 54321 09876', 
        email: 'raj@globalsuppliers.com',
        address: '202 Industrial Area, Mumbai',
        location_group_id: 'loc-1',
        location_group: mockLocationGroups[0],
        balance: -50000,
        type: 'supplier',
        debtor_days: 0,
        last_payment_date: '2024-01-20',
        created_at: new Date().toISOString()
      }
    ];
    
    setLocationGroups(mockLocationGroups);
    setParties(mockParties);
    setIsUsingMockData(true);
  };

  // Add a function to refresh data after creating/updating parties
  const handleDataRefresh = () => {
    fetchData();
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setShowCreatePartyModal(true);
  };

  const handleDeleteParty = async (partyId: string) => {
    try {
      setLoading(true);
      
      if (isUsingMockData) {
        // For mock data, just remove from state
        setParties(prev => prev.filter(party => party.id !== partyId));
        setConfirmDelete(null);
        return;
      }
      
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('parties')
        .update({ is_active: false })
        .eq('id', partyId);
        
      if (error) {
        console.error('Error deleting party:', error);
        throw error;
      }
      
      // Update local state
      setParties(prev => prev.filter(party => party.id !== partyId));
      setConfirmDelete(null);
      
    } catch (error) {
      console.error('Error deleting party:', error);
      alert('Failed to delete party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      (party.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.phone || '').includes(searchTerm);

    const matchesLocation =
      filterLocation === 'all' || party.location_group_id === filterLocation;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'overdue' && party.debtor_days > 60) ||
      (filterStatus === 'near_limit' && party.debtor_days > 30 && party.debtor_days <= 60) ||
      (filterStatus === 'good' && party.debtor_days <= 30);
      
    const matchesType =
      filterType === 'all' || party.type === filterType;

    return matchesSearch && matchesLocation && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const getStatusBadge = (debtorDays: number) => {
    if (debtorDays > 60) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">Overdue</span>;
    } else if (debtorDays > 30) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50">High Usage</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">Good</span>;
  };

  // Enhanced CSV Export Function
  const exportToCSV = (locationGroupId?: string) => {
    const exportParties = locationGroupId 
      ? parties.filter(p => p.location_group_id === locationGroupId)
      : filteredParties;
    
    const locationGroup = locationGroups.find(lg => lg.id === locationGroupId);
    
    // CSV headers
    const headers = [
      'Party Name',
      'Contact Person',
      'Phone',
      'Email',
      'Address',
      'Location Group',
      'Type',
      'Current Balance',
      'Debtor Days',
      'Last Payment Date',
      'Created Date'
    ];
    
    // CSV data
    const csvData = exportParties.map(party => [
      party.name || '',
      party.contact_person || '',
      party.phone || '',
      party.email || '',
      party.address || '',
      party.location_group?.name || '',
      party.type,
      party.balance.toFixed(2),
      party.debtor_days.toString(),
      party.last_payment_date ? new Date(party.last_payment_date).toLocaleDateString() : '',
      new Date(party.created_at).toLocaleDateString()
    ]);
    
    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const fileName = locationGroup 
      ? `parties-${locationGroup.name.toLowerCase().replace(/\s+/g, '-')}.csv`
      : 'parties-export.csv';
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enhanced PDF Export Function (matching the attachment style)
  const exportToPDF = (locationGroupId?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    
    // Filter parties by location if specified, only customers with positive balance
    const exportParties = (locationGroupId 
      ? parties.filter(p => p.location_group_id === locationGroupId)
      : parties)
      .filter(p => p.type === 'customer' && p.balance > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const locationGroup = locationGroups.find(lg => lg.id === locationGroupId);
    
    // Header - Company Name and Address
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedFirm?.name?.toUpperCase() || 'COMPANY NAME', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedFirm?.address || 'Company Address', pageWidth / 2, 28, { align: 'center' });
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = locationGroup ? `Amount Receivable - ${locationGroup.name}` : 'Amount Receivable';
    doc.text(title, pageWidth / 2, 45, { align: 'center' });
    
    // Date and filter info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`As On : ${new Date().toLocaleDateString('en-GB')} All Accounts`, pageWidth / 2, 55, { align: 'center' });
    
    // Table headers
    let yPosition = 70;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Account', margin, yPosition);
    doc.text('Balance', pageWidth - margin - 40, yPosition, { align: 'right' });
    
    // Underline for headers
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;
    
    // Table data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let totalBalance = 0;
    
    exportParties.forEach((party, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 30;
        
        // Repeat headers on new page
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Account', margin, yPosition);
        doc.text('Balance', pageWidth - margin - 40, yPosition, { align: 'right' });
        doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
        yPosition += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
      }
      
      // Party name with location if available
      const partyName = party.location_group?.name 
        ? `${party.name}, ${party.location_group.name.toUpperCase()}`
        : party.name;
      
      doc.text(partyName, margin, yPosition);
      
      // Balance (formatted as in the original)
      const balanceText = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(party.balance);
      
      doc.text(balanceText, pageWidth - margin - 40, yPosition, { align: 'right' });
      
      totalBalance += party.balance;
      yPosition += 6;
    });
    
    // Total line
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total', margin, yPosition);
    const totalText = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalBalance);
    doc.text(totalText, pageWidth - margin - 40, yPosition, { align: 'right' });
    
    // Save the PDF
    const fileName = locationGroup 
      ? `amount-receivable-${locationGroup.name.toLowerCase().replace(/\s+/g, '-')}.pdf`
      : 'amount-receivable.pdf';
    doc.save(fileName);
  };

  const handleViewStatement = (party: Party) => {
    if (onPartySelect) {
      onPartySelect(party);
    } else {
      setSelectedPartyForStatement(party);
    }
  };

  const stats = {
    total: parties.length,
    customers: parties.filter(p => p.type === 'customer').length,
    suppliers: parties.filter(p => p.type === 'supplier').length,
    overdue: parties.filter(p => p.debtor_days > 60).length,
    nearLimit: parties.filter(p => p.debtor_days > 30 && p.debtor_days <= 60).length,
    outstanding: parties.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0),
  };

  const canManageLocationGroups = userProfile?.role === 'admin' || userProfile?.role === 'accountant';
  const canEditParties = userProfile?.role === 'admin';
  const canDeleteParties = userProfile?.role === 'admin';

  if (loading && parties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600 text-center">
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Party Management</h1>
            <p className="text-purple-100 text-xs sm:text-sm lg:text-base">Manage customer relationships and debtor days</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {canManageLocationGroups && (
              <button
                onClick={() => setShowLocationGroupModal(true)}
                className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
              >
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Manage Locations</span>
              </button>
            )}
            <button
              onClick={() => {
                setEditingParty(null);
                setShowCreatePartyModal(true);
              }}
              className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Add Party</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mock Data Notice */}
      {isUsingMockData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Demo Mode</p>
              <p className="text-blue-700 text-sm">
                You're viewing mock party data. To use real party management features, please configure your Supabase connection properly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-6">
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Parties</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.customers}</div>
          <div className="text-xs sm:text-sm text-gray-500">Customers</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.suppliers}</div>
          <div className="text-xs sm:text-sm text-gray-500">Suppliers</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-xs sm:text-sm text-gray-500">Overdue</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.nearLimit}</div>
          <div className="text-xs sm:text-sm text-gray-500">Near Limit</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-purple-600">{formatCurrency(stats.outstanding)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Outstanding</div>
        </div>
      </div>

      {/* Filters and Export */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search parties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="all">All Locations</option>
                {locationGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="good">Good (0-30 days)</option>
                <option value="near_limit">High Usage (31-60 days)</option>
                <option value="overdue">Overdue (60+ days)</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="all">All Types</option>
                <option value="customer">Customers</option>
                <option value="supplier">Suppliers</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => exportToCSV()}
              className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportToPDF()}
              className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Location Groups Section */}
      {locationGroups.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Groups</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {locationGroups.map((group) => {
                const groupParties = parties.filter(p => p.location_group_id === group.id);
                const groupBalance = groupParties.reduce((sum, p) => sum + (p.balance > 0 ? p.balance : 0), 0);
                
                return (
                  <div key={group.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{group.name}</h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => exportToCSV(group.id)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Export CSV"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => exportToPDF(group.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Export PDF"
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Parties:</span>
                        <span className="font-medium">{groupParties.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstanding:</span>
                        <span className="font-medium text-purple-600">{formatCurrency(groupBalance)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Parties Table */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party Details
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParties.map((party) => (
                <tr key={party.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <div className="text-sm font-medium text-gray-900">{party.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 capitalize">
                          {party.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm text-gray-900">{party.contact_person}</div>
                    <div className="text-xs text-gray-500">{party.phone}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm text-gray-900">
                      {party.location_group?.name || 'Not Assigned'}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${party.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {party.balance >= 0 ? '+' : '-'}{formatCurrency(party.balance)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {party.debtor_days} days
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(party.debtor_days)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handleViewStatement(party)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Statement"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      {canEditParties && (
                        <button
                          onClick={() => handleEditParty(party)}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="Edit Party"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                      {canDeleteParties && (
                        <button
                          onClick={() => setConfirmDelete(party.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Party"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredParties.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Users className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No parties found</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {parties.length === 0 
                ? "Get started by adding your first party."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreatePartyModal && (
        <CreatePartyModal
          isOpen={showCreatePartyModal}
          onClose={() => {
            setShowCreatePartyModal(false);
            setEditingParty(null);
          }}
          onSuccess={handleDataRefresh}
          locationGroups={locationGroups}
          editingParty={editingParty}
        />
      )}

      {showLocationGroupModal && (
        <LocationGroupModal
          isOpen={showLocationGroupModal}
          onClose={() => setShowLocationGroupModal(false)}
          onSuccess={handleDataRefresh}
        />
      )}

      {selectedPartyForStatement && (
        <PartyStatementModal
          isOpen={!!selectedPartyForStatement}
          onClose={() => setSelectedPartyForStatement(null)}
          party={selectedPartyForStatement}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Party</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this party? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteParty(confirmDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}