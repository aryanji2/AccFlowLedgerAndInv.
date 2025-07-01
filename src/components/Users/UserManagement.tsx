import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Edit, Trash2, Mail, Building2, Shield, ToggleLeft, ToggleRight, AlertCircle, Info, Database, ExternalLink, Settings, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { userService } from '../../lib/userService';
import CreateUserModal from './CreateUserModal';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'accountant' | 'field_staff';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  user_firm_access?: Array<{
    firm_id: string;
    firms: {
      id: string;
      name: string;
    };
  }>;
}

export default function UserManagement() {
  const { userProfile } = useAuth();
  const { firms, assignUserToFirm, removeUserFromFirm } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [creatingAdminProfile, setCreatingAdminProfile] = useState(false);
  const [adminProfileSuccess, setAdminProfileSuccess] = useState(false);

  useEffect(() => {
    fetchUsers();
    checkCurrentUserRole();
  }, []);

  const checkCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserRole(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching current user role:', error);
        setCurrentUserRole(null);
      } else {
        setCurrentUserRole(profile?.role || null);
      }
    } catch (error) {
      console.error('Error checking current user role:', error);
      setCurrentUserRole(null);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionError(null);
      
      // Use userService to fetch all users
      const fetchedUsers = await userService.getAllUsers();
      
      // Check if we're using mock data
      const isMock = fetchedUsers.some(user => user.id.includes('admin-1') || user.id.includes('mock'));
      setIsUsingMockData(isMock);
      
      if (!isMock) {
        // Fetch user firm access for real data
        const { data: firmAccess, error: accessError } = await supabase
          .from('user_firm_access')
          .select(`
            user_id,
            firm_id,
            firms (
              id,
              name
            )
          `);
        
        if (accessError) {
          console.error('Error fetching firm access:', accessError);
        }
        
        // Combine the data
        const usersWithAccess = fetchedUsers.map(user => {
          // Find all firm access entries for this user
          const userFirmAccess = firmAccess
            ?.filter(access => access.user_id === user.id)
            .map(access => ({
              firm_id: access.firm_id,
              firms: access.firms
            }));
          
          return {
            ...user,
            user_firm_access: userFirmAccess
          };
        });
        
        setUsers(usersWithAccess);
      } else {
        // For mock data, the firm access is already included
        setUsers(fetchedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
      setIsUsingMockData(true);
      
      // Fallback to mock data
      const mockUsers = [
        {
          id: 'admin-1',
          full_name: 'Admin User',
          email: 'admin@accflow.com',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          user_firm_access: firms.map(firm => ({
            firm_id: firm.id,
            firms: { id: firm.id, name: firm.name }
          }))
        },
        {
          id: 'accountant-1',
          full_name: 'John Accountant',
          email: 'accountant@accflow.com',
          role: 'accountant',
          is_active: true,
          created_at: new Date().toISOString(),
          user_firm_access: firms.slice(0, 2).map(firm => ({
            firm_id: firm.id,
            firms: { id: firm.id, name: firm.name }
          }))
        },
        {
          id: 'field-1',
          full_name: 'Field Staff',
          email: 'field@accflow.com',
          role: 'field_staff',
          is_active: true,
          created_at: new Date().toISOString(),
          user_firm_access: firms.slice(0, 1).map(firm => ({
            firm_id: firm.id,
            firms: { id: firm.id, name: firm.name }
          }))
        }
      ];
      
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userId: string | undefined, userData: any) => {
    try {
      setLoading(true);
      setPermissionError(null);
      
      // Validate userData
      if (!userData || !userData.email) {
        throw new Error('User data is missing or invalid');
      }
      
      // Use userService to create user
      const newUser = await userService.createUser({
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        role: userData.role,
        firms: userData.firms || []
      });
      
      // Add firm access information for UI display
      const userWithFirmAccess = {
        ...newUser,
        user_firm_access: (userData.firms || []).map((firmId: string) => ({
          firm_id: firmId,
          firms: firms.find(f => f.id === firmId) || { id: firmId, name: 'Unknown Firm' }
        }))
      };
      
      setUsers(prev => [userWithFirmAccess, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Provide more helpful error message based on error type
      if (error.message.includes('duplicate key value violates unique constraint "user_profiles_pkey"')) {
        setPermissionError('A user profile with this ID already exists. This usually happens when the user was created in Supabase Auth but the profile creation failed. Please try deleting the user from Supabase Auth first, or contact an administrator.');
      } else if (error.message.includes('does not have a user profile')) {
        setPermissionError('Your account does not have a user profile. Click "Create Admin Profile" below to automatically create one, or manually add a record to the user_profiles table with your user ID and role set to "admin".');
      } else if (error.message.includes('does not have admin permissions') || error.message.includes('Insufficient permissions')) {
        setPermissionError('You do not have admin permissions to create users. Click "Create Admin Profile" below if you should be an admin, or contact an existing administrator.');
      } else if (error.message.includes('Failed to fetch')) {
        alert('Network error. Please check your connection and try again.');
      } else if (error.message.includes('Invalid authorization')) {
        setPermissionError('Authentication error. Please log out and log back in with an admin account.');
      } else if (error.message.includes('Database connection error')) {
        setPermissionError('Database connection error. Please check your Supabase configuration and ensure the database is accessible.');
      } else if (error.message.includes('duplicate key value')) {
        alert('A user with this email already exists. Please use a different email address.');
      } else {
        alert(`Failed to create user: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (userId: string, userData: any) => {
    try {
      setLoading(true);
      setPermissionError(null);
      
      // Validate userData
      if (!userData) {
        throw new Error('User data is missing');
      }
      
      // Use userService to update user
      const updatedUser = await userService.updateUser(userId, {
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active !== false,
        firms: userData.firms || []
      });
      
      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          // Get updated firm access
          const updatedFirmAccess = (userData.firms || []).map((firmId: string) => ({
            firm_id: firmId,
            firms: firms.find(f => f.id === firmId) || { id: firmId, name: 'Unknown Firm' }
          }));
          
          return { 
            ...updatedUser,
            user_firm_access: updatedFirmAccess
          };
        }
        return user;
      }));
      
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error.message.includes('Insufficient permissions')) {
        setPermissionError('You do not have admin permissions to update users.');
      } else {
        alert('Failed to update user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      setPermissionError(null);
      
      // Check current user role before attempting deletion
      if (currentUserRole !== 'admin') {
        setPermissionError('You do not have admin permissions to delete users. Please ensure your account has the "admin" role in the user_profiles table.');
        return;
      }
      
      // Use userService to delete user
      await userService.deleteUser(userId);
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error.message.includes('Insufficient permissions') || error.message.includes('does not have admin role')) {
        setPermissionError('You do not have admin permissions to delete users. Please ensure your account has the "admin" role in the user_profiles table.');
      } else if (error.message.includes('Invalid authorization')) {
        setPermissionError('Authentication error. Please log out and log back in with an admin account.');
      } else {
        alert('Failed to delete user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newStatus = !user.is_active;
      
      // Use userService to toggle user status
      await userService.toggleUserStatus(userId, newStatus);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_active: newStatus }
          : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
      
      if (error.message.includes('Insufficient permissions')) {
        setPermissionError('You do not have admin permissions to modify user status.');
      } else {
        alert('Failed to update user status. Please try again.');
      }
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'accountant' | 'field_staff') => {
    try {
      // Use userService to update user role
      await userService.updateUserRole(userId, newRole);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole }
          : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      
      if (error.message.includes('Insufficient permissions')) {
        setPermissionError('You do not have admin permissions to change user roles.');
      } else {
        alert('Failed to update user role. Please try again.');
      }
    }
  };

  const createAdminProfile = async () => {
    try {
      setCreatingAdminProfile(true);
      setAdminProfileSuccess(false);
      setPermissionError(null);
      
      const profile = await userService.createAdminProfile();
      
      if (profile) {
        setAdminProfileSuccess(true);
        setCurrentUserRole('admin');
        setPermissionError(null);
        
        // Refresh users list
        await checkCurrentUserRole();
        await fetchUsers();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setAdminProfileSuccess(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error creating admin profile:', error);
      
      if (error.message.includes('duplicate key value violates unique constraint')) {
        setPermissionError('User profile already exists. Please check your role in the database or contact an administrator.');
      } else {
        setPermissionError(`Failed to create admin profile: ${error.message}`);
      }
    } finally {
      setCreatingAdminProfile(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'accountant': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'field_staff': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'accountant': return <UserCheck className="w-4 h-4" />;
      case 'field_staff': return <UserCheck className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  const getUserFirms = (user: User) => {
    if (!user.user_firm_access || user.user_firm_access.length === 0) return 'No firms assigned';
    
    // Handle both array of objects with firms property and direct array of firm objects
    return user.user_firm_access
      .map(access => {
        if (access.firms) {
          return access.firms.name || 'Unknown Firm';
        } else {
          return 'Unknown Firm';
        }
      })
      .join(', ');
  };

  const canManageUsers = currentUserRole === 'admin';

  if (!canManageUsers && !isUsingMockData) {
    return (
      <div className="p-6 text-center">
        <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <div className="text-gray-500 mb-2">Access Denied</div>
        <div className="text-sm text-gray-400 mb-4">
          Only administrators can manage users
        </div>
        
        {/* Current user role info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
          <div className="text-amber-800 font-medium mb-2">Your Current Role</div>
          <div className="text-amber-700 text-sm">
            {currentUserRole ? (
              <>Role: <span className="font-medium">{currentUserRole}</span></>
            ) : (
              'No user profile found'
            )}
          </div>
        </div>

        {/* Success message */}
        {adminProfileSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Admin profile created successfully!</span>
            </div>
            <div className="text-green-700 text-sm mt-1">
              You now have admin permissions. The page will refresh automatically.
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {!currentUserRole && (
            <button
              onClick={createAdminProfile}
              disabled={creatingAdminProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingAdminProfile ? 'Creating Admin Profile...' : 'Create Admin Profile'}
            </button>
          )}
          
          <button
            onClick={() => {
              checkCurrentUserRole();
              fetchUsers();
            }}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Manual instructions */}
        <div className="mt-6 text-left max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Manual Setup Instructions</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>1. Go to your Supabase project dashboard</p>
            <p>2. Navigate to Table Editor → user_profiles</p>
            <p>3. Find your user account or create a new record</p>
            <p>4. Set the 'role' column to 'admin'</p>
            <p>5. Set 'is_active' to true</p>
            <p>6. Click the refresh button above</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and firm access</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              checkCurrentUserRole();
              fetchUsers();
            }}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canManageUsers || isUsingMockData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Success message */}
      {adminProfileSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium">Admin Profile Created Successfully!</p>
              <p className="text-green-700 text-sm">
                You now have admin permissions and can manage users. The interface has been updated automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Permission Error */}
      {permissionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Permission Error</p>
              <p className="text-red-700 text-sm mb-3">{permissionError}</p>
              <div className="text-sm text-red-700">
                <p className="font-medium mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to your Supabase project dashboard</li>
                  <li>Navigate to Table Editor → user_profiles</li>
                  <li>Find your user account ({userProfile?.email || 'your email'})</li>
                  <li>Change the 'role' column to 'admin'</li>
                  <li>Refresh this page</li>
                </ol>
                <p className="mt-2 text-xs">
                  If you don't see your user in the user_profiles table, you may need to create a record with your user ID and role set to 'admin'.
                </p>
              </div>
              <div className="flex items-center space-x-3 mt-3">
                <button 
                  onClick={() => setPermissionError(null)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Dismiss
                </button>
                {!currentUserRole && (
                  <button
                    onClick={createAdminProfile}
                    disabled={creatingAdminProfile}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {creatingAdminProfile ? 'Creating...' : 'Create Admin Profile'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mock Data Notice */}
      {isUsingMockData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Demo Mode</p>
              <p className="text-blue-700 text-sm">
                You're currently viewing demo data. To use real user management features, please configure your Supabase connection and ensure your user has admin permissions in the database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={fetchUsers}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Guide for New Users */}
      {!isUsingMockData && users.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium">No Users Found</p>
              <p className="text-amber-700 text-sm mb-3">
                It looks like you haven't set up any users yet. To get started with user management:
              </p>
              <div className="text-sm text-amber-700">
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Create your first admin user in Supabase Authentication</li>
                  <li>Set their role to 'admin' in the user_profiles table</li>
                  <li>Log in with that account to manage other users</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Setup Guide */}
      {!isUsingMockData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Settings className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-gray-800 font-medium">Database Setup Required</p>
              <p className="text-gray-700 text-sm mb-3">
                To use user management features, ensure your database is properly configured:
              </p>
              <div className="text-sm text-gray-700">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your user account must exist in the <code className="bg-gray-200 px-1 rounded">user_profiles</code> table</li>
                  <li>Your role must be set to <code className="bg-gray-200 px-1 rounded">'admin'</code></li>
                  <li>The Supabase Edge Functions must be deployed and accessible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">User Roles Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <div>
              <div className="font-medium text-purple-900">Admin</div>
              <div className="text-purple-700">Full system access, user management</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">Accountant</div>
              <div className="text-blue-700">Financial data, reports, approvals</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-green-600" />
            <div>
              <div className="font-medium text-green-900">Field Staff</div>
              <div className="text-green-700">Basic operations, data entry</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Users ({users.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-lg">
                      {user.full_name.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{user.full_name}</h4>
                      
                      {/* Role Selector */}
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)} cursor-pointer`}
                        disabled={user.id === userProfile?.id || isUsingMockData || !canManageUsers} // Can't change own role or in demo mode
                      >
                        <option value="admin">Admin</option>
                        <option value="accountant">Accountant</option>
                        <option value="field_staff">Field Staff</option>
                      </select>

                      {/* Status Toggle */}
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={user.id === userProfile?.id || isUsingMockData || !canManageUsers} // Can't deactivate self or in demo mode
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                            : 'text-red-600 bg-red-50 hover:bg-red-100'
                        } transition-colors ${(user.id === userProfile?.id || isUsingMockData || !canManageUsers) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {user.is_active ? (
                          <>
                            <ToggleRight className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-1 text-sm text-gray-500">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">Firms:</span>
                      <span className="text-gray-700">{getUserFirms(user)}</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {user.last_login ? (
                        <>Last login: {new Date(user.last_login).toLocaleDateString()}</>
                      ) : (
                        'Never logged in'
                      )}
                      {' • '}
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingUser(user)}
                    disabled={isUsingMockData || !canManageUsers}
                    className={`p-2 text-gray-400 hover:text-blue-600 transition-colors ${(isUsingMockData || !canManageUsers) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isUsingMockData ? "Not available in demo mode" : !canManageUsers ? "Admin permissions required" : "Edit User"}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  {user.id !== userProfile?.id && (
                    <>
                      {confirmDelete === user.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isUsingMockData || !canManageUsers}
                            className={`px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 ${(isUsingMockData || !canManageUsers) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(user.id)}
                          disabled={isUsingMockData || !canManageUsers}
                          className={`p-2 text-gray-400 hover:text-red-600 transition-colors ${(isUsingMockData || !canManageUsers) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isUsingMockData ? "Not available in demo mode" : !canManageUsers ? "Admin permissions required" : "Delete User"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && !loading && (
            <div className="p-12 text-center">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2">No users found</div>
              <div className="text-sm text-gray-400">
                Create your first user to get started
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      <CreateUserModal
        isOpen={showCreateModal || !!editingUser}
        onClose={() => {
          setShowCreateModal(false);
          setEditingUser(null);
        }}
        onSuccess={editingUser ? handleEditUser : handleCreateUser}
        editingUser={editingUser}
      />
    </div>
  );
}