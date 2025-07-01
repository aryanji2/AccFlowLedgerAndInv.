import React, { useState } from 'react';
import { X, Building2, MapPin, Phone, Mail, FileText, Package, Users, TrendingUp, Calendar, BarChart3, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface Firm {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gst_number: string;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
  total_parties?: number;
  total_transactions?: number;
  monthly_revenue?: number;
}

interface Category {
  id: string;
  firm_id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  product_count?: number;
}

interface FirmDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  firm: Firm;
  categories: Category[];
}

export default function FirmDetailsModal({ isOpen, onClose, firm, categories }: FirmDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportFirmReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text(`${firm.name} - Detailed Report`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Firm Information
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Firm Information', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${firm.name}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Address: ${firm.address}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Phone: ${firm.phone}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Email: ${firm.email}`, 20, yPosition);
    yPosition += 8;
    doc.text(`GST Number: ${firm.gst_number}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Status: ${firm.status}`, 20, yPosition);
    
    // Business Metrics
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Business Metrics', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Parties: ${firm.total_parties || 0}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Transactions: ${firm.total_transactions || 0}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Monthly Revenue: ${formatCurrency(firm.monthly_revenue || 0)}`, 20, yPosition);
    
    // Categories
    if (categories.length > 0) {
      yPosition += 20;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Product Categories', 20, yPosition);
      
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      categories.forEach((category) => {
        doc.text(`• ${category.name}: ${category.product_count || 0} products`, 20, yPosition);
        if (category.description) {
          yPosition += 6;
          doc.text(`  ${category.description}`, 25, yPosition);
        }
        yPosition += 8;
      });
    }
    
    doc.save(`${firm.name.toLowerCase().replace(/\s+/g, '-')}-report.pdf`);
  };

  // Mock data for demonstration
  const mockMetrics = {
    monthlyGrowth: 15.2,
    averageOrderValue: 12500,
    topProducts: [
      { name: 'Cement Bags 50kg', sales: 45000 },
      { name: 'Notebooks A4', sales: 28000 },
      { name: 'Fevicol 100ml', sales: 18000 },
    ],
    recentActivity: [
      { date: '2024-01-15', activity: 'New order from ABC Retailers', amount: 25000 },
      { date: '2024-01-14', activity: 'Payment received from XYZ Corp', amount: 18000 },
      { date: '2024-01-13', activity: 'New party added: Quick Mart', amount: 0 },
    ],
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{firm.name}</h2>
                <p className="text-sm text-gray-500">Firm Details & Analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportFirmReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'categories', label: 'Categories', icon: Package },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Company Name</div>
                        <div className="text-gray-900">{firm.name}</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Address</div>
                        <div className="text-gray-900">{firm.address}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Phone</div>
                        <div className="text-gray-900">{firm.phone}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Email</div>
                        <div className="text-gray-900">{firm.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">GST Number</div>
                        <div className="text-gray-900">{firm.gst_number}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Created</div>
                        <div className="text-gray-900">{new Date(firm.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{firm.total_parties || 0}</div>
                      <div className="text-sm text-blue-700">Total Parties</div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600">Active business relationships</div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">{firm.total_transactions || 0}</div>
                      <div className="text-sm text-green-700">Transactions</div>
                    </div>
                  </div>
                  <div className="text-xs text-green-600">Total completed transactions</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="text-lg font-bold text-purple-900">{formatCurrency(firm.monthly_revenue || 0)}</div>
                      <div className="text-sm text-purple-700">Monthly Revenue</div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-600">Current month performance</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {mockMetrics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{activity.activity}</div>
                        <div className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString()}</div>
                      </div>
                      {activity.amount > 0 && (
                        <div className="font-semibold text-green-600">
                          {formatCurrency(activity.amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Product Categories ({categories.length})</h3>
                <div className="text-sm text-gray-500">
                  Total Products: {categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)}
                </div>
              </div>

              {categories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">{category.product_count || 0} products</div>
                        </div>
                      </div>
                      {category.description && (
                        <div className="text-sm text-gray-600 mb-3">{category.description}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Created: {new Date(category.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2">No categories found</div>
                  <div className="text-sm text-gray-400">
                    Add product categories to organize your inventory
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Monthly Growth</div>
                    <div className="text-2xl font-bold text-green-600">+{mockMetrics.monthlyGrowth}%</div>
                    <div className="text-xs text-gray-500">Compared to last month</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Average Order</div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(mockMetrics.averageOrderValue)}</div>
                    <div className="text-xs text-gray-500">Per transaction</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Monthly Revenue</div>
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(firm.monthly_revenue || 0)}</div>
                    <div className="text-xs text-gray-500">Current month</div>
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
                <div className="space-y-3">
                  {mockMetrics.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">{index + 1}</span>
                        </div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                      </div>
                      <div className="font-semibold text-gray-900">{formatCurrency(product.sales)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}