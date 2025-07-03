import React, { useState, useEffect } from 'react';
import { X, Users, MapPin, Phone, Mail, Building, Search, Plus, AlertTriangle } from 'lucide-react';
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

export default function CreatePartyModal({ isOpen, onClose, onSuccess, editingParty }: CreatePartyModalProps) {
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
    openingBalance: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLocationGroupModal, setShowLocationGroupModal] = useState(false);
  const [newLocationGroupName, setNewLocationGroupName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLocationGroups();
    }
  }, [isOpen, selectedFirm]);

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
        openingBalance: editingParty.balance ? editingParty.balance.toString() : '',
      });
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        locationGroupId: locationGroups.length > 0 ? locationGroups[0].id : '',
        type: 'customer',
        openingBalance: '',
      });
    }
    setErrors({});
  }, [editingParty, isOpen, locationGroups]);

  const fetchLocationGroups = async () => {
    if (!selectedFirm) return;
    
    try {
      const { data, error } = await supabase
        .from('location_groups')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .order('name');
        
      if (error) {
        console.error('Error fetching location groups:', error);
        return;
      }
      
      setLocationGroups(data || []);
    } catch (error) {
      console.error('Error in fetchLocationGroups:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Party name is required';
    }
    
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.phone && !/^(\+\d{1,3}[- ]?)?\d{10}$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.locationGroupId && !newLocationGroupName) {
      newErrors.locationGroupId = 'Please select a location group';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirm) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Create new location group if needed
      let locationGroupId = formData.locationGroupId;
      if (newLocationGroupName && !formData.locationGroupId) {
        // Create a new location group
        const { data: newLocationGroup, error: locationGroupError } = await supabase
          .from('location_groups')
          .insert({
            firm_id: selectedFirm.id,
            name: newLocationGroupName,
            created_by: userProfile?.id
          })
          .select()
          .single();
          
        if (locationGroupError) {
          console.error('Error creating location group:', locationGroupError);
          throw locationGroupError;
        }
        
        locationGroupId = newLocationGroup.id;
        
        // Update location groups list
        setLocationGroups(prev => [...prev, newLocationGroup]);
      }
      
      const partyData = {
        firm_id: selectedFirm.id,
        name: formData.name,
        contact_person: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        location_group_id: locationGroupId,
        type: formData.type,
        balance: parseFloat(formData.openingBalance) || 0,
        debtor_days: 0, // New parties start with 0 debtor days
        created_by: userProfile?.id,
      };

      if (editingParty) {
        // Update existing party
        const { error } = await supabase
          .from('parties')
          .update(partyData)
          .eq('id', editingParty.id);
          
        if (error) throw error;
      } else {
        // Create new party
        const { error } = await supabase
          .from('parties')
          .insert(partyData);
          
        if (error) throw error;
      }
      onSuccess();
      onClose();
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        locationGroupId: locationGroups.length > 0 ? locationGroups[0].id : '',
        type: 'customer',
        openingBalance: '',
      });
      setNewLocationGroupName('');
    } catch (error) {
      console.error('Error saving party:', error);
      alert('Failed to save party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddLocationGroup = async () => {
    if (!newLocationGroupName.trim()) {
      setErrors({
        ...errors,
        newLocationGroup: 'Location group name is required'
      });
      return;
    }

    try {
      if (!selectedFirm) return;
      
      const { data, error } = await supabase
        .from('location_groups')
        .insert({
          firm_id: selectedFirm.id,
          name: newLocationGroupName.trim(),
          created_by: userProfile?.id
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating location group:', error);
        throw error;
      }
      
      // Update location groups list
      setLocationGroups(prev => [...prev, data]);
      
      // Set the new location group as selected
      setFormData({
        ...formData,
        locationGroupId: data.id
      });
      
      setNewLocationGroupName('');
      setShowLocationGroupModal(false);
      setErrors({
        ...errors,
        newLocationGroup: '',
        locationGroupId: ''
      });
    } catch (error) {
      console.error('Error creating location group:', error);
      alert('Failed to create location group. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingParty ? 'Edit Party' : 'Add New Party'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingParty ? 'Update party details' : 'Create a new customer or supplier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Party Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Party Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'customer', label: 'Customer', icon: '👤' },
                { value: 'supplier', label: 'Supplier', icon: '🏢' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value as 'customer' | 'supplier' })}
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    formData.type === type.value
                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Party Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter party name"
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Enter contact person name"
                className={`w-full px-3 py-2 border ${errors.contactPerson ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                required
              />
              {errors.contactPerson && (
                <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-10 pr-3 py-2 border ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                  className={`w-full pl-10 pr-3 py-2 border ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Location Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Group *
            </label>
            <div className="relative">
              {!showLocationGroupModal ? (
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={formData.locationGroupId}
                      onChange={(e) => setFormData({ ...formData, locationGroupId: e.target.value })}
                      className={`w-full pl-10 pr-3 py-2 border ${errors.locationGroupId ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    >
                      <option value="">Select location group</option>
                      {locationGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationGroupModal(true)}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newLocationGroupName}
                      onChange={(e) => setNewLocationGroupName(e.target.value)}
                      placeholder="Enter new location group name"
                      className={`flex-1 px-3 py-2 border ${errors.newLocationGroup ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddLocationGroup}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationGroupModal(false)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {errors.locationGroupId && !showLocationGroupModal && (
                <p className="mt-1 text-sm text-red-600">{errors.locationGroupId}</p>
              )}
              {errors.newLocationGroup && showLocationGroupModal && (
                <p className="mt-1 text-sm text-red-600">{errors.newLocationGroup}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter complete address"
                rows={3}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Balance
            </label>
            <input
              type="number"
              value={formData.openingBalance}
              onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              Positive for receivables (customer owes you), negative for payables (you owe supplier)
            </p>
          </div>

          {/* Validation Errors Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Please fix the following errors:</p>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {Object.values(errors).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingParty ? 'Update Party' : 'Create Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}