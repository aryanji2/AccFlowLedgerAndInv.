import React, { useState } from 'react';
import { Search, ChevronDown, User, LogOut, Building2, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

interface HeaderProps {
  onGlobalSearch?: (query: string) => void;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export default function Header({ onGlobalSearch, onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { userProfile, signOut } = useAuth();
  const { selectedFirm, firms, setSelectedFirm } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFirmMenu, setShowFirmMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onGlobalSearch && searchQuery.trim()) {
      onGlobalSearch(searchQuery.trim());
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Trigger search on every keystroke for real-time search
    if (onGlobalSearch) {
      onGlobalSearch(value.trim());
    }
  };

  const handleFirmSelect = (firm: any) => {
    setSelectedFirm(firm);
    setShowFirmMenu(false);
    // Save selected firm to localStorage for persistence
    localStorage.setItem('selectedFirmId', firm.id);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">A</span>
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 hidden sm:block">AccFlow</h1>
          </div>

          {/* Firm Selector */}
          <div className="relative">
            <button
              onClick={() => setShowFirmMenu(!showFirmMenu)}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-blue-800 truncate max-w-16 sm:max-w-24 lg:max-w-none">
                {selectedFirm?.name || 'Select Firm'}
              </span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
            </button>

            {showFirmMenu && (
              <div className="absolute top-full mt-2 left-0 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                {firms.length > 0 ? (
                  firms.map((firm) => (
                    <button
                      key={firm.id}
                      onClick={() => handleFirmSelect(firm)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                        selectedFirm?.id === firm.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{firm.name}</div>
                      <div className="text-xs text-gray-500 truncate">{firm.address}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No firms available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
          {/* Search - Hidden on very small screens */}
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search parties..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 w-24 sm:w-32 lg:w-64 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
            />
          </form>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 p-1.5 sm:p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-sm font-medium text-gray-900 truncate max-w-24">
                  {userProfile?.full_name || 'User'}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {userProfile?.role?.replace('_', ' ') || 'User'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200 lg:hidden">
                  <div className="font-medium text-gray-900 text-sm">{userProfile?.full_name || 'User'}</div>
                  <div className="text-xs text-gray-500 capitalize">{userProfile?.role?.replace('_', ' ') || 'User'}</div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center space-x-2 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-3 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search parties..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </form>
      </div>
    </header>
  );
}