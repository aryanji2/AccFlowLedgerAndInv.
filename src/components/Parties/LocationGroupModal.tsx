import React, { useState } from 'react';
import { X, MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LocationGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface LocationGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationGroups: LocationGroup[];
  onSuccess: () => void;
}

export default function LocationGroupModal({ isOpen, onClose, locationGroups, onSuccess }: LocationGroupModalProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LocationGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirm || !formData.name) return;

    try {
      setLoading(true);
      
      if (editingGroup) {
        // Update existing location group
        const { error } = await supabase
          .from('location_groups')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', editingGroup.id);
          
        if (error) throw error;
      } else {
        // Create new location group
        const { error } = await supabase
          .from('location_groups')
          .insert({
            firm_id: selectedFirm.id,
            name: formData.name,
            description: formData.description,
            created_by: userProfile?.id
          });
          
        if (error) throw error;
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error saving location group:', error);
      alert('Failed to save location group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this location group?')) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('location_groups')
        .delete()
        .eq('id', groupId);
        
      if (error) throw error;
      
      onSuccess();
    } catch (error) {
      console.error('Error deleting location group:', error);
      alert('Failed to delete location group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setShowCreateForm(false);
    setEditingGroup(null);
  };

  const startEdit = (group: LocationGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
    });
    setShowCreateForm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Location Groups</h2>
              <p className="text-sm text-gray-500">Manage location groups for parties</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showCreateForm ? (
          <div className="space-y-4">
            {/* Add New Button */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">Add New Location Group</span>
            </button>

            {/* Location Groups List */}
            <div className="space-y-3">
              {locationGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{group.name}</div>
                    {group.description && (
                      <div className="text-sm text-gray-500">{group.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Created: {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(group)}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {locationGroups.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2">No location groups found</div>
                  <div className="text-sm text-gray-400">
                    Create your first location group to organize parties
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter location group name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}