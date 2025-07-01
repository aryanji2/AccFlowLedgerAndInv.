import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Plus, Trash2, Search, Check, User, Calendar, FileText, ShoppingCart, Save } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

interface CreateOrderPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  pieces: number;
  cases: number;
  unitPrice: number;
  totalPrice: number;
  piecesPerCase: number;
}

interface Party {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  balance: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  piecesPerCase: number;
  unitPrice: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const DRAFT_STORAGE_KEY = 'order_draft';

export default function CreateOrderPage({ onBack, onSuccess }: CreateOrderPageProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    orderNumber: `ORD-${Date.now()}`,
    partyId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    fetchData();
    loadDraft();
  }, [selectedFirm]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (orderItems.length > 0 || formData.partyId || formData.notes) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, orderItems]);

  const fetchData = async () => {
    try {
      // Mock data
      const mockParties: Party[] = [
        { id: '1', name: 'ABC Retailers', contact_person: 'John Smith', phone: '+91 98765 43210', balance: 75000 },
        { id: '2', name: 'XYZ Distributors', contact_person: 'Sarah Johnson', phone: '+91 87654 32109', balance: 180000 },
        { id: '3', name: 'Quick Mart', contact_person: 'Mike Chen', phone: '+91 76543 21098', balance: 95000 },
        { id: '4', name: 'Super Store', contact_person: 'Lisa Wang', phone: '+91 65432 10987', balance: 120000 },
      ];

      const mockCategories: Category[] = [
        { id: 'cat-1', name: 'Cement', color: 'bg-green-500' },
        { id: 'cat-2', name: 'Notebook', color: 'bg-blue-500' },
        { id: 'cat-3', name: 'Pidilite', color: 'bg-purple-500' },
        { id: 'cat-4', name: 'Electronics', color: 'bg-orange-500' },
        { id: 'cat-5', name: 'Stationery', color: 'bg-teal-500' },
      ];

      const mockProducts: Product[] = [
        { id: '1', name: 'Cement Bags 50kg', category: 'cat-1', piecesPerCase: 50, unitPrice: 450 },
        { id: '2', name: 'Cement Bags 25kg', category: 'cat-1', piecesPerCase: 100, unitPrice: 225 },
        { id: '3', name: 'Notebooks A4', category: 'cat-2', piecesPerCase: 20, unitPrice: 25 },
        { id: '4', name: 'Notebooks A5', category: 'cat-2', piecesPerCase: 30, unitPrice: 18 },
        { id: '5', name: 'Fevicol 100ml', category: 'cat-3', piecesPerCase: 12, unitPrice: 85 },
        { id: '6', name: 'Fevicol 500ml', category: 'cat-3', piecesPerCase: 6, unitPrice: 320 },
        { id: '7', name: 'LED Bulbs 9W', category: 'cat-4', piecesPerCase: 25, unitPrice: 120 },
        { id: '8', name: 'Pens Blue', category: 'cat-5', piecesPerCase: 50, unitPrice: 8 },
      ];

      setParties(mockParties);
      setCategories(mockCategories);
      setProducts(mockProducts);
      
      if (mockCategories.length > 0) {
        setSelectedCategory(mockCategories[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.firmId === selectedFirm?.id) {
          setHasDraft(true);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = () => {
    try {
      const draft = {
        firmId: selectedFirm?.id,
        formData,
        orderItems,
        selectedCategory,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      console.log('Draft saved automatically');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadSavedDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.firmId === selectedFirm?.id) {
          setFormData(draft.formData);
          setOrderItems(draft.orderItems);
          setSelectedCategory(draft.selectedCategory);
          setHasDraft(false);
        }
      }
    } catch (error) {
      console.error('Error loading saved draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addOrderItem = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    if (existingItem) {
      updateOrderItem(existingItem.id, 'pieces', existingItem.pieces + product.piecesPerCase);
    } else {
      const newItem: OrderItem = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        pieces: product.piecesPerCase,
        cases: 1,
        unitPrice: product.unitPrice,
        totalPrice: product.piecesPerCase * product.unitPrice,
        piecesPerCase: product.piecesPerCase,
      };
      setOrderItems([...orderItems, newItem]);
    }
    setSearchTerm('');
  };

  const updateOrderItem = (id: string, field: 'pieces' | 'cases', value: number) => {
    setOrderItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: Math.max(0, value) };
        
        if (field === 'pieces') {
          updated.cases = Math.floor(value / item.piecesPerCase);
        } else {
          updated.pieces = value * item.piecesPerCase;
        }
        
        updated.totalPrice = updated.pieces * item.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(items => items.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && (!formData.partyId || orderItems.length === 0)) {
      alert('Please select a party and add at least one item');
      return;
    }

    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const orderData = {
        ...formData,
        items: orderItems,
        totalAmount: getTotalAmount(),
        status: isDraft ? 'draft' : 'pending',
        created_by: userProfile?.id,
      };

      // If order is submitted (not draft), reserve inventory
      if (!isDraft) {
        console.log('Reserving inventory for order:', {
          orderId: orderData.orderNumber,
          items: orderItems.map(item => ({
            product_name: item.productName,
            quantity_reserved: item.pieces,
            category: products.find(p => p.id === item.productId)?.category
          })),
          action: 'reserve_inventory'
        });
        
        // Clear draft after successful submission
        clearDraft();
      } else {
        // Save as draft
        saveDraft();
      }
      
      console.log('Creating order:', orderData);
      
      if (!isDraft) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedParty = parties.find(p => p.id === formData.partyId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Create Order</h1>
              <p className="text-sm text-gray-500">{formData.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading || orderItems.length === 0 || !formData.partyId}
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Submit Order'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Draft Notice */}
        {hasDraft && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">Draft Available</div>
                  <div className="text-sm text-blue-700">You have a saved draft for this order</div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={clearDraft}
                  className="px-3 py-1 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={loadSavedDraft}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Load Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          
          <div className="space-y-4">
            {/* Party Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Party *
              </label>
              <select
                value={formData.partyId}
                onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Choose a party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name} - {party.contact_person}
                  </option>
                ))}
              </select>
              
              {selectedParty && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{selectedParty.contact_person}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{selectedParty.phone}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Current Balance: <span className="font-medium">{formatCurrency(selectedParty.balance)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedCategory === category.id
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${category.color} mx-auto mb-2 flex items-center justify-center`}>
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-medium text-gray-900">{category.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Product Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Add Products</h2>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addOrderItem(product)}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(product.unitPrice)} per piece • {product.piecesPerCase} pieces per case
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-purple-600" />
                </div>
              </button>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <div>No products found</div>
                {searchTerm && (
                  <div className="text-sm">Try adjusting your search</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        {orderItems.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items ({orderItems.length})</h2>
            
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(item.unitPrice)} per piece
                      </div>
                    </div>
                    <button
                      onClick={() => removeOrderItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cases</label>
                      <input
                        type="number"
                        value={item.cases}
                        onChange={(e) => updateOrderItem(item.id, 'cases', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Pieces</label>
                      <input
                        type="number"
                        value={item.pieces}
                        onChange={(e) => updateOrderItem(item.id, 'pieces', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {item.piecesPerCase} pieces per case
                    </div>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Order Total:</span>
                <span className="text-xl font-bold text-purple-600">
                  {formatCurrency(getTotalAmount())}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Spacing for Mobile */}
        <div className="h-20"></div>
      </div>

      {/* Fixed Bottom Actions for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading || orderItems.length === 0 || !formData.partyId}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-center font-medium"
          >
            {loading ? 'Creating...' : 'Submit Order'}
          </button>
        </div>
        
        {orderItems.length > 0 && (
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600">
              Total: <span className="font-semibold text-purple-600">{formatCurrency(getTotalAmount())}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}