""import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, MapPin, Calendar,
  FileText, Trash2, Edit
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CreatePartyModal from './CreatePartyModal';
import LocationGroupModal from './LocationGroupModal';
import PartyStatementModal from './PartyStatementModal';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
  </div>
);

const ErrorView: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="text-red-600 text-center">
      <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
      <p className="text-sm">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
    >
      Retry
    </button>
  </div>
);

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
  const [locationSearchTerm, setLocationSearchTerm] = useState('');

  const canEditParties = userProfile?.role === 'admin' || userProfile?.role === 'accountant';
  const canDeleteParties = userProfile?.role === 'admin';
  const canManageLocationGroups = userProfile?.role === 'admin' || userProfile?.role === 'accountant';

  useEffect(() => { if (searchQuery) setSearchTerm(searchQuery); }, [searchQuery]);
  useEffect(() => { if (selectedFirm?.id) fetchData(); }, [selectedFirm]);

  const handleViewStatement = (party: Party) => {
    setSelectedPartyForStatement(party);
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setShowCreatePartyModal(true);
  };

  const handleDeleteParty = async (partyId: string) => {
    const { error } = await supabase
      .from('parties')
      .delete()
      .eq('id', partyId);
    if (error) {
      console.error('Failed to delete party:', error);
    } else {
      fetchData();
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!selectedFirm?.id) throw new Error('No firm selected');

      const { data: locationGroupsData, error: locationGroupsError } = await supabase
        .from('location_groups')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .order('name');
      if (locationGroupsError) throw locationGroupsError;
      setLocationGroups(locationGroupsData || []);

      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .eq('is_active', true)
        .order('name');
      if (partiesError) throw partiesError;

      const enriched = await Promise.all(
        (partiesData || []).map(async (party: Party) => {
          let balance = party.balance || 0;
          const { data: txns = [], error: txnError } = await supabase
            .from('transactions')
            .select('id, type, amount')
            .eq('firm_id', selectedFirm.id)
            .eq('party_id', party.id)
            .eq('status', 'approved')
            .neq('type', 'opening_balance')
            .order('transaction_date', { ascending: true });
          if (txnError) throw txnError;

          const uniqueTxns = Array.from(new Map(txns.map(t => [t.id, t])).values());
          uniqueTxns.forEach(t => {
            if (party.type === 'customer') {
              balance += (t.type === 'sale' ? t.amount : -t.amount);
            } else {
              balance += (t.type === 'purchase' ? t.amount : -t.amount);
            }
          });

          const locationGroup = locationGroupsData?.find(lg => lg.id === party.location_group_id);
          return { ...party, balance, location_group: locationGroup };
        })
      );
      setParties(enriched);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the code remains unchanged ...

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
              disabled={loading}
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
              <div className="relative">
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm appearance-none"
                >
                  <option value="all">All Locations</option>
                  {filteredLocationGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                
                {/* Location search bar */}
                <div className="mt-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={locationSearchTerm}
                    onChange={(e) => setLocationSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

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
                        {getStatusBadge(party.debtor_days, party.type)}
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

                <div className="flex items-center justify-between lg:justify-end lg:space-x-6 mt-3 lg:mt-0">
                  <div className="text-left lg:text-right">
                    <div className="text-xs sm:text-sm text-gray-500">Current Balance</div>
                    <div className={`text-sm sm:text-base lg:text-lg font-semibold ${
                      party.type === 'customer' 
                        ? (party.balance >= 0 ? 'text-red-600' : 'text-green-600') 
                        : (party.balance >= 0 ? 'text-green-600' : 'text-red-600')
                    }`}>
                      {formatCurrency(Math.abs(party.balance))}
                      {' '}
                      {party.type === 'customer' 
                        ? (party.balance >= 0 ? 'DR' : 'CR') 
                        : (party.balance >= 0 ? 'CR' : 'DR')}
                    </div>
                    {party.type === 'customer' && (
                      <div className="text-xs text-gray-500">
                        Debtor Days: {party.debtor_days}
                      </div>
                    )}
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
      {selectedPartyForStatement && (
        <PartyStatementModal
          isOpen={true}
          onClose={() => setSelectedPartyForStatement(null)}
          party={selectedPartyForStatement}
        />
      )}
    </div>
  );
}
