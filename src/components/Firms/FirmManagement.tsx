import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, FileText, Package, Tag, Users, ToggleLeft, ToggleRight, Search, Filter, Download, Eye, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CreateFirmModal from './CreateFirmModal';
import CategoryManagementModal from './CategoryManagementModal';
import FirmDetailsModal from './FirmDetailsModal';
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
  // Additional computed fields
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

interface FirmStats {
  total_firms: number;
  active_firms: number;
  inactive_firms: number;
  total_revenue: number;
  total_parties: number;
  total_transactions: number;
}

export default function FirmManagement() {
  const { userProfile } = useAuth();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<FirmStats>({
    total_firms: 0,
    active_firms: 0,
    inactive_firms: 0,
    total_revenue: 0,
    total_parties: 0,
    total_transactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [selectedFirmForCategories, setSelectedFirmForCategories] = useState<string | null>(null);
  const [selectedFirmForDetails, setSelectedFirmForDetails] = useState<Firm | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    fetchFirms();
    fetchCategories();
  }, []);

  const fetchFirms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch firms from Supabase
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching firms:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setFirms(data);
        setIsUsingMockData(false);
        
        // Fetch additional stats for each firm
        await Promise.all(data.map(async (firm) => {
          // Fetch party count
          const { count: partiesCount, error: partiesError } = await supabase
            .from('parties')
            .select('id', { count: 'exact', head: true })
            .eq('firm_id', firm.id)
            .eq('is_active', true);
          
          // Fetch transaction count and sum
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('firm_id', firm.id)
            .eq('status', 'approved')
            .eq('type', 'sale');
          
          // Update firm with stats
          if (!partiesError && !transactionsError) {
            const totalRevenue = transactionsData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
            
            setFirms(prev => prev.map(f => 
              f.id === firm.id 
                ? { 
                    ...f, 
                    total_parties: partiesCount || 0,
                    total_transactions: transactionsData?.length || 0,
                    monthly_revenue: totalRevenue
                  } 
                : f
            ));
          }
        }));
        
        // Calculate overall stats
        const totalRevenue = data.reduce((sum, firm) => sum + (firm.monthly_revenue || 0), 0);
        const totalParties = data.reduce((sum, firm) => sum + (firm.total_parties || 0), 0);
        const totalTransactions = data.reduce((sum, firm) => sum + (firm.total_transactions || 0), 0);
        
        setStats({
          total_firms: data.length,
          active_firms: data.filter(f => f.status === 'active').length,
          inactive_firms: data.filter(f => f.status === 'inactive').length,
          total_revenue: totalRevenue,
          total_parties: totalParties,
          total_transactions: totalTransactions,
        });
      } else {
        // No firms found, use mock data
        useMockData();
      }
    } catch (error) {
      console.error('Error fetching firms:', error);
      setError('Failed to load firms. Please try again.');
      useMockData();
    } finally {
      setLoading(false);
    }
  };

  const useMockData = () => {
    // Mock firms data with enhanced information
    const mockFirms: Firm[] = [
      {
        id: 'firm-1',
        name: 'ABC Electronics Ltd',
        address: '123 Business District, Mumbai, MH 400001',
        phone: '+91 22 1234 5678',
        email: 'info@abcelectronics.com',
        gst_number: '27ABCDE1234F1Z5',
        status: 'active',
        created_by: 'admin-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        total_parties: 45,
        total_transactions: 1250,
        monthly_revenue: 2450000,
      },
      {
        id: 'firm-2',
        name: 'XYZ Trading Co',
        address: '456 Trade Center, Delhi, DL 110001',
        phone: '+91 11 9876 5432',
        email: 'contact@xyztrading.com',
        gst_number: '07XYZAB5678C1D2',
        status: 'active',
        created_by: 'admin-1',
        created_at: '2023-06-15T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        total_parties: 32,
        total_transactions: 890,
        monthly_revenue: 1850000,
      },
      {
        id: 'firm-3',
        name: 'Demo Supplies Inc',
        address: '789 Industrial Area, Bangalore, KA 560001',
        phone: '+91 80 5555 6666',
        email: 'hello@demosupplies.com',
        gst_number: '29DEMO5678E1F3',
        status: 'inactive',
        created_by: 'admin-1',
        created_at: '2023-03-10T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        total_parties: 18,
        total_transactions: 320,
        monthly_revenue: 650000,
      },
    ];

    setFirms(mockFirms);
    setIsUsingMockData(true);
    
    // Calculate stats
    const totalRevenue = mockFirms.reduce((sum, firm) => sum + (firm.monthly_revenue || 0), 0);
    const totalParties = mockFirms.reduce((sum, firm) => sum + (firm.total_parties || 0), 0);
    const totalTransactions = mockFirms.reduce((sum, firm) => sum + (firm.total_transactions || 0), 0);
    
    setStats({
      total_firms: mockFirms.length,
      active_firms: mockFirms.filter(f => f.status === 'active').length,
      inactive_firms: mockFirms.filter(f => f.status === 'inactive').length,
      total_revenue: totalRevenue,
      total_parties: totalParties,
      total_transactions: totalTransactions,
    });
    
    // Also use mock categories
    const mockCategories: Category[] = [
      {
        id: 'cat-1',
        firm_id: 'firm-1',
        name: 'Cement',
        description: 'Construction cement products',
        color: 'bg-green-500',
        created_at: new Date().toISOString(),
        product_count: 15,
      },
      {
        id: 'cat-2',
        firm_id: 'firm-1',
        name: 'Notebook',
        description: 'Stationery and notebooks',
        color: 'bg-blue-500',
        created_at: new Date().toISOString(),
        product_count: 8,
      },
      {
        id: 'cat-3',
        firm_id: 'firm-1',
        name: 'Pidilite',
        description: 'Adhesives and sealants',
        color: 'bg-purple-500',
        created_at: new Date().toISOString(),
        product_count: 12,
      },
      {
        id: 'cat-4',
        firm_id: 'firm-2',
        name: 'Electronics',
        description: 'Electronic components',
        color: 'bg-orange-500',
        created_at: new Date().toISOString(),
        product_count: 25,
      },
      {
        id: 'cat-5',
        firm_id: 'firm-2',
        name: 'Hardware',
        description: 'Hardware supplies',
        color: 'bg-red-500',
        created_at: new Date().toISOString(),
        product_count: 18,
      },
    ];

    setCategories(mockCategories);
  };

  const fetchCategories = async () => {
    try {
      // Fetch categories from Supabase
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Fetch product counts for each category
        const categoriesWithCounts = await Promise.all(data.map(async (category) => {
          const { count, error: countError } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          return {
            ...category,
            product_count: countError ? 0 : (count || 0)
          };
        }));
        
        setCategories(categoriesWithCounts);
        setIsUsingMockData(false);
      } else if (!isUsingMockData) {
        // If no categories found but we have real firms, set empty categories
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateFirm = async (firmData: any) => {
    try {
      if (isUsingMockData) {
        const newFirm: Firm = {
          id: `firm-${Date.now()}`,
          ...firmData,
          status: 'active',
          created_by: userProfile?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_parties: 0,
          total_transactions: 0,
          monthly_revenue: 0,
        };

        setFirms(prev => [...prev, newFirm]);
        setShowCreateModal(false);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          total_firms: prev.total_firms + 1,
          active_firms: prev.active_firms + 1,
        }));
        
        console.log('Firm created (mock):', newFirm);
        return;
      }
      
      // Create firm in Supabase
      const { data, error } = await supabase
        .from('firms')
        .insert({
          name: firmData.name,
          address: firmData.address,
          phone: firmData.phone,
          email: firmData.email,
          gst_number: firmData.gst_number,
          status: 'active',
          created_by: userProfile?.id
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating firm:', error);
        throw error;
      }
      
      // Add the new firm to state
      setFirms(prev => [...prev, {
        ...data,
        total_parties: 0,
        total_transactions: 0,
        monthly_revenue: 0
      }]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total_firms: prev.total_firms + 1,
        active_firms: prev.active_firms + 1,
      }));
      
      // Assign current user to the new firm
      if (userProfile) {
        const { error: accessError } = await supabase
          .from('user_firm_access')
          .insert({
            user_id: userProfile.id,
            firm_id: data.id
          });
        
        if (accessError) {
          console.error('Error assigning user to firm:', accessError);
        }
      }
      
      setShowCreateModal(false);
      console.log('Firm created:', data);
    } catch (error) {
      console.error('Error creating firm:', error);
      alert('Failed to create firm. Please try again.');
    }
  };

  const handleEditFirm = async (firmId: string, firmData: any) => {
    try {
      if (isUsingMockData) {
        setFirms(prev => prev.map(firm => 
          firm.id === firmId ? { ...firm, ...firmData, updated_at: new Date().toISOString() } : firm
        ));
        setEditingFirm(null);
        
        console.log('Firm updated (mock):', firmId, firmData);
        return;
      }
      
      // Update firm in Supabase
      const { data, error } = await supabase
        .from('firms')
        .update({
          name: firmData.name,
          address: firmData.address,
          phone: firmData.phone,
          email: firmData.email,
          gst_number: firmData.gst_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', firmId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating firm:', error);
        throw error;
      }
      
      // Update the firm in state
      setFirms(prev => prev.map(firm => 
        firm.id === firmId ? { 
          ...firm, 
          ...data,
          total_parties: firm.total_parties,
          total_transactions: firm.total_transactions,
          monthly_revenue: firm.monthly_revenue
        } : firm
      ));
      
      setEditingFirm(null);
      console.log('Firm updated:', data);
    } catch (error) {
      console.error('Error updating firm:', error);
      alert('Failed to update firm. Please try again.');
    }
  };

  const handleDeleteFirm = async (firmId: string) => {
    if (!confirm('Are you sure you want to delete this firm? This action cannot be undone.')) {
      return;
    }

    try {
      if (isUsingMockData) {
        const firmToDelete = firms.find(f => f.id === firmId);
        setFirms(prev => prev.filter(firm => firm.id !== firmId));
        
        // Update stats
        if (firmToDelete) {
          setStats(prev => ({
            ...prev,
            total_firms: prev.total_firms - 1,
            active_firms: firmToDelete.status === 'active' ? prev.active_firms - 1 : prev.active_firms,
            inactive_firms: firmToDelete.status === 'inactive' ? prev.inactive_firms - 1 : prev.inactive_firms,
            total_revenue: prev.total_revenue - (firmToDelete.monthly_revenue || 0),
            total_parties: prev.total_parties - (firmToDelete.total_parties || 0),
            total_transactions: prev.total_transactions - (firmToDelete.total_transactions || 0),
          }));
        }
        
        console.log('Firm deleted (mock):', firmId);
        return;
      }
      
      // Delete firm from Supabase
      const { error } = await supabase
        .from('firms')
        .delete()
        .eq('id', firmId);
      
      if (error) {
        console.error('Error deleting firm:', error);
        throw error;
      }
      
      // Remove the firm from state
      const firmToDelete = firms.find(f => f.id === firmId);
      setFirms(prev => prev.filter(firm => firm.id !== firmId));
      
      // Update stats
      if (firmToDelete) {
        setStats(prev => ({
          ...prev,
          total_firms: prev.total_firms - 1,
          active_firms: firmToDelete.status === 'active' ? prev.active_firms - 1 : prev.active_firms,
          inactive_firms: firmToDelete.status === 'inactive' ? prev.inactive_firms - 1 : prev.inactive_firms,
          total_revenue: prev.total_revenue - (firmToDelete.monthly_revenue || 0),
          total_parties: prev.total_parties - (firmToDelete.total_parties || 0),
          total_transactions: prev.total_transactions - (firmToDelete.total_transactions || 0),
        }));
      }
      
      console.log('Firm deleted:', firmId);
    } catch (error) {
      console.error('Error deleting firm:', error);
      alert('Failed to delete firm. Please try again.');
    }
  };

  const handleToggleStatus = async (firmId: string) => {
    try {
      const firm = firms.find(f => f.id === firmId);
      if (!firm) return;

      const newStatus = firm.status === 'active' ? 'inactive' : 'active';
      
      if (isUsingMockData) {
        setFirms(prev => prev.map(firm => 
          firm.id === firmId 
            ? { ...firm, status: newStatus, updated_at: new Date().toISOString() }
            : firm
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          active_firms: newStatus === 'active' ? prev.active_firms + 1 : prev.active_firms - 1,
          inactive_firms: newStatus === 'inactive' ? prev.inactive_firms + 1 : prev.inactive_firms - 1,
        }));
        
        console.log('Firm status toggled (mock):', firmId, newStatus);
        return;
      }
      
      // Update firm status in Supabase
      const { data, error } = await supabase
        .from('firms')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', firmId)
        .select()
        .single();
      
      if (error) {
        console.error('Error toggling firm status:', error);
        throw error;
      }
      
      // Update the firm in state
      setFirms(prev => prev.map(firm => 
        firm.id === firmId 
          ? { 
              ...firm, 
              status: newStatus, 
              updated_at: new Date().toISOString() 
            }
          : firm
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        active_firms: newStatus === 'active' ? prev.active_firms + 1 : prev.active_firms - 1,
        inactive_firms: newStatus === 'inactive' ? prev.inactive_firms + 1 : prev.inactive_firms - 1,
      }));
      
      console.log('Firm status toggled:', firmId, newStatus);
    } catch (error) {
      console.error('Error toggling firm status:', error);
      alert('Failed to update firm status. Please try again.');
    }
  };

  const handleManageCategories = (firmId: string) => {
    setSelectedFirmForCategories(firmId);
    setShowCategoryModal(true);
  };

  const handleViewDetails = (firm: Firm) => {
    setSelectedFirmForDetails(firm);
    setShowDetailsModal(true);
  };

  const handleCategoryUpdate = () => {
    fetchCategories();
  };

  const exportFirmsReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Firms Management Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Firms: ${stats.total_firms}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Active Firms: ${stats.active_firms}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Inactive Firms: ${stats.inactive_firms}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Revenue: ${formatCurrency(stats.total_revenue)}`, 20, yPosition);
    
    // Firms Details
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Firms Details', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Name', 20, yPosition);
    doc.text('Status', 80, yPosition);
    doc.text('Parties', 110, yPosition);
    doc.text('Revenue', 140, yPosition);
    doc.text('GST Number', 170, yPosition);
    
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    filteredFirms.forEach((firm) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(firm.name.substring(0, 20), 20, yPosition);
      doc.text(firm.status, 80, yPosition);
      doc.text((firm.total_parties || 0).toString(), 110, yPosition);
      doc.text(formatCurrency(firm.monthly_revenue || 0), 140, yPosition);
      doc.text(firm.gst_number || 'N/A', 170, yPosition);
      
      yPosition += 8;
    });
    
    doc.save('firms-report.pdf');
  };

  const getFirmCategories = (firmId: string) => {
    return categories.filter(cat => cat.firm_id === firmId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredFirms = firms.filter(firm => {
    const matchesSearch = firm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (firm.email && firm.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (firm.gst_number && firm.gst_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || firm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManageFirms = userProfile?.role === 'admin';

  if (!canManageFirms) {
    return (
      <div className="p-6 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <div className="text-gray-500 mb-2">Access Denied</div>
        <div className="text-sm text-gray-400">
          Only administrators can manage firms
        </div>
      </div>
    );
  }

  if (loading && firms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold mb-2">Firm Management</h1>
            <p className="text-blue-100">Manage your business firms and their product categories</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportFirmsReport}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Firm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={fetchFirms}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
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
                You're currently viewing demo data. To use real firm management features, please configure your Supabase connection properly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total_firms}</div>
          <div className="text-sm text-gray-500">Total Firms</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.active_firms}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-red-600">{stats.inactive_firms}</div>
          <div className="text-sm text-gray-500">Inactive</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-blue-600">{formatCurrency(stats.total_revenue)}</div>
          <div className="text-sm text-gray-500">Total Revenue</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{stats.total_parties}</div>
          <div className="text-sm text-gray-500">Total Parties</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{stats.total_transactions}</div>
          <div className="text-sm text-gray-500">Transactions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search firms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="text-sm text-gray-500">
            Showing {filteredFirms.length} of {firms.length} firms
          </div>
        </div>
      </div>

      {/* Firms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFirms.map((firm) => {
          const firmCategories = getFirmCategories(firm.id);
          
          return (
            <div key={firm.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{firm.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        firm.status === 'active' 
                          ? 'text-green-600 bg-green-50' 
                          : 'text-gray-600 bg-gray-50'
                      }`}>
                        {firm.status}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(firm.id)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          firm.status === 'active'
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {firm.status === 'active' ? (
                          <>
                            <ToggleLeft className="w-3 h-3 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-3 h-3 mr-1" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(firm)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingFirm(firm)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit Firm"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFirm(firm.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Firm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Firm Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{firm.address || 'No address provided'}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{firm.phone || 'No phone provided'}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{firm.email || 'No email provided'}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>GST: {firm.gst_number || 'Not provided'}</span>
                </div>
              </div>

              {/* Business Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{firm.total_parties || 0}</div>
                  <div className="text-xs text-gray-500">Parties</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{firm.total_transactions || 0}</div>
                  <div className="text-xs text-gray-500">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(firm.monthly_revenue || 0)}</div>
                  <div className="text-xs text-gray-500">Revenue</div>
                </div>
              </div>

              {/* Categories Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Categories ({firmCategories.length})</span>
                  </div>
                  <button
                    onClick={() => handleManageCategories(firm.id)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                </div>
                
                {firmCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {firmCategories.slice(0, 3).map((category) => (
                      <span
                        key={category.id}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${category.color}`}
                      >
                        {category.name}
                        {category.product_count !== undefined && (
                          <span className="ml-1 bg-white bg-opacity-30 px-1 rounded">
                            {category.product_count}
                          </span>
                        )}
                      </span>
                    ))}
                    {firmCategories.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                        +{firmCategories.length - 3} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No categories defined</div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Created: {new Date(firm.created_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500">
                  Updated: {new Date(firm.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}

        {filteredFirms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500 mb-2">No firms found</div>
            <div className="text-sm text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first firm to get started'
              }
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateFirmModal
        isOpen={showCreateModal || !!editingFirm}
        onClose={() => {
          setShowCreateModal(false);
          setEditingFirm(null);
        }}
        onSuccess={editingFirm ? handleEditFirm : handleCreateFirm}
        editingFirm={editingFirm}
      />

      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setSelectedFirmForCategories(null);
        }}
        firmId={selectedFirmForCategories}
        categories={categories.filter(cat => cat.firm_id === selectedFirmForCategories)}
        onSuccess={handleCategoryUpdate}
      />

      {selectedFirmForDetails && (
        <FirmDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFirmForDetails(null);
          }}
          firm={selectedFirmForDetails}
          categories={getFirmCategories(selectedFirmForDetails.id)}
        />
      )}
    </div>
  );
}