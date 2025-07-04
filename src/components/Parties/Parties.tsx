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

      // Correct balance logic using only approved transactions AFTER party creation
      const enriched = await Promise.all(
        (partiesData || []).map(async (party: Party) => {
          const { data: txns, error: txnError } = await supabase
            .from('transactions')
            .select('type, amount, transaction_date')
            .eq('firm_id', selectedFirm.id)
            .eq('party_id', party.id)
            .eq('status', 'approved')
            .gt('transaction_date', party.created_at); // Only after party was created

          if (txnError) throw txnError;

          let balance = party.balance || 0;
          txns?.forEach(t => {
            if (t.type === 'sale') balance += t.amount;
            if (t.type === 'collection') balance -= t.amount;
          });

          const locationGroup = locationGroupsData?.find(lg => lg.id === party.location_group_id);
          return { ...party, balance, location_group: locationGroup };
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
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{party.name}</h4>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(party.debtor_days)}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          party.type === 'customer' ? 'text-purple-600 bg-purple-50' : 'text-green-600 bg-green-50'
                        }`}>
                          {party.type === 'customer' ? 'Customer' : 'Supplier'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-3 sm:gap-2 lg:gap-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{party.contact_person || 'No contact person'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{party.location_group?.name || 'No location'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Last: {party.last_payment_date ? new Date(party.last_payment_date).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {party.address || 'No address provided'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end lg:space-x-6">
                  <div className="text-left lg:text-right">
                    <div className="text-xs sm:text-sm text-gray-500">Current Balance</div>
                    <div className={`text-sm sm:text-base lg:text-lg font-semibold ${party.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {party.balance >= 0 ? (
                        <>{formatCurrency(party.balance)} DR</>
                      ) : (
                        <>{formatCurrency(Math.abs(party.balance))} CR</>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Debtor Days: {party.debtor_days}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => handleViewStatement(party)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 transition-colors"
                      title="View Statement"
                    >
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    {canEditParties && (
                      <button 
                        onClick={() => handleEditParty(party)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Edit Party"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    {canDeleteParties && (
                      <>
                        {confirmDelete === party.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteParty(party.id)}
                              className="p-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDelete(party.id)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Party"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredParties.length === 0 && (
            <div className="p-6 sm:p-8 lg:p-12 text-center">
              <Users className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2 text-sm sm:text-base">No parties found</div>
              <div className="text-xs sm:text-sm text-gray-400">
                {searchTerm || filterLocation !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first party'
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreatePartyModal
        isOpen={showCreatePartyModal}
        onClose={() => {
          setShowCreatePartyModal(false);
          setEditingParty(null);
        }}
        onSuccess={fetchData}
        editingParty={editingParty}
      />

      {canManageLocationGroups && (
        <LocationGroupModal
          isOpen={showLocationGroupModal}
          onClose={() => setShowLocationGroupModal(false)}
          locationGroups={locationGroups}
          onSuccess={fetchData}
        />
      )}
  if (!isOpen || !party) return null;
     {selectedPartyForStatement &&selectedPartyForStatement.name ? (
  <PartyStatementModal
    isOpen={true}
    onClose={() => setSelectedPartyForStatement(null)}
    party={selectedPartyForStatement}
  />
) : null}
    </div>
  );
}