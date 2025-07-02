import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Login from './components/Auth/Login';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MobileNav from './components/Layout/MobileNav';
import Dashboard from './components/Dashboard/Dashboard';
import DayBook from './components/DayBook/DayBook';
import Parties from './components/Parties/Parties';
import Orders from './components/Orders/Orders';
import ChequeManagement from './components/Cheques/ChequeManagement';
import BillsOCR from './components/Bills/BillsOCR';
import Reports from './components/Reports/Reports';
import Approvals from './components/Approvals/Approvals';
import FirmManagement from './components/Firms/FirmManagement';
import UserManagement from './components/Users/UserManagement';
import TransactionList from './components/Transactions/TransactionList'; // ✅ make sure this exists

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <Login />;
  }

  const handleGlobalSearch = (query: string) => {
    setGlobalSearchQuery(query);
    if (query.trim()) {
      setActiveTab('parties');
    }
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'daybook':
        return <DayBook />;
      case 'transactions':
        return <TransactionList />; // ✅ Added this
      case 'parties':
        return <Parties searchQuery={globalSearchQuery} />;
      case 'orders':
        return <Orders />;
      case 'cheques':
        return <ChequeManagement />;
      case 'bills':
        return <BillsOCR />;
      case 'reports':
        return <Reports />;
      case 'approvals':
        return <Approvals />;
      case 'firms':
        return <FirmManagement />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onGlobalSearch={handleGlobalSearch} 
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
        <MobileNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        
        <main className="flex-1 min-w-0">
          <div className="p-3 sm:p-4 lg:p-6">
            {renderContent()}
          </div>
        </main>
      </div>
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
