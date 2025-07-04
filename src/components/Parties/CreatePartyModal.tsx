import React, { useState, useEffect } from 'react';
import {
  X, Users, MapPin, Phone, Mail, Building, Plus, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LocationGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingParty?: any;
}

export default function CreatePartyModal({
  isOpen,
  onClose,
  onSuccess,
  editingParty
}: CreatePartyModalProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();

  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    locationGroupId: '',
    type: 'customer' as 'customer' | 'supplier',
    openingBalance: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLocationGroupModal, setShowLocationGroupModal] = useState(false);
  const [newLocationGroupName, setNewLocationGroupName] = useState('');

  // Fetch location groups when modal opens
  useEffect(() => {
    if (isOpen) {
      (async () => {
        const { data, error } = await supabase
          .from('location_groups')
          .select('id, name')
          .eq('firm_id', selectedFirm?.id)
          .order('name');
        if (!error && data) setLocationGroups(data);
      })();
    }
  }, [isOpen, selectedFirm]);

  // Populate form if editing
  useEffect(() => {
    if (editingParty) {
      setFormData({
        name: editingParty.name || '',
        contactPerson: editingParty.contact_person || '',
        phone: editingParty.phone || '',
        email: editingParty.email || '',
        address: editingParty.address || '',
        locationGroupId: editingParty.location_group_id || '',
        type: editingParty.type || 'customer',
        openingBalance: String(editingParty.opening_balance ?? 0),
      });
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        locationGroupId: locationGroups[0]?.id || '',
        type: 'customer',
        openingBalance: '0',
      });
    }
    setErrors({});
  }, [editingParty, locationGroups]);

  const validateForm = () => {
    const err: Record<string, string> = {};
    if (!formData.name.trim()) err.name = 'Party name is required';
    if (!formData.contactPerson.trim()) err.contactPerson = 'Contact person is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      err.email = 'Invalid email';
    if (!formData.locationGroupId) err.locationGroupId = 'Select a location group';
    if (isNaN(Number(formData.openingBalance)))
      err.openingBalance = 'Enter a valid number';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirm || !userProfile) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create or update party
      const payload = {
        firm_id: selectedFirm.id,
        name: formData.name,
        contact_person: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        location_group_id: formData.locationGroupId,
        type: formData.type,
        opening_balance: parseFloat(formData.openingBalance || '0'),
        updated_at: new Date().toISOString(),
      };
      if (editingParty) {
        const { error } = await supabase
          .from('parties')
          .update(payload)
          .eq('id', editingParty.id);
        if (error) throw error;
      } else {
        await supabase
          .from('parties')
          .insert({
            ...payload,
            created_by: userProfile.id,
            debtor_days: 0,
          });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving party:', err);
      alert('Failed to save party. Check console.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {editingParty ? 'Edit Party' : 'Add New Party'}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Party Name */}
          <div>
            <label className="block text-sm font-medium">Party Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border p-2 rounded"
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium">Contact Person *</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full border p-2 rounded"
            />
            {errors.contactPerson && <p className="text-red-600 text-sm">{errors.contactPerson}</p>}
          </div>

          {/* Location Group */}
          <div>
            <label className="block text-sm font-medium">Location Group *</label>
            <select
              value={formData.locationGroupId}
              onChange={e => setFormData({ ...formData, locationGroupId: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="">Select group</option>
              {locationGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {errors.locationGroupId && <p className="text-red-600 text-sm">{errors.locationGroupId}</p>}
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-sm font-medium">Opening Balance</label>
            <input
              type="number"
              value={formData.openingBalance}
              onChange={e => setFormData({ ...formData, openingBalance: e.target.value })}
              className="w-full border p-2 rounded"
            />
            {errors.openingBalance && <p className="text-red-600 text-sm">{errors.openingBalance}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingParty ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
