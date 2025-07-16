import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Filter, Eye, Clock, Check, X, User, Receipt, TrendingUp, FileText, Download, Edit, Trash2, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DayBookEntryModal from './DayBookEntryModal';
import { useSearchParams } from 'react-router-dom';

interface DayBookEntry {
  id: string;
  firm_id: string;
  date: string;
  type: 'sale' | 'collection';
  party_name: string;
  party_id: string;
  amount: number;
  bill_number?: string;
  payment_method?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at?: string;
}

interface StaffMember {
  id: string;
  name: string;
}

export default function DayBook() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [entries, setEntries] = useState<DayBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'sale' | 'collection'>('sale');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [editingEntry, setEditingEntry] = useState<DayBookEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFirm) {
      fetchDayBookEntries();
      fetchStaffList();
    }
  }, [selectedFirm, selectedDate]);

  const fetchDayBookEntries = async () => {
    if (!selectedFirm?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      // Since daybook_entries table doesn't exist, we'll use transactions table
      // and filter for the current date
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          user_profiles!transactions_created_by_fkey (
            full_name
          ),
          parties (
            name
          )
        `)
        .eq('firm_id', selectedFirm.id)
        .eq('transaction_date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching day book entries:', error);
        setError('Failed to load entries. Please try again.');
        return;
      }

      // Transform the data to match our interface
      const transformedEntries: DayBookEntry[] = data?.map(entry => ({
        id: entry.id,
        firm_id: entry.firm_id,
        date: entry.transaction_date,
        type: entry.type === 'sale' ? 'sale' : 'collection',
        party_id: entry.party_id,
        party_name: entry.parties?.name || 'Unknown Party',
        amount: entry.amount,
        bill_number: entry.bill_number,
        payment_method: entry.payment_method,
        notes: entry.notes,
        status: entry.status,
        created_by: entry.created_by,
        created_by_name: entry.user_profiles?.full_name || 'Unknown User',
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      })) || [];

      setEntries(transformedEntries);
    } catch (error) {
      console.error('Error in fetchDayBookEntries:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    if (!selectedFirm?.id) return;

    try {
      // Use the correct foreign key relationship name
      const { data, error } = await supabase
        .from('user_firm_access')
        .select(`
          user_profiles!user_firm_access_user_id_fkey_profiles (
            id,
            full_name
          )
        `)
        .eq('firm_id', selectedFirm.id);

      if (error) {
        console.error('Error fetching staff list:', error);
        
        // Fallback: try with a simpler query structure
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('user_firm_access')
            .select(`
              user_id,
              user_profiles (
                id,
                full_name
              )
            `)
            .eq('firm_id', selectedFirm.id);

          if (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            return;
          }

          const staff: StaffMember[] = fallbackData?.map(item => ({
            id: item.user_profiles?.id || item.user_id,
            name: item.user_profiles?.full_name || 'Unknown User',
          })).filter(staff => staff.id && staff.name !== 'Unknown User') || [];

          setStaffList(staff);
        } catch (fallbackError) {
          console.error('Error in fallback staff query:', fallbackError);
        }
        return;
      }

      const staff: StaffMember[] = data?.map(item => ({
        id: item.user_profiles?.id || '',
        name: item.user_profiles?.full_name || 'Unknown User',
      })).filter(staff => staff.id && staff.name !== 'Unknown User') || [];

      setStaffList(staff);
    } catch (error) {
      console.error('Error in fetchStaffList:', error);
    }
  };

  const handleApproval = async (entryId: string, status: 'approved' | 'rejected') => {
    try {
      // Remove the manual updated_at setting to let the database trigger handle it
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status,
          approved_by: userProfile?.id
        })
        .eq('id', entryId);

      if (error) {
        console.error('Error updating entry status:', error);
        return;
      }

      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? { 
          ...entry, 
          status
        } : entry
      ));
      
      console.log(`Day book entry ${entryId} ${status}`);
    } catch (error) {
      console.error('Error updating entry status:', error);
    }
  };

  const handleEditEntry = (entry: DayBookEntry) => {
    setEditingEntry(entry);
    setModalType(entry.type);
    setShowModal(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      setLoading(true);
      
      // Delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', entryId);
        
      if (error) {
        console.error('Error deleting entry:', error);
        throw error;
      }
      
      // Update local state
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      setConfirmDelete(null);
      
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'sale' | 'collection') => {
    setModalType(type);
    setEditingEntry(null);
    setShowModal(true);
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesStaff = filterStaff === 'all' || entry.created_by === filterStaff;
    return matchesStatus && matchesType && matchesStaff;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <Receipt className="w-4 h-4" />;
      case 'collection': return <TrendingUp className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-blue-50 text-blue-600';
      case 'collection': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const dailyStats = {
    totalSales: filteredEntries.filter(e => e.type === 'sale' && e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
    totalCollections: filteredEntries.filter(e => e.type === 'collection' && e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
    pendingSales: filteredEntries.filter(e => e.type === 'sale' && e.status === 'pending').length,
    pendingCollections: filteredEntries.filter(e => e.type === 'collection' && e.status === 'pending').length,
    salesCount: filteredEntries.filter(e => e.type === 'sale').length,
    collectionsCount: filteredEntries.filter(e => e.type === 'collection').length,
  };

  const canApprove = userProfile?.role === 'admin';
  const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'accountant';
  const canDelete = userProfile?.role === 'admin';

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          onClick={fetchDayBookEntries}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-500 to-blue-500 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Day Book</h1>
            <p className="text-indigo-100 text-xs sm:text-sm lg:text-base">Daily transactions and business activities</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => openModal('sale')}
              className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
            >
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Record Sale</span>
            </button>
            <button
              onClick={() => openModal('collection')}
              className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Record Collection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Selection & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {/* Date Picker */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm lg:text-base">Select Date</h3>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm"
          />
        </div>

        {/* Daily Stats */}
        <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 lg:gap-6">
          <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-6 shadow-sm border border-gray-200">
            <div className="text-sm sm:text-lg lg:text-2xl font-bold text-blue-600">{formatCurrency(dailyStats.totalSales)}</div>
            <div className="text-xs sm:text-sm text-gray-500">Total Sales</div>
            <div className="text-xs text-gray-400">{dailyStats.salesCount} txns</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-6 shadow-sm border border-gray-200">
            <div className="text-sm sm:text-lg lg:text-2xl font-bold text-green-600">{formatCurrency(dailyStats.totalCollections)}</div>
            <div className="text-xs sm:text-sm text-gray-500">Collections</div>
            <div className="text-xs text-gray-400">{dailyStats.collectionsCount} txns</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-6 shadow-sm border border-gray-200">
            <div className="text-sm sm:text-lg lg:text-2xl font-bold text-yellow-600">{dailyStats.pendingSales}</div>
            <div className="text-xs sm:text-sm text-gray-500">Pending Sales</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-6 shadow-sm border border-gray-200">
            <div className="text-sm sm:text-lg lg:text-2xl font-bold text-orange-600">{dailyStats.pendingCollections}</div>
            <div className="text-xs sm:text-sm text-gray-500">Pending Collections</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-6 shadow-sm border border-gray-200">
            <div className="text-sm sm:text-lg lg:text-2xl font-bold text-purple-600">
              {formatCurrency(dailyStats.totalSales + dailyStats.totalCollections)}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Total Value</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales Only</option>
              <option value="collection">Collections Only</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm"
            >
              <option value="all">All Staff</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-500">
              Showing {filteredEntries.length} entries for {new Date(selectedDate).toLocaleDateString()}
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-900">
              Total: {formatCurrency(filteredEntries.reduce((sum, e) => sum + e.amount, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Day Book Entries */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Day Book Entries ({filteredEntries.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors">
              <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${getTypeColor(entry.type)} flex-shrink-0`}>
                    {getTypeIcon(entry.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-1">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">{entry.party_name}</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)} self-start`}>
                        {entry.type}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">
                      {entry.bill_number && `Bill: ${entry.bill_number}`}
                      {entry.payment_method && ` - ${entry.payment_method}`}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{entry.created_by_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end lg:space-x-4">
                  <div className="text-left lg:text-right">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">
                      {formatCurrency(entry.amount)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 capitalize">
                      {entry.type}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button className="p-1.5 sm:p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      
                      {canEdit && (
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                      
                      {canDelete && (
                        <>
                          {confirmDelete === entry.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="p-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Confirm
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(entry.id)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </>
                      )}
                      
                      {entry.status === 'pending' && canApprove && (
                        <>
                          <button
                            onClick={() => handleApproval(entry.id, 'rejected')}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleApproval(entry.id, 'approved')}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                          >
                            <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="p-6 sm:p-8 lg:p-12 text-center">
              <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2 text-sm sm:text-base">No entries found for this date</div>
              <div className="text-xs sm:text-sm text-gray-400">
                {filterType !== 'all' || filterStatus !== 'all' || filterStaff !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by recording your first sale or collection'
                }
              </div>
            </div>
          )}
        </div>
      </div> 
      {/* Day Book Entry Modal */}
      <DayBookEntryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEntry(null);
        }}
        type={modalType}
        selectedDate={selectedDate}
        onSuccess={fetchDayBookEntries}
        editingEntry={editingEntry}
      />
    </div>
  );
}