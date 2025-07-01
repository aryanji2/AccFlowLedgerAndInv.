import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, Upload, PiggyBank } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PayableCheque {
  id: string;
  firm_id: string;
  party_name: string;
  amount: number;
  due_date: string;
  status: 'upcoming' | 'paid' | 'cancelled';
  notes?: string;
  paid_date?: string;
  created_by: string;
  created_at: string;
}

export default function PayableCheques() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [payableCheques, setPayableCheques] = useState<PayableCheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCheque, setNewCheque] = useState({ party_name: '', amount: '', due_date: '' });

  useEffect(() => {
    if (selectedFirm) {
      fetchPayableCheques();
    }
  }, [selectedFirm]);

  const fetchPayableCheques = async () => {
    if (!selectedFirm?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payable_cheques')
        .select('*')
        .eq('firm_id', selectedFirm.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setPayableCheques(data || []);
    } catch (error) {
      console.error('Error fetching payable cheques:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirm || !userProfile || !newCheque.party_name || !newCheque.amount || !newCheque.due_date) {
        alert("Please fill all fields.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('payable_cheques')
            .insert([{
                firm_id: selectedFirm.id,
                party_name: newCheque.party_name,
                amount: parseFloat(newCheque.amount),
                due_date: newCheque.due_date,
                created_by: userProfile.id,
                status: 'upcoming'
            }])
            .select();

        if (error) throw error;
        
        if(data) {
            setPayableCheques(prev => [...prev, ...data]);
        }
        setIsModalOpen(false);
        setNewCheque({ party_name: '', amount: '', due_date: '' });

    } catch(error) {
        console.error("Error adding payable cheque: ", error);
        alert("Failed to add cheque.");
    }
  }

  const handleStatusUpdate = async (chequeId: string, newStatus: 'paid' | 'cancelled') => {
    const confirmMessage = newStatus === 'paid' 
        ? 'Are you sure you want to mark this cheque as paid?'
        : 'Are you sure you want to cancel this cheque?';
    
    if(!confirm(confirmMessage)) return;

    try {
        const updateData: any = { status: newStatus };
        if (newStatus === 'paid') {
            updateData.paid_date = new Date().toISOString().split('T')[0];
        }

        const { error } = await supabase
            .from('payable_cheques')
            .update(updateData)
            .eq('id', chequeId);
        
        if (error) throw error;

        fetchPayableCheques(); // Refetch to get the latest data
    } catch (error) {
        console.error("Error updating status: ", error);
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status === 'upcoming';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };
  
  const totalUpcomingAmount = payableCheques
    .filter(c => c.status === 'upcoming')
    .reduce((sum, c) => sum + c.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {/* Header and Add Button */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">Payable Cheques</h3>
                <p className="text-sm text-gray-500">
                    Total Upcoming Payments: <span className="font-bold text-blue-600">{formatCurrency(totalUpcomingAmount)}</span>
                </p>
            </div>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow"
            >
                <Plus className="w-5 h-5" />
                <span>Add Payable Cheque</span>
            </button>
        </div>

        {/* List of Payable Cheques */}
        <div className="space-y-3">
            {payableCheques.map((cheque) => (
            <div
                key={cheque.id}
                className={`p-4 bg-white rounded-lg shadow-sm border-l-4 transition-colors ${
                isOverdue(cheque.due_date, cheque.status)
                    ? 'border-red-500 bg-red-50'
                    : cheque.status === 'paid' 
                    ? 'border-green-500'
                    : 'border-blue-500'
                }`}
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-4 mb-3 md:mb-0">
                        <div className={`p-2 rounded-full ${
                             isOverdue(cheque.due_date, cheque.status) ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                           <PiggyBank className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{cheque.party_name}</p>
                            <p className="text-sm text-gray-500">
                                Due on: {new Date(cheque.due_date).toLocaleDateString()}
                                {isOverdue(cheque.due_date, cheque.status) && (
                                    <span className="ml-2 text-xs font-bold text-red-600">(Overdue)</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end md:space-x-6">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(cheque.amount)}</p>
                        
                        {cheque.status === 'upcoming' && (
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleStatusUpdate(cheque.id, 'cancelled')} className="p-2 text-xs flex items-center space-x-1 text-gray-500 hover:text-red-600"><XCircle className="w-4 h-4"/><span>Cancel</span></button>
                                <button onClick={() => handleStatusUpdate(cheque.id, 'paid')} className="p-2 text-xs flex items-center space-x-1 text-green-600 bg-green-50 rounded-md hover:bg-green-100"><CheckCircle className="w-4 h-4"/><span>Mark as Paid</span></button>
                            </div>
                        )}
                        {cheque.status === 'paid' && (
                            <div className="text-sm text-green-600 font-semibold flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5" />
                                <span>Paid on {new Date(cheque.paid_date!).toLocaleDateString()}</span>
                            </div>
                        )}
                        {cheque.status === 'cancelled' && (
                             <div className="text-sm text-gray-500 font-semibold flex items-center space-x-2">
                                <XCircle className="w-5 h-5" />
                                <span>Cancelled</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            ))}
            {payableCheques.length === 0 && (
                 <div className="text-center py-12 text-gray-500">
                    <Upload className="mx-auto w-12 h-12 text-gray-300 mb-2"/>
                    <p>No payable cheques found.</p>
                    <p className="text-sm text-gray-400">Click "Add Payable Cheque" to get started.</p>
                </div>
            )}
        </div>

        {/* Add Cheque Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Payable Cheque</h2>
                    <form onSubmit={handleAddCheque} className="space-y-4">
                        <div>
                            <label htmlFor="party_name" className="block text-sm font-medium text-gray-700">Party Name</label>
                            <input
                                id="party_name" type="text" required
                                value={newCheque.party_name}
                                onChange={(e) => setNewCheque({...newCheque, party_name: e.target.value})}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                            <input
                                id="amount" type="number" required
                                value={newCheque.amount}
                                onChange={(e) => setNewCheque({...newCheque, amount: e.target.value})}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">Due Date</label>
                            <input
                                id="due_date" type="date" required
                                value={newCheque.due_date}
                                onChange={(e) => setNewCheque({...newCheque, due_date: e.target.value})}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Cheque</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}