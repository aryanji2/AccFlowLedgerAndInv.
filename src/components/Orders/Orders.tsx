import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Eye, Clock, Check, X, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import CreateOrderPage from './CreateOrderPage';
import OrderDetailsModal from './OrderDetailsModal';

interface Order {
  id: string;
  orderNumber: string;
  party: string;
  partyId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  createdBy: string;
  notes?: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  productName: string;
  pieces: number;
  cases: number;
  unitPrice: number;
  totalPrice: number;
  piecesPerCase: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  availablePieces: number;
  availableCases: number;
  piecesPerCase: number;
  unitPrice: number;
  reservedPieces: number;
  lowStock: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function Orders() {
  const { selectedFirm } = useApp();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      orderNumber: 'ORD-001',
      party: 'ABC Retailers',
      partyId: '1',
      status: 'pending',
      totalAmount: 45000,
      itemCount: 3,
      createdAt: new Date().toISOString(),
      createdBy: 'Field Staff',
      notes: 'Urgent delivery required',
      items: [
        {
          id: 'item-1',
          productName: 'Cement Bags 50kg',
          pieces: 100,
          cases: 2,
          unitPrice: 450,
          totalPrice: 45000,
          piecesPerCase: 50,
        }
      ]
    },
    {
      id: '2',
      orderNumber: 'ORD-002',
      party: 'XYZ Distributors',
      partyId: '2',
      status: 'approved',
      totalAmount: 28000,
      itemCount: 2,
      createdAt: new Date().toISOString(),
      createdBy: 'Admin',
    },
    {
      id: '3',
      orderNumber: 'ORD-003',
      party: 'Quick Mart',
      partyId: '3',
      status: 'draft',
      totalAmount: 15000,
      itemCount: 1,
      createdAt: new Date().toISOString(),
      createdBy: 'Field Staff',
    },
  ]);

  const [categories] = useState<Category[]>([
    { id: 'cat-1', name: 'Cement', color: 'bg-green-500' },
    { id: 'cat-2', name: 'Notebook', color: 'bg-blue-500' },
    { id: 'cat-3', name: 'Pidilite', color: 'bg-purple-500' },
    { id: 'cat-4', name: 'Electronics', color: 'bg-orange-500' },
    { id: 'cat-5', name: 'Stationery', color: 'bg-teal-500' },
  ]);

  const [inventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Cement Bags 50kg',
      category: 'Cement',
      categoryColor: 'bg-green-500',
      availablePieces: 1200,
      availableCases: 24,
      piecesPerCase: 50,
      unitPrice: 450,
      reservedPieces: 100,
      lowStock: false,
    },
    {
      id: '2',
      name: 'Notebooks A4',
      category: 'Notebook',
      categoryColor: 'bg-blue-500',
      availablePieces: 500,
      availableCases: 25,
      piecesPerCase: 20,
      unitPrice: 25,
      reservedPieces: 0,
      lowStock: true,
    },
    {
      id: '3',
      name: 'Fevicol 100ml',
      category: 'Pidilite',
      categoryColor: 'bg-purple-500',
      availablePieces: 360,
      availableCases: 30,
      piecesPerCase: 12,
      unitPrice: 85,
      reservedPieces: 24,
      lowStock: false,
    },
    {
      id: '4',
      name: 'LED Bulbs 9W',
      category: 'Electronics',
      categoryColor: 'bg-orange-500',
      availablePieces: 625,
      availableCases: 25,
      piecesPerCase: 25,
      unitPrice: 120,
      reservedPieces: 50,
      lowStock: false,
    },
    {
      id: '5',
      name: 'Pens Blue',
      category: 'Stationery',
      categoryColor: 'bg-teal-500',
      availablePieces: 150,
      availableCases: 3,
      piecesPerCase: 50,
      unitPrice: 8,
      reservedPieces: 0,
      lowStock: true,
    },
  ]);

  const handleOrderApproval = async (orderId: string, status: 'approved' | 'rejected') => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Update order status
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status } : o
      ));

      if (status === 'approved') {
        // Update inventory - reduce available stock and reserved stock
        console.log('Updating inventory for approved order:', {
          orderId,
          action: 'reduce_inventory_and_reserved'
        });
      } else if (status === 'rejected') {
        // Release reserved inventory
        console.log('Releasing reserved inventory for rejected order:', {
          orderId,
          action: 'release_reserved_inventory'
        });
      }

      console.log(`Order ${orderId} ${status}`);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleEditOrder = (orderId: string) => {
    // In a real app, you would load the order data for editing
    console.log('Edit order:', orderId);
    setShowCreateOrder(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status === 'pending') {
        // Release reserved inventory if order was pending
        console.log('Releasing reserved inventory for deleted order:', {
          orderId,
          action: 'release_reserved_inventory'
        });
      }

      setOrders(prev => prev.filter(o => o.id !== orderId));
      console.log('Order deleted:', orderId);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

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
      case 'draft': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredInventory = inventory.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const canApproveOrders = userProfile?.role === 'admin';

  if (showCreateOrder) {
    return (
      <CreateOrderPage
        onBack={() => setShowCreateOrder(false)}
        onSuccess={() => {
          setShowCreateOrder(false);
          // Refresh orders
        }}
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Orders & Inventory</h1>
            <p className="text-purple-100 text-xs sm:text-sm lg:text-base">Manage orders and track inventory levels</p>
          </div>
          <button
            onClick={() => setShowCreateOrder(true)}
            className="flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-3 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inventory
            </button>
          </nav>
        </div>

        {activeTab === 'orders' && (
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Filters */}
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="text-xs sm:text-sm text-gray-500">
                Showing {filteredOrders.length} of {orders.length} orders
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3 sm:space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-purple-300 transition-colors">
                  <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">{order.party}</div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {order.orderNumber} • {order.itemCount} items • By {order.createdBy}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        {order.notes && (
                          <div className="text-xs text-blue-600 mt-1">
                            Note: {order.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                      <div className="text-left sm:text-right">
                        <div className="font-semibold text-gray-900 text-sm sm:text-base">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button 
                          onClick={() => handleViewOrder(order)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        
                        {(order.status === 'draft' || order.status === 'pending') && (
                          <button
                            onClick={() => handleEditOrder(order.id)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Order"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        
                        {order.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        
                        {order.status === 'pending' && canApproveOrders && (
                          <>
                            <button
                              onClick={() => handleOrderApproval(order.id, 'rejected')}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Reject Order"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleOrderApproval(order.id, 'approved')}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Approve Order"
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

              {filteredOrders.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <Package className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2 text-sm sm:text-base">No orders found</div>
                  <button
                    onClick={() => setShowCreateOrder(true)}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base"
                  >
                    Create your first order
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Category Navigation */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Categories</h3>
              </div>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-purple-100 text-purple-700'
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
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {filteredInventory.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${item.categoryColor} flex items-center justify-center`}>
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.name}</div>
                    </div>
                    {item.lowStock && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">
                        Low Stock
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-500 mb-3">Category: {item.category}</div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Available Cases:</span>
                      <span className="font-medium">{item.availableCases}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Available Pieces:</span>
                      <span className="font-medium">{item.availablePieces}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Reserved:</span>
                      <span className="font-medium">{item.reservedPieces}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Unit Price:</span>
                      <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {item.piecesPerCase} pieces per case
                    </div>
                  </div>
                </div>
              ))}

              {filteredInventory.length === 0 && (
                <div className="col-span-full text-center py-8 sm:py-12">
                  <Package className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2 text-sm sm:text-base">No inventory items found</div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'Inventory items will appear here'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onApprove={canApproveOrders ? handleOrderApproval : undefined}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
}