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
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { userProfile } = useAuth();

  const getMenuItems = () => {
    const isFieldStaff = userProfile?.role === 'field_staff';

    // Base menu items for all users
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'daybook', label: 'Day Book', icon: BookOpen },
      { id: 'parties', label: 'Parties', icon: Users },
      // ✅ Cheque Management is hidden for field_staff
      !isFieldStaff && { id: 'cheques', label: 'Cheque Management', icon: CreditCard },
      { id: 'orders', label: 'Orders & Inventory', icon: Package },
      { id: 'bills', label: 'Bills & OCR', icon: FileText },
    ].filter(Boolean); // 🔥 Remove any 'false' entries

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

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen flex flex-col">
      {/* User Profile */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {userProfile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {userProfile?.full_name || 'User'}
            </div>
            <div className="text-sm text-gray-500 capitalize">
              {userProfile?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
