import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Filter, Eye, Edit, MapPin, Download, Calendar,
  FileText, Trash2, AlertCircle
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CreatePartyModal from './CreatePartyModal';
import LocationGroupModal from './LocationGroupModal';
import PartyStatementModal from './PartyStatementModal';
import jsPDF from 'jspdf';

interface Party {
  id: string;
  firm_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  location_group_id: string;
  location_group?: { id: string; name: string };
  type: 'customer' | 'supplier';
  debtor_days: number;
  last_payment_date?: string;
  created_at: string;
  balance: number;
}

export default function Parties() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [locationGroups, setLocationGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [selectedPartyForStatement, setSelectedPartyForStatement] = useState<Party | null>(null);

  const canEditParties = userProfile?.role === 'admin' || userProfile?.role === 'accountant';
  const canDeleteParties = userProfile?.role === 'admin';
  const canManageLocationGroups = userProfile?.role === 'admin';

  useEffect(() => {
    if (selectedFirm?.id) {
      fetchParties();
    }
  }, [selectedFirm]);

  const fetchParties = async () => {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('firm_id', selectedFirm?.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch parties:', error);
      return;
    }

    const enriched = await Promise.all(
      data.map(async (party: Party) => {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('party_id', party.id)
          .eq('firm_id', selectedFirm?.id)
          .eq('status', 'approved');

        let balance = 0;
        transactions?.forEach(t => {
          if (t.type === 'sale') balance += t.amount;
          if (t.type === 'collection') balance -= t.amount;
        });

        return { ...party, balance };
      })
    );

    setParties(enriched);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));

  const getBalanceColor = (balance: number) =>
    balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600';

  const getBalanceText = (balance: number) =>
    balance > 0 ? `${formatCurrency(balance)} DR` :
    balance < 0 ? `${formatCurrency(Math.abs(balance))} CR` : '₹0';

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setShowCreatePartyModal(true);
  };

  const handleDeleteParty = async (id: string) => {
    await supabase.from('parties').update({ is_active: false }).eq('id', id);
    fetchParties();
  };

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <input
          type="text"
          className="border px-3 py-2 rounded-md w-full max-w-sm"
          placeholder="Search parties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-md"
            onClick={() => setShowCreatePartyModal(true)}
          >
            <Plus size={16} className="inline-block mr-1" />
            Add Party
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredParties.map(party => (
          <div
            key={party.id}
            className="border p-4 rounded-lg shadow-sm bg-white flex justify-between items-start"
          >
            <div>
              <div className="font-semibold text-lg">{party.name}</div>
              <div className="text-sm text-gray-500">{party.contact_person}</div>
              <div className="text-xs text-gray-400">{party.phone}</div>
              <div className="mt-2 text-sm">
                Balance:{' '}
                <span className={`font-medium ${getBalanceColor(party.balance)}`}>
                  {getBalanceText(party.balance)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPartyForStatement(party)}
                title="View Statement"
              >
                <FileText className="w-4 h-4 text-gray-500 hover:text-purple-600" />
              </button>
              {canEditParties && (
                <button onClick={() => handleEditParty(party)} title="Edit">
                  <Edit className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                </button>
              )}
              {canDeleteParties && (
                <button onClick={() => handleDeleteParty(party.id)} title="Delete">
                  <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreatePartyModal
        isOpen={showCreatePartyModal}
        onClose={() => {
          setShowCreatePartyModal(false);
          setEditingParty(null);
          fetchParties();
        }}
        editingParty={editingParty}
        onSuccess={fetchParties}
      />

      {selectedPartyForStatement && (
        <PartyStatementModal
          isOpen={!!selectedPartyForStatement}
          onClose={() => setSelectedPartyForStatement(null)}
          party={selectedPartyForStatement}
        />
      )}

      {canManageLocationGroups && (
        <LocationGroupModal
          isOpen={false}
          onClose={() => {}}
          locationGroups={locationGroups}
          onSuccess={fetchParties}
        />
      )}
    </div>
  );
}
