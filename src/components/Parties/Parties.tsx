import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Filter, Eye, Edit, MapPin, Download, Calendar,
  FileText, Trash2
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CreatePartyModal from './CreatePartyModal';
import LocationGroupModal from './LocationGroupModal';
import PartyStatementModal from './PartyStatementModal';

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

      // Use the balance directly from the parties table
      setParties(partiesData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
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
      setParties(prev => prev.filter(p => p.id !== partyId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting party:', err);
      alert('Failed to delete party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(party => {
    const matchesSearch =
      party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.phone.includes(searchTerm);

    const matchesLocation =
      filterLocation === 'all' || party.location_group_id === filterLocation;

    const matchesType =
      filterType === 'all' || party.type === filterType;

    return matchesSearch && matchesLocation && matchesType;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

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
    <div className="space-y-6">
      {/* Header, Stats, Filters unchanged... */}

      {/* Parties List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredParties.map(party => (
          <div key={party.id} className="p-4 flex justify-between items-center border-b last:border-none hover:bg-gray-50">
            <div>
              <h4 className="font-medium text-gray-900">{party.name}</h4>
              <div className="text-xs text-gray-500">{party.location_group?.name}</div>
            </div>
            <div className="text-right">
              <div className={`font-semibold ${party.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {party.balance >= 0
                  ? `${formatCurrency(party.balance)} DR`
                  : `${formatCurrency(Math.abs(party.balance))} CR`}
              </div>
              <div className="text-xs text-gray-500">Debtor Days: {party.debtor_days}</div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleViewStatement(party)} title="View Statement">
                <FileText className="w-5 h-5 text-gray-400 hover:text-purple-600" />
              </button>
              {canEditParties && (
                <button onClick={() => handleEditParty(party)} title="Edit Party">
                  <Edit className="w-5 h-5 text-gray-400 hover:text-purple-600" />
                </button>
              )}
              {canDeleteParties && (
                confirmDelete === party.id ? (
                  <div className="flex space-x-1">
                    <button onClick={() => setConfirmDelete(null)} className="text-sm text-gray-600">Cancel</button>
                    <button onClick={() => handleDeleteParty(party.id)} className="text-sm text-red-600">Confirm</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(party.id)} title="Delete Party">
                    <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600" />
                  </button>
                )
              )}
            </div>
          </div>
        ))}
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
