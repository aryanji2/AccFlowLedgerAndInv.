import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
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
import TransactionList from './components/Transactions/TransactionList';

// ❌ The BackButtonHandler component is no longer necessary and has been removed.
// React Router handles this natively.

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate(); // Hook for programmatic navigation

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
      // ✅ Navigate to a URL instead of setting local state
      navigate('/parties');
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
          {/* ✅ Sidebar no longer needs activeTab or setActiveTab props */}
          <Sidebar />
        </div>
        
        <MobileNav 
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        
        <main className="flex-1 min-w-0">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* ✅ Replaced the state-based switch with declarative routing */}
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard onNavigate={(path) => navigate(path)} />} />
              <Route path="/daybook" element={<DayBook />} />
              <Route path="/transactions" element={<TransactionList />} />
              <Route path="/parties" element={<Parties searchQuery={globalSearchQuery} />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/cheques" element={<ChequeManagement />} />
              <Route path="/bills" element={<BillsOCR />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/firms" element={<FirmManagement />} />
              <Route path="/users" element={<UserManagement />} />
              {/* Fallback route for unmatched paths */}
              <Route path="*" element={<h1>404: Page Not Found</h1>} />
            </Routes>
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
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;