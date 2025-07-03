import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Eye, Edit, MapPin, Download, Calendar, FileText, Trash2, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CreatePartyModal from './CreatePartyModal';
import LocationGroupModal from './LocationGroupModal';
import PartyStatementModal from './PartyStatementModal';
import jsPDF from 'jspdf';

// --- Interfaces (assuming they are defined as you provided) ---
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

      // Combine parties with their location groups
      const partiesWithLocationGroups = partiesData?.map(party => ({
        ...party,
        location_group: locationGroupsData?.find(lg => lg.id === party.location_group_id)
      })) || [];

      setParties(partiesWithLocationGroups);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
  
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
      const { error } = await supabase
        .from('parties')
        .update({ is_active: false }) // Soft delete
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
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      (party.name || '').toLowerCase().includes(searchTermLower) ||
      (party.contact_person || '').toLowerCase().includes(searchTermLower) ||
      (party.phone || '').includes(searchTerm);

    const matchesLocation = filterLocation === 'all' || party.location_group_id === filterLocation;

    const matchesType = filterType === 'all' || party.type === filterType;
    
    let matchesStatus = true;
    if (party.type === 'customer') {
        matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'overdue' && party.debtor_days > 60) ||
          (filterStatus === 'near_limit' && party.debtor_days > 30 && party.debtor_days <= 60) ||
          (filterStatus === 'good' && party.debtor_days <= 30);
    }

    return matchesSearch && matchesLocation && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number, type: 'customer' | 'supplier') => {
    const value = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

    if (amount === 0) return formatted;

    // For customers, positive balance means they owe us (DR - Debit)
    // For suppliers, positive balance means we owe them (CR - Credit)
    if (type === 'customer') {
        return amount > 0 ? `${formatted} DR` : `${formatted} CR`;
    } else { // Supplier
        return amount > 0 ? `${formatted} CR` : `${formatted} DR`;
    }
  };
  
  const getBalanceColor = (balance: number, type: 'customer' | 'supplier') => {
    if (type === 'customer') {
        return balance > 0 ? 'text-red-600' : 'text-green-600';
    }
    // For suppliers, a positive balance means we owe them.
    return balance > 0 ? 'text-green-600' : 'text-red-600';
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

  // --- Render logic for stats, filters, and list remains largely the same ---
  // --- For brevity, only showing the modified functions above. The JSX can stay as is. ---
  // --- Just ensure you pass the correct `party.type` to `formatCurrency` and `getBalanceColor` in the JSX ---

  return (
    <div className="space-y-6">
      {/* ... Header and Stats JSX ... */}
      
      {/* Parties List */}
      <div className="bg-white rounded-xl shadow-sm border">
        {/* ... Header ... */}
        <div className="divide-y divide-gray-200">
          {filteredParties.map((party) => (
            <div key={party.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="lg:flex lg:items-center lg:justify-between">
                {/* ... Party Info Section ... */}
                <div className="flex items-start space-x-4 flex-1 min-w-0">
                    {/* ... Icon and Name ... */}
                </div>

                <div className="flex items-center justify-between lg:justify-end lg:space-x-6 mt-4 lg:mt-0">
                  <div className="text-left lg:text-right">
                    <div className="text-sm text-gray-500">Current Balance</div>
                    <div className={`text-lg font-semibold ${getBalanceColor(party.balance, party.type)}`}>
                      {formatCurrency(party.balance, party.type)}
                    </div>
                    {party.type === 'customer' && <div className="text-xs text-gray-500">Debtor Days: {party.debtor_days}</div>}
                  </div>
                  <div className="flex items-center space-x-2">
                     <button onClick={() => handleViewStatement(party)} title="View Statement" className="p-2 text-gray-400 hover:text-purple-600"><FileText className="w-4 h-4" /></button>
                     {canEditParties && <button onClick={() => handleEditParty(party)} title="Edit Party" className="p-2 text-gray-400 hover:text-purple-600"><Edit className="w-4 h-4" /></button>}
                     {canDeleteParties && (confirmDelete === party.id ? (
                        <div className="flex items-center space-x-1">
                            <button onClick={() => setConfirmDelete(null)} className="p-1 text-xs bg-gray-200 rounded">Cancel</button>
                            <button onClick={() => handleDeleteParty(party.id)} className="p-1 text-xs bg-red-200 text-red-700 rounded">Confirm</button>
                        </div>
                     ) : (
                        <button onClick={() => setConfirmDelete(party.id)} title="Delete Party" className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                     ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* ... No parties found message ... */}
        </div>
      </div>
      
      {/* Modals */}
      <CreatePartyModal isOpen={showCreatePartyModal} onClose={() => { setShowCreatePartyModal(false); setEditingParty(null); }} onSuccess={handleDataRefresh} editingParty={editingParty} />
      {canManageLocationGroups && <LocationGroupModal isOpen={showLocationGroupModal} onClose={() => setShowLocationGroupModal(false)} locationGroups={locationGroups} onSuccess={handleDataRefresh} />}
      {selectedPartyForStatement && <PartyStatementModal isOpen={!!selectedPartyForStatement} onClose={() => setSelectedPartyForStatement(null)} party={selectedPartyForStatement} />}
    </div>
  );
}