import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Filter, Eye, Edit, MapPin, Download, Calendar,
  FileText, Trash2, AlertCircle, TrendingUp, TrendingDown, Receipt
} from 'lucide-react';
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
  type: 'customer' | 'supplier';
  debtor_days: number;
  last_payment_date?: string;
  created_at: string;
  balance: number;
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
  const [filterType, setFilterType] = useState('all');
  const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
  const [showLocationGroupModal, setShowLocationGroupModal] = useState(false);
  const [selectedPartyForStatement, setSelectedPartyForStatement] = useState<Party | null>(null);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const canEditParties = userProfile?.role === 'admin' || userProfile?.role === 'accountant';
  const canDeleteParties = userProfile?.role === 'admin';
  const canManageLocationGroups = userProfile?.role === 'admin' || userProfile?.role === 'accountant';

  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedFirm?.id) {
      fetchData();
    }
  }, [selectedFirm]);

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

      if (locationGroupsError) throw locationGroupsError;
      setLocationGroups(locationGroupsData || []);

      // Fetch parties
      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .eq('is_active', true)
        .order('name');

      if (partiesError) throw partiesError;

      // Calculate balances correctly without double-counting
      const enriched = await Promise.all(
        (partiesData || []).map(async (party: Party) => {
          const { data: transactions, error: txnError } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('firm_id', selectedFirm.id)
            .eq('party_id', party.id)
            .eq('status', 'approved')
            .gt('transaction_date', party.created_at);

          if (txnError) throw txnError;

          // Calculate balance purely from transactions first
          let calculatedBalance = 0;
          transactions?.forEach(t => {
            if (t.type === 'sale') calculatedBalance += t.amount;
            if (t.type === 'collection') calculatedBalance -= t.amount;
          });

          // Then add the opening balance from the party record
          const finalBalance = calculatedBalance + (party.balance || 0);

          const locationGroup = locationGroupsData?.find(lg => lg.id === party.location_group_id);
          return { ...party, balance: finalBalance, location_group: locationGroup };
        })
      );

      setParties(enriched);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setShowCreatePartyModal(true);
  };

  const handleDeleteParty = async (partyId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('parties')
        .update({ is_active: false })
        .eq('id', partyId);
        
      if (error) throw error;
      
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
      
    const matchesType =
      filterType === 'all' || party.type === filterType;

    return matchesSearch && matchesLocation && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
    outstanding: parties.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0),
  };

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-6">
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
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-purple-600">{formatCurrency(stats.outstanding)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Outstanding</div>
        </div>
      </div>

      {/* Filters and Search */}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-500">
              Showing {filteredParties.length} of {parties.length} parties
            </div>
          </div>
        </div>
      </div>

      {/* Parties List */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Parties ({filteredParties.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredParties.map((party) => (
            <div key={party.id} className="p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors">
              <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    party.type === 'customer' ? 'bg-purple-50' : 'bg-green-50'
                  }`}>
                    <Users className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${
                      party.type === 'customer' ? 'text-purple-600' : 'text-green-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg truncate">
                        {party.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        party.type === 'customer' 
                          ? 'text-purple-600 bg-purple-50' 
                          : 'text-green-600 bg-green-50'
                      }`}>
                        {party.type === 'customer' ? 'Customer' : 'Supplier'}
                      </span>
                    </div>
                    
                    <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{party.contact_person}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{party.phone}</span>
                      </div>
                      {party.location_group && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{party.location_group.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`font-semibold text-sm sm:text-base ${
                        party.balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {party.balance > 0 ? '+' : ''}{formatCurrency(party.balance)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {party.debtor_days} days
                      </div>
                    </div>
                    {getStatusBadge(party.debtor_days)}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewStatement(party)}
                      className="p-1.5 sm:p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                      title="View Statement"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {canEditParties && (
                      <button
                        onClick={() => handleEditParty(party)}
                        className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Party"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    
                    {canDeleteParties && (
                      <button
                        onClick={() => setConfirmDelete(party.id)}
                        className="p-1.5 sm:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Party"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredParties.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No parties found</p>
              <p className="text-sm">
                {searchTerm || filterLocation !== 'all' || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first party'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreatePartyModal && (
        <CreatePartyModal
          party={editingParty}
          locationGroups={locationGroups}
          onClose={() => {
            setShowCreatePartyModal(false);
            setEditingParty(null);
          }}
          onSuccess={() => {
            setShowCreatePartyModal(false);
            setEditingParty(null);
            fetchData();
          }}
        />
      )}

      {showLocationGroupModal && canManageLocationGroups && (
        <LocationGroupModal
          onClose={() => setShowLocationGroupModal(false)}
          onSuccess={() => {
            setShowLocationGroupModal(false);
            fetchData();
          }}
        />
      )}

      {selectedPartyForStatement && (
        <PartyStatementModal
          party={selectedPartyForStatement}
          onClose={() => setSelectedPartyForStatement(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Party</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this party? This will deactivate the party and hide it from your list.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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