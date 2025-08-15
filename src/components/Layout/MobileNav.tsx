import React from 'react';
import { NavLink } from 'react-router-dom'; // ✅ Import NavLink
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
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ✅ Props are simplified: activeTab and setActiveTab are removed
interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { userProfile } = useAuth();

  // This logic for role-based menus is great and remains unchanged
  const getMenuItems = () => {
    const isFieldStaff = userProfile?.role === 'field_staff';

    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'daybook', label: 'Day Book', icon: BookOpen },
      { id: 'parties', label: 'Parties', icon: Users },
      !isFieldStaff && { id: 'cheques', label: 'Cheque Management', icon: CreditCard },
      { id: 'orders', label: 'Orders & Inventory', icon: Package },
      { id: 'bills', label: 'Bills & OCR', icon: FileText },
    ].filter(Boolean); 

    const adminAccountantItems = [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ];

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

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Header and User Profile sections remain unchanged */}
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

      {/* ✅ Navigation updated to use NavLink */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.id}
              to={`/${item.id}`} // The URL path
              onClick={onClose}  // Close the menu on navigation
              className={({ isActive }) => // Function to determine classes based on active state
                `w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}