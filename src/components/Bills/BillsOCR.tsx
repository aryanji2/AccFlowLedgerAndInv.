import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Camera, 
  Check, 
  X, 
  Eye, 
  Clock, 
  AlertTriangle,
  Package,
  Search,
  Filter,
  Download,
  Edit,
  Trash2
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import BillUploadModal from './BillUploadModal';
import ManualBillEntryModal from './ManualBillEntryModal';
import BillReviewModal from './BillReviewModal';

interface Bill {
  id: string;
  firm_id: string;
  bill_number: string;
  supplier_name: string;
  total_amount: number;
  bill_date: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  ocr_text?: string;
  parsed_data?: any;
  file_url?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  items?: BillItem[];
}

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  pieces_per_case: number;
  unit_price: number;
  total_price: number;
  category: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function BillsOCR() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (selectedFirm) {
      fetchData();
    }
  }, [selectedFirm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Mock categories
      const mockCategories: Category[] = [
        { id: 'cat-1', name: 'Cement', color: 'bg-green-500' },
        { id: 'cat-2', name: 'Notebook', color: 'bg-blue-500' },
        { id: 'cat-3', name: 'Pidilite', color: 'bg-purple-500' },
        { id: 'cat-4', name: 'Electronics', color: 'bg-orange-500' },
        { id: 'cat-5', name: 'Stationery', color: 'bg-teal-500' },
      ];

      // Mock bills data
      const mockBills: Bill[] = [
        {
          id: 'bill-1',
          firm_id: selectedFirm?.id || '',
          bill_number: 'BILL-001',
          supplier_name: 'ABC Suppliers Ltd',
          total_amount: 125000,
          bill_date: '2024-01-15',
          category: 'Cement',
          status: 'pending',
          created_by: 'user-1',
          created_by_name: 'John Staff',
          created_at: new Date().toISOString(),
          items: [
            {
              id: 'item-1',
              product_name: 'Cement Bags 50kg',
              quantity: 200,
              pieces_per_case: 50,
              unit_price: 450,
              total_price: 90000,
              category: 'Cement'
            },
            {
              id: 'item-2',
              product_name: 'Cement Bags 25kg',
              quantity: 150,
              pieces_per_case: 100,
              unit_price: 225,
              total_price: 33750,
              category: 'Cement'
            }
          ]
        },
        {
          id: 'bill-2',
          firm_id: selectedFirm?.id || '',
          bill_number: 'BILL-002',
          supplier_name: 'XYZ Stationery Co',
          total_amount: 45000,
          bill_date: '2024-01-14',
          category: 'Notebook',
          status: 'approved',
          created_by: 'user-2',
          created_by_name: 'Sarah Manager',
          created_at: new Date().toISOString(),
          items: [
            {
              id: 'item-3',
              product_name: 'Notebooks A4',
              quantity: 1000,
              pieces_per_case: 20,
              unit_price: 25,
              total_price: 25000,
              category: 'Notebook'
            },
            {
              id: 'item-4',
              product_name: 'Notebooks A5',
              quantity: 800,
              pieces_per_case: 30,
              unit_price: 18,
              total_price: 14400,
              category: 'Notebook'
            }
          ]
        }
      ];

      setCategories(mockCategories);
      setBills(mockBills);
    } catch (error) {
      console.error('Error fetching bills data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBillApproval = async (billId: string, status: 'approved' | 'rejected') => {
    try {
      const bill = bills.find(b => b.id === billId);
      if (!bill) return;

      // Update bill status
      setBills(prev => prev.map(b => 
        b.id === billId ? { ...b, status } : b
      ));

      // If approved, update inventory
      if (status === 'approved' && bill.items) {
        console.log('Updating inventory for approved bill:', {
          billId,
          items: bill.items,
          action: 'add_to_inventory'
        });
        
        // Here you would update the actual inventory
        // For each item in the bill, add to inventory
        bill.items.forEach(item => {
          console.log('Adding to inventory:', {
            product_name: item.product_name,
            quantity_added: item.quantity,
            category: item.category
          });
        });
      }

      console.log(`Bill ${billId} ${status}`);
    } catch (error) {
      console.error('Error updating bill status:', error);
    }
  };

  const handleBillUpload = async (billData: any) => {
    try {
      const newBill: Bill = {
        id: `bill-${Date.now()}`,
        firm_id: selectedFirm?.id || '',
        ...billData,
        status: 'pending',
        created_by: userProfile?.id || '',
        created_by_name: userProfile?.full_name || '',
        created_at: new Date().toISOString(),
      };

      setBills(prev => [newBill, ...prev]);
      setShowUploadModal(false);
      
      console.log('Bill uploaded:', newBill);
    } catch (error) {
      console.error('Error uploading bill:', error);
    }
  };

  const handleManualEntry = async (billData: any) => {
    try {
      const newBill: Bill = {
        id: `bill-${Date.now()}`,
        firm_id: selectedFirm?.id || '',
        ...billData,
        status: 'pending',
        created_by: userProfile?.id || '',
        created_by_name: userProfile?.full_name || '',
        created_at: new Date().toISOString(),
      };

      setBills(prev => [newBill, ...prev]);
      setShowManualModal(false);
      
      console.log('Manual bill entry:', newBill);
    } catch (error) {
      console.error('Error creating manual bill:', error);
    }
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch = bill.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || bill.category === selectedCategory;
    const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
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

  const stats = {
    total: bills.length,
    pending: bills.filter(b => b.status === 'pending').length,
    approved: bills.filter(b => b.status === 'approved').length,
    rejected: bills.filter(b => b.status === 'rejected').length,
    totalAmount: bills.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.total_amount, 0),
  };

  const canApproveBills = userProfile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-500 to-blue-500 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Bills & OCR</h1>
            <p className="text-green-100 text-xs sm:text-sm lg:text-base">Upload bill photos and review parsed data before updating inventory</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Upload Bill Photo / PDF</span>
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-6">
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Bills</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs sm:text-sm text-gray-500">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-xs sm:text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs sm:text-sm text-gray-500">Rejected</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Value</div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900 text-sm sm:text-base">Select Category</h3>
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.name
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200">
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="text-xs sm:text-sm text-gray-500 flex items-center">
              Showing {filteredBills.length} of {bills.length} bills
            </div>
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Bills ({filteredBills.length})
            </h3>
            <div className="flex space-x-2">
              <div className="flex items-center space-x-2 text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-yellow-600" />
                <span>Pending Review ({stats.pending})</span>
              </div>
              <div className="flex items-center space-x-2 text-xs sm:text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Approved ({stats.approved})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredBills.map((bill) => (
            <div key={bill.id} className="p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors">
              <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{bill.supplier_name}</h4>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 self-start">
                        {bill.category}
                      </span>
                    </div>
                    
                    <div className="space-y-1 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-3 sm:gap-2 lg:gap-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Bill: {bill.bill_number}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Date: {new Date(bill.bill_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Items: {bill.items?.length || 0}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      Created by {bill.created_by_name} on {new Date(bill.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end lg:space-x-6">
                  <div className="text-left lg:text-right">
                    <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                      {formatCurrency(bill.total_amount)}
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedBill(bill);
                        setShowReviewModal(true);
                      }}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    {bill.status === 'pending' && canApproveBills && (
                      <>
                        <button
                          onClick={() => handleBillApproval(bill.id, 'rejected')}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Reject"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleBillApproval(bill.id, 'approved')}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Approve"
                        >
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredBills.length === 0 && (
            <div className="p-6 sm:p-8 lg:p-12 text-center">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 mb-2 text-sm sm:text-base">No bills pending review</div>
              <div className="text-xs sm:text-sm text-gray-400">
                {searchTerm || selectedCategory !== 'all' || filterStatus !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Upload a bill photo to get started'
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <BillUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        categories={categories}
        onSuccess={handleBillUpload}
      />

      <ManualBillEntryModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        categories={categories}
        onSuccess={handleManualEntry}
      />

      {selectedBill && (
        <BillReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBill(null);
          }}
          bill={selectedBill}
          onApprove={(billId) => handleBillApproval(billId, 'approved')}
          onReject={(billId) => handleBillApproval(billId, 'rejected')}
          canApprove={canApproveBills}
        />
      )}
    </div>
  );
}