import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Trash2, Search, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  availablePieces?: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    orderNumber: `ORD-${Date.now()}`,
    partyId: '',
    partyName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, selectedFirm]);

  useEffect(() => {
    if (partySearchTerm) {
      const filtered = parties.filter(party => 
        party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
        party.contact_person.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
        party.phone.includes(partySearchTerm)
      );
      setFilteredParties(filtered);
    } else {
      setFilteredParties(parties);
    }
  }, [partySearchTerm, parties]);

  const fetchData = async () => {
    try {
      // Mock categories
      const mockCategories: Category[] = [
        { id: 'cat-1', name: 'Cement', color: 'bg-green-500' },
        { id: 'cat-2', name: 'Notebook', color: 'bg-blue-500' },
        { id: 'cat-3', name: 'Pidilite', color: 'bg-purple-500' },
        { id: 'cat-4', name: 'Electronics', color: 'bg-orange-500' },
        { id: 'cat-5', name: 'Stationery', color: 'bg-teal-500' },
      ];

      // Mock products
      const mockProducts: Product[] = [
        { id: 'prod-1', name: 'Cement Bags 50kg', category: 'cat-1', piecesPerCase: 50, unitPrice: 450, availablePieces: 1200 },
        { id: 'prod-2', name: 'Cement Bags 25kg', category: 'cat-1', piecesPerCase: 100, unitPrice: 225, availablePieces: 800 },
        { id: 'prod-3', name: 'Notebooks A4', category: 'cat-2', piecesPerCase: 20, unitPrice: 25, availablePieces: 500 },
        { id: 'prod-4', name: 'Notebooks A5', category: 'cat-2', piecesPerCase: 30, unitPrice: 18, availablePieces: 750 },
        { id: 'prod-5', name: 'Fevicol 100ml', category: 'cat-3', piecesPerCase: 12, unitPrice: 85, availablePieces: 360 },
        { id: 'prod-6', name: 'Fevicol 500ml', category: 'cat-3', piecesPerCase: 6, unitPrice: 320, availablePieces: 180 },
        { id: 'prod-7', name: 'LED Bulbs 9W', category: 'cat-4', piecesPerCase: 25, unitPrice: 120, availablePieces: 625 },
        { id: 'prod-8', name: 'Pens Blue', category: 'cat-5', piecesPerCase: 50, unitPrice: 8, availablePieces: 1500 },
      ];

      // Mock parties
      const mockParties: Party[] = [
        { id: 'party-1', name: 'ABC Retailers', contact_person: 'John Smith', phone: '+91 98765 43210', balance: 75000 },
        { id: 'party-2', name: 'XYZ Distributors', contact_person: 'Sarah Johnson', phone: '+91 87654 32109', balance: 180000 },
        { id: 'party-3', name: 'Quick Mart', contact_person: 'Mike Chen', phone: '+91 76543 21098', balance: 95000 },
        { id: 'party-4', name: 'Super Store', contact_person: 'Lisa Wang', phone: '+91 65432 10987', balance: 120000 },
      ];

      setCategories(mockCategories);
      setProducts(mockProducts);
      setParties(mockParties);
      setFilteredParties(mockParties);
      
      if (mockCategories.length > 0) {
        setSelectedCategory(mockCategories[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handlePartySelect = (party: Party) => {
    setFormData({
      ...formData,
      partyId: party.id,
      partyName: party.name
    });
    setShowPartySearch(false);
    setPartySearchTerm('');
    setErrors({
      ...errors,
      party: ''
    });
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
        
        // Auto-calculate the other field
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

  const validateOrder = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.partyId && !formData.partyName) {
      newErrors.party = 'Please select or enter a party';
    }
    
    if (orderItems.length === 0) {
      newErrors.items = 'Please add at least one item to the order';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateOrder()) {
      return;
    }

    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const orderData = {
        firm_id: selectedFirm?.id,
        party_id: formData.partyId,
        party_name: formData.partyName,
        order_number: formData.orderNumber,
        status: isDraft ? 'draft' : 'pending',
        total_amount: getTotalAmount(),
        order_date: formData.date,
        notes: formData.notes,
        created_by: userProfile?.id,
        items: orderItems.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          pieces: item.pieces,
          cases: item.cases,
          pieces_per_case: item.piecesPerCase,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        }))
      };

      // If order is submitted (not draft), reserve inventory
      if (!isDraft) {
        console.log('Reserving inventory for order:', {
          orderId: orderData.order_number,
          items: orderItems.map(item => ({
            product_id: item.productId,
            product_name: item.productName,
            quantity_reserved: item.pieces
          })),
          action: 'reserve_inventory'
        });
      }
      
      console.log('Order created:', orderData);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedParty = parties.find(p => p.id === formData.partyId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Order Management</h2>
                <p className="text-sm text-gray-500">Create New Order</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Create New Order</h3>
            <p className="text-gray-600">Fill out the form below to submit a new order to your inventory system</p>
          </div>

          {/* Order Details */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Order Details</h4>
            <p className="text-gray-600 mb-6">Add customer information and order details</p>
            
            <div className="space-y-4">
              {/* Order Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number
                </label>
                <input
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="Enter order number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

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
                        className={`w-full px-3 py-2 border ${errors.party ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                        onFocus={() => setShowPartySearch(true)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPartySearch(true)}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
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
                          value={partySearchTerm}
                          onChange={(e) => setPartySearchTerm(e.target.value)}
                          placeholder="Search parties..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
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
                            {partySearchTerm ? 'No matching parties found' : 'No parties available'}
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
                {errors.party && (
                  <p className="mt-1 text-sm text-red-600">{errors.party}</p>
                )}
                
                {selectedParty && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{selectedParty.name}</div>
                        <div className="text-sm text-gray-600">{selectedParty.contact_person} • {selectedParty.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Current Balance:</div>
                        <div className="font-medium text-gray-900">{formatCurrency(selectedParty.balance)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
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
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Select Category</h4>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Order Items</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="mb-6 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addOrderItem(product)}
                    className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(product.unitPrice)} per piece • {product.piecesPerCase} pieces per case
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        Available: {product.availablePieces || 0} pcs
                      </div>
                      <Plus className="w-5 h-5 text-purple-600" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  {searchTerm ? 'No products match your search' : 'No products available in this category'}
                </div>
              )}
            </div>

            {/* Order Items Table */}
            {orderItems.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cases
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pieces
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">
                            {item.piecesPerCase} pieces per case
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.cases}
                            onChange={(e) => updateOrderItem(item.id, 'cases', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.pieces}
                            onChange={(e) => updateOrderItem(item.id, 'pieces', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => removeOrderItem(item.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="text-gray-500 mb-2">No items added to this order</div>
                <div className="text-sm text-gray-400">
                  Search and select products from above to add them to your order
                </div>
              </div>
            )}

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div className="text-sm text-red-600">{errors.items}</div>
                </div>
              </div>
            )}

            {/* Order Total */}
            {orderItems.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Order Total:</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              disabled={loading}
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit Order'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}