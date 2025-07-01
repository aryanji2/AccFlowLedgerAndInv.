import React, { useState, useEffect } from 'react';
import { X, UserCheck, Mail, User, Eye, EyeOff, Building2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

type Role = 'admin' | 'accountant' | 'field_staff';

interface Firm {
  id: string;
  name: string;
  address?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  user_firm_access?: { firm_id: string }[];
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id?: string, userData: {
    full_name: string;
    email: string;
    role: Role;
    firms: string[];
    password?: string;
  }) => Promise<void>;
  editingUser?: User;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, editingUser }: CreateUserModalProps) {
  const { firms = [] } = useApp();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'field_staff' as Role,
    firms: [] as string[],
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingUser) {
      setFormData({
        full_name: editingUser.full_name || '',
        email: editingUser.email || '',
        role: editingUser.role || 'field_staff',
        firms: editingUser.user_firm_access?.map((access) => access.firm_id) || [],
        password: '',
        confirmPassword: '',
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        role: 'field_staff',
        firms: [],
        password: '',
        confirmPassword: '',
      });
    }
    setPasswordError('');
    setError('');
  }, [editingUser, isOpen]);

  const validatePassword = () => {
    if (!editingUser && !formData.password) {
      setPasswordError('Password is required');
      return false;
    }

    if (formData.password && formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validatePassword()) {
      return;
    }

    if (formData.firms.length === 0) {
      setError('Please select at least one firm');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const userData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        firms: formData.firms,
        ...(formData.password && !editingUser ? { password: formData.password } : {}),
      };

      if (editingUser) {
        await onSuccess(editingUser.id, userData);
      } else {
        await onSuccess(undefined, userData);
      }

      // Reset form only on success
      setFormData({
        full_name: '',
        email: '',
        role: 'field_staff',
        firms: [],
        password: '',
        confirmPassword: '',
      });
      setPasswordError('');
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.message.includes('duplicate key value') || error.message.includes('already exists')) {
        setError('A user with this email already exists. Please use a different email address.');
      } else if (error.message.includes('Insufficient permissions')) {
        setError('You do not have permission to perform this action. Please ensure you have admin role.');
      } else if (error.message.includes('Invalid authorization')) {
        setError('Authentication error. Please log out and log back in.');
      } else if (error.message.includes('User profile not found')) {
        setError('Your account does not have a user profile. Please contact an administrator.');
      } else {
        setError(error.message || 'Failed to save user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFirmToggle = (firmId: string) => {
    setFormData((prev) => ({
      ...prev,
      firms: prev.firms.includes(firmId)
        ? prev.firms.filter((f) => f !== firmId)
        : [...prev.firms, firmId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingUser ? 'Update user details and permissions' : 'Create a new user account with role assignment'}
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
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@company.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!!editingUser}
                />
              </div>
            </div>
          </div>

          {!editingUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {passwordError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              User Role *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: 'admin' as Role,
                  label: 'Admin',
                  icon: '👑',
                  desc: 'Full system access, user management, all features',
                  color: 'border-purple-300 bg-purple-50 text-purple-700',
                },
                {
                  value: 'accountant' as Role,
                  label: 'Accountant',
                  icon: '📊',
                  desc: 'Financial data, reports, approvals, limited admin',
                  color: 'border-blue-300 bg-blue-50 text-blue-700',
                },
                {
                  value: 'field_staff' as Role,
                  label: 'Field Staff',
                  icon: '👤',
                  desc: 'Basic operations, data entry, limited access',
                  color: 'border-green-300 bg-green-50 text-green-700',
                },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: role.value })}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    formData.role === role.value ? role.color : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{role.icon}</div>
                  <div className="font-medium">{role.label}</div>
                  <div className="text-xs mt-1 opacity-75">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Firm Access *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {firms.length > 0 ? (
                firms.map((firm: Firm) => (
                  <label
                    key={firm.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.firms.includes(firm.id)}
                      onChange={() => handleFirmToggle(firm.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{firm.name}</span>
                      {firm.address && (
                        <div className="text-xs text-gray-500">{firm.address}</div>
                      )}
                    </div>
                  </label>
                ))
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No firms available</p>
                  <p className="text-xs text-gray-400 mt-1">Create firms first to assign to users</p>
                </div>
              )}
            </div>
            {formData.firms.length === 0 && (
              <p className="text-sm text-red-600 mt-1">Please select at least one firm</p>
            )}
          </div>

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
              disabled={loading || formData.firms.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}