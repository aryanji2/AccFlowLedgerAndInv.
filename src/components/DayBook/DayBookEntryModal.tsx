import React, { useState, useEffect, useRef } from 'react';
import { X, Receipt, TrendingUp, Plus, Calendar, IndianRupee, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Party {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  balance: number;
  type: 'customer' | 'supplier';
}

interface DayBookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'sale' | 'collection';
  selectedDate: string;
  onSuccess: () => void;
  editingEntry?: any; // Transaction being edited
}

export default function DayBookEntryModal({ isOpen, onClose, type, selectedDate, onSuccess, editingEntry }: DayBookEntryModalProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    partyId: '',
    partyName: '',
    amount: '',
    billNumber: '',
    paymentMethod: 'cash',
    notes: '',
    date: selectedDate,
    // UPI/Bank Transfer fields
    accountNumber: '',
    // Cheque fields
    chequeNumber: '',
    dueDate: '',
    // Goods return fields
    returnDetails: '',
    returnDate: selectedDate,
  });
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [fetchingParties, setFetchingParties] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && selectedFirm) {
      fetchParties();
      
      // If editing an existing entry, populate the form
      if (editingEntry) {
        setFormData({
          partyId: editingEntry.party_id || '',
          partyName: editingEntry.party_name || '',
          amount: editingEntry.amount ? editingEntry.amount.toString() : '',
          billNumber: editingEntry.bill_number || '',
          paymentMethod: editingEntry.payment_method || 'cash',
          notes: editingEntry.notes || '',
          date: editingEntry.date || selectedDate,
          accountNumber: '',
          chequeNumber: '',
          dueDate: '',
          returnDetails: '',
          returnDate: selectedDate,
        });
      } else {
        // Reset form for new entry
        setFormData({
          partyId: '',
          partyName: '',
          amount: '',
          billNumber: '',
          paymentMethod: 'cash',
          notes: '',
          date: selectedDate,
          accountNumber: '',
          chequeNumber: '',
          dueDate: '',
          returnDetails: '',
          returnDate: selectedDate,
        });
      }
    }
  }, [isOpen, selectedFirm, editingEntry, selectedDate]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: selectedDate,
      returnDate: selectedDate
    }));
  }, [selectedDate]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = parties.filter(party => 
        (party.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.phone || '').includes(searchTerm)
      );
      setFilteredParties(filtered);
    } else {
      setFilteredParties(parties);
    }
  }, [searchTerm, parties]);
  
  // Effect to handle clicking outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowPartySearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchParties = async () => {
    if (!selectedFirm) return;
    
    try {
      setFetchingParties(true);
      
      // Fetch parties from Supabase
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching parties:', error);
        // Fallback to mock data
        useMockParties();
        return;
      }
      
      if (data && data.length > 0) {
        setParties(data);
        setFilteredParties(data);
      } else {
        // No parties found, use mock data
        useMockParties();
      }
    } catch (error) {
      console.error('Error in fetchParties:', error);
      useMockParties();
    } finally {
      setFetchingParties(false);
    }
  };
  
  const useMockParties = () => {
    // Mock parties data as fallback
    const mockParties: Party[] = [
      { 
        id: 'party-1', 
        name: 'ABC Retailers', 
        contact_person: 'John Smith', 
        phone: '+91 98765 43210', 
        balance: 75000,
        type: 'customer'
      },
      { 
        id: 'party-2', 
        name: 'XYZ Distributors', 
        contact_person: 'Sarah Johnson', 
        phone: '+91 87654 32109', 
        balance: 180000,
        type: 'customer'
      },
      { 
        id: 'party-3', 
        name: 'Quick Mart', 
        contact_person: 'Mike Chen', 
        phone: '+91 76543 21098', 
        balance: 95000,
        type: 'customer'
      },
      { 
        id: 'party-4', 
        name: 'Super Store', 
        contact_person: 'Lisa Wang', 
        phone: '+91 65432 10987', 
        balance: 120000,
        type: 'customer'
      },
      { 
        id: 'party-5', 
        name: 'Global Suppliers', 
        contact_person: 'Raj Patel', 
        phone: '+91 54321 09876', 
        balance: -50000,
        type: 'supplier'
      }
    ];
    
    setParties(mockParties);
    setFilteredParties(mockParties);
  };

  const handlePartySelect = (party: Party) => {
    setFormData({
      ...formData,
      partyId: party.id,
      partyName: party.name
    });
    setShowPartySearch(false);
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date();
    const selectedTransactionDate = new Date(formData.date);

    if (selectedTransactionDate > today) {
      alert('Future dates are not allowed for transactions.');
      return;
    }

    if (!selectedFirm || (!formData.partyId && !formData.partyName)) {
      alert('Please select or enter a party');
      return;
    }

    if (!formData.amount) {
      alert('Please enter an amount');
      return;
    }

    try {
      setLoading(true);
      
      // Determine if this is a new entry or an update
      if (editingEntry) {
        // Update existing transaction - remove party_name from the data sent to Supabase
        const transactionData = {
          firm_id: selectedFirm.id,
          party_id: formData.partyId || null,
          type: type,
          amount: parseFloat(formData.amount),
          // All collections now require approval, regardless of payment method
          status: 'pending',
          bill_number: formData.billNumber || null,
          payment_method: type === 'collection' ? formData.paymentMethod : null,
          notes: formData.notes || null,
          transaction_date: formData.date,
        };

        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingEntry.id);

        if (error) {
          console.error('Error updating transaction:', error);
          throw error;
        }

        // If it's a cheque, update the cheque record if it exists
        if (type === 'collection' && formData.paymentMethod === 'cheque') {
          // Check if a cheque record exists
          const { data: existingCheques, error: chequeError } = await supabase
            .from('cheques')
            .select('id')
            .eq('firm_id', selectedFirm.id)
            .eq('party_id', formData.partyId)
            .eq('amount', parseFloat(formData.amount))
            .eq('received_date', formData.date);
            
          if (chequeError) {
            console.error('Error checking for existing cheque:', chequeError);
          } else if (existingCheques && existingCheques.length > 0) {
            // Update existing cheque
            const { error: updateError } = await supabase
              .from('cheques')
              .update({
                cheque_number: formData.chequeNumber,
                due_date: formData.dueDate,
              })
              .eq('id', existingCheques[0].id);
              
            if (updateError) {
              console.error('Error updating cheque record:', updateError);
            }
          } else {
            // Create new cheque record
            const chequeData = {
              firm_id: selectedFirm.id,
              party_id: formData.partyId || null,
              cheque_number: formData.chequeNumber,
              amount: parseFloat(formData.amount),
              received_date: formData.date,
              due_date: formData.dueDate,
              status: 'pending',
              bank_name: '',
              created_by: userProfile?.id || null
            };
            
            const { error: chequeCreateError } = await supabase
              .from('cheques')
              .insert(chequeData);
              
            if (chequeCreateError) {
              console.error('Error creating cheque record:', chequeCreateError);
            }
          }
        }
      } else {
        // Create new transaction - remove party_name from the data sent to Supabase
        const transactionData = {
          firm_id: selectedFirm.id,
          party_id: formData.partyId || null,
          type: type,
          amount: parseFloat(formData.amount),
          // All collections now require approval, regardless of payment method
          status: 'pending',
          bill_number: formData.billNumber || null,
          payment_method: type === 'collection' ? formData.paymentMethod : null,
          notes: formData.notes || null,
          transaction_date: formData.date,
          created_by: userProfile?.id || null
        };

        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (error) {
          console.error('Error creating transaction:', error);
          throw error;
        }

        // If it's a cheque, also create a cheque record
        if (type === 'collection' && formData.paymentMethod === 'cheque' && formData.chequeNumber && formData.dueDate) {
          const chequeData = {
            firm_id: selectedFirm.id,
            party_id: formData.partyId || null,
            cheque_number: formData.chequeNumber,
            amount: parseFloat(formData.amount),
            received_date: formData.date,
            due_date: formData.dueDate,
            status: 'pending',
            bank_name: '',
            created_by: userProfile?.id || null
          };
          
          const { error: chequeError } = await supabase
            .from('cheques')
            .insert(chequeData);
            
          if (chequeError) {
            console.error('Error creating cheque record:', chequeError);
            // Don't throw error here, as the transaction was already created
          }
        }
      }

      onSuccess();
      onClose();
      setFormData({
        partyId: '',
        partyName: '',
        amount: '',
        billNumber: '',
        paymentMethod: 'cash',
        notes: '',
        date: selectedDate,
        accountNumber: '',
        chequeNumber: '',
        dueDate: '',
        returnDetails: '',
        returnDate: selectedDate,
      });
    } catch (error) {
      console.error('Error creating day book entry:', error);
      alert('Failed to create entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethodFields = () => {
    if (type !== 'collection') return null;

    switch (formData.paymentMethod) {
      case 'upi':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Enter UPI account number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
        );

      case 'cheque':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cheque Number *
              </label>
              <input
                type="text"
                value={formData.chequeNumber}
                onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                placeholder="Enter cheque number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        );

      case 'bank_transfer':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Enter bank account number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
        );

      case 'goods_return':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Details *
              </label>
              <textarea
                value={formData.returnDetails}
                onChange={(e) => setFormData({ ...formData, returnDetails: e.target.value })}
                placeholder="Describe the goods being returned"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Date *
              </label>
              <input
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              type === 'sale' ? 'bg-green-50' : 'bg-blue-50'
            }`}>
              {type === 'sale' ? (
                <Receipt className={`w-5 h-5 ${type === 'sale' ? 'text-green-600' : 'text-blue-600'}`} />
              ) : (
                <TrendingUp className={`w-5 h-5 ${type === 'sale' ? 'text-green-600' : 'text-blue-600'}`} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEntry ? `Edit ${type === 'sale' ? 'Sale' : 'Collection'}` : `Record ${type === 'sale' ? 'Sale' : 'Collection'}`}
              </h2>
              <p className="text-sm text-gray-500">
                Enter transaction details
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Party Selection */}
          <div ref={searchContainerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Party Name *
            </label>
            <div className="relative">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={formData.partyName}
                    onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                    placeholder="Enter or search party name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onFocus={() => setShowPartySearch(true)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPartySearch(true)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Party Search Dropdown */}
              {showPartySearch && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search parties..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    {fetchingParties ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading parties...</p>
                      </div>
                    ) : filteredParties.length > 0 ? (
                      filteredParties.map(party => (
                        <button
                          key={party.id}
                          type="button"
                          onClick={() => handlePartySelect(party)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{party.name}</div>
                          <div className="text-sm text-gray-500">
                            {party.contact_person} • {party.phone}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        {searchTerm ? 'No matching parties found' : 'No parties available'}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowPartySearch(false)}
                      className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>

          {/* Bill Number (for sales) */}
          {type === 'sale' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number
              </label>
              <input
                type="text"
                value={formData.billNumber}
                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                placeholder="Enter bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Payment Method (for collections) */}
          {type === 'collection' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { value: 'cash', label: 'Cash', icon: '💵' },
                  { value: 'upi', label: 'UPI', icon: '📱' },
                  { value: 'cheque', label: 'Cheque', icon: '🏦' },
                  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏧' },
                  { value: 'goods_return', label: 'Goods Return', icon: '📦' },
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      formData.paymentMethod === method.value
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{method.icon}</div>
                    <div className="text-xs font-medium">{method.label}</div>
                  </button>
                ))}
              </div>

              {/* Payment Method Specific Fields */}
              <div className="mt-4">
                {renderPaymentMethodFields()}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Approval Notice */}
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 text-yellow-700 text-sm">
              <span>⚠️</span>
              <span>All entries require admin approval before being processed</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
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
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                type === 'sale'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Submitting...' : editingEntry ? 'Update' : `Submit ${type === 'sale' ? 'Sale' : 'Collection'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}