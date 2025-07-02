import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen,
  Users, 
  CreditCard, 
  BarChart3, 
  CheckCircle,
  Building2,
  UserCheck,
  Package,
  FileText,
  ShoppingCart,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ activeTab, setActiveTab, isOpen, onClose }: MobileNavProps) {
  const { userProfile } = useAuth();

  // Define menu items based on user role
  const getMenuItems = () => {
    const isFieldStaff = userProfile?.role === 'field_staff';

    // Base menu items for all users
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'daybook', label: 'Day Book', icon: BookOpen },
      { id: 'parties', label: 'Parties', icon: Users },
      // ✅ Hide Cheque Management for field_staff
      !isFieldStaff && { id: 'cheques', label: 'Cheque Management', icon: CreditCard },
      { id: 'orders', label: 'Orders & Inventory', icon: Package },
      { id: 'bills', label: 'Bills & OCR', icon: FileText },
    ].filter(Boolean); // remove falsy entries

    // Items for admin and accountant
    const adminAccountantItems = [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ];

    // Items only for admin
    const adminOnlyItems = [
      { id: 'approvals', label: 'Approvals', icon: CheckCircle },
      { id: 'firms', label: 'Firm Management', icon: Building2 },
      { id: 'users', label: 'User Management', icon: UserCheck },
    ];

    let menuItems = [...baseItems];

    if (userProfile?.role === 'admin' || userProfile?.role === 'accountant') {
      menuItems = [...menuItems, ...adminAccountantItems];
    }

    if (userProfile?.role === 'admin') {
      menuItems = [...menuItems, ...adminOnlyItems];
    }

    return menuItems;
  };

  const menuItems = getMenuItems();

  const handleItemClick = (itemId: string) => {
    setActiveTab(itemId);
    onClose();
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">AccFlow</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {userProfile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {userProfile?.full_name || 'User'}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {userProfile?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
