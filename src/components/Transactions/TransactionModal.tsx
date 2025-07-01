import React, { useState, useEffect } from 'react';
import { X, Receipt, TrendingUp, Plus, Calendar, IndianRupee, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { mockAuth } from '../../lib/mockAuth';

interface Party {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  balance: number;
  type: 'customer' | 'supplier';
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'sale' | 'collection';
  onSuccess: () => void;
}

export default function TransactionModal({ isOpen, onClose, type, onSuccess }: TransactionModalProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    billNumber: '',
    partyId: '',
    partyName: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'cash',
    notes: '',
    accountNumber: '',
    chequeNumber: '',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartySearch, setShowPartySearch] = useState(false);

  useEffect(() => {
    if (isOpen && selectedFirm) {
      fetchParties();
    }
  }, [isOpen, selectedFirm]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = parties.filter(party => 
        party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        party.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        party.phone.includes(searchTerm)
      );
      setFilteredParties(filtered);
    } else {
      setFilteredParties(parties);
    }
  }, [searchTerm, parties]);

  const fetchParties = async () => {
    try {
      if (!selectedFirm) return;
      
      // Mock parties data
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
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
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
    if (!selectedFirm || (!formData.partyId && !formData.partyName) || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const transactionData = {
        firm_id: selectedFirm.id,
        party_id: formData.partyId,
        party_name: formData.partyName,
        type,
        amount: parseFloat(formData.amount),
        status: type === 'collection' && formData.paymentMethod === 'cash' ? 'approved' : 'pending',
        bill_number: formData.billNumber || null,
        payment_method: type === 'collection' ? formData.paymentMethod : null,
        notes: formData.notes || null,
        transaction_date: formData.date,
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      };

      console.log('Transaction created:', transactionData);

      // If it's a cheque, also create a cheque record
      if (type === 'collection' && formData.paymentMethod === 'cheque') {
        const chequeData = {
          firm_id: selectedFirm.id,
          party_id: formData.partyId,
          party_name: formData.partyName,
          cheque_number: formData.chequeNumber,
          amount: parseFloat(formData.amount),
          received_date: formData.date,
          due_date: formData.dueDate,
          status: 'pending',
          created_by: userProfile?.id,
        };
        console.log('Cheque record created:', chequeData);
      }

      onSuccess();
      onClose();
      setFormData({
        billNumber: '',
        partyId: '',
        partyName: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'cash',
        notes: '',
        accountNumber: '',
        chequeNumber: '',
        dueDate: '',
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
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
              type === 'sale' ? 'bg-blue-50' : 'bg-teal-50'
            }`}>
              {type === 'sale' ? (
                <Receipt className={`w-5 h-5 ${type === 'sale' ? 'text-blue-600' : 'text-teal-600'}`} />
              ) : (
                <TrendingUp className={`w-5 h-5 ${type === 'sale' ? 'text-blue-600' : 'text-teal-600'}`} />
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {type === 'sale' ? 'Record Sale' : 'Record Collection'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bill Number (only for sales) */}
          {type === 'sale' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number *
              </label>
              <input
                type="text"
                value={formData.billNumber}
                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                placeholder="Enter bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Party Selection */}
          <div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onFocus={() => setShowPartySearch(true)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPartySearch(true)}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    {filteredParties.length > 0 ? (
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

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Payment Method (only for collections) */}
          {type === 'collection' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <div className="grid grid-cols-3 gap-2">
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
                        ? 'border-teal-300 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{method.icon}</div>
                    <div className="text-sm font-medium">{method.label}</div>
                  </button>
                ))}
              </div>
              {formData.paymentMethod === 'cash' && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-700 text-sm">
                    <span>✓</span>
                    <span>Cash collections are automatically approved</span>
                  </div>
                </div>
              )}

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-teal-600 hover:bg-teal-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Saving...' : `Save ${type === 'sale' ? 'Sale' : 'Collection'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}