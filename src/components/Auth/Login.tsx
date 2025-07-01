import React, { useState } from 'react';
import { LogIn, AlertCircle, Info, ExternalLink, Shield, UserCheck, Database, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. If you\'re using demo credentials, please ensure the demo users are set up in your Supabase project.');
        setShowSetupGuide(true);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { 
      role: 'Admin', 
      email: 'admin@accflow.com', 
      password: 'admin123',
      icon: <Shield className="w-4 h-4" />,
      description: 'Full system access, user management',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    },
    { 
      role: 'Accountant', 
      email: 'accountant@accflow.com', 
      password: 'accountant123',
      icon: <UserCheck className="w-4 h-4" />,
      description: 'Financial data, reports, approvals',
      color: 'border-blue-200 bg-blue-50 hover:bg-blue-100'
    },
    { 
      role: 'Field Staff', 
      email: 'field@accflow.com', 
      password: 'field123',
      icon: <UserCheck className="w-4 h-4" />,
      description: 'Basic operations, data entry',
      color: 'border-green-200 bg-green-50 hover:bg-green-100'
    },
  ];

  const fillCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError(''); // Clear any existing errors
    setShowSetupGuide(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AccFlow</h1>
            <p className="text-gray-600">Business Management System</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-red-600 text-sm">
                  <p>{error}</p>
                  {showSetupGuide && (
                    <button
                      onClick={() => setShowSetupGuide(!showSetupGuide)}
                      className="mt-2 text-red-700 hover:text-red-800 font-medium underline"
                    >
                      Show setup instructions
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {showSetupGuide && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-3">Setup Required - Demo Users Missing</p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium mb-2">Step 1: Create Demo Users in Supabase</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-700 ml-2">
                        <li>Go to your Supabase project dashboard</li>
                        <li>Navigate to Authentication → Users</li>
                        <li>Click "Add user" and create these accounts:</li>
                      </ol>
                      <div className="mt-2 ml-4 space-y-1 text-xs font-mono bg-blue-100 p-2 rounded">
                        <div>• admin@accflow.com (password: admin123)</div>
                        <div>• accountant@accflow.com (password: accountant123)</div>
                        <div>• field@accflow.com (password: field123)</div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium mb-2">Step 2: Set Admin Role</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-700 ml-2">
                        <li>Go to Table Editor → user_profiles</li>
                        <li>Find the admin@accflow.com user</li>
                        <li>Set the 'role' column to 'admin'</li>
                        <li>Set 'is_active' to true</li>
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs text-blue-600">
                        <Database className="w-3 h-3 inline mr-1" />
                        This is a one-time setup. After this, you can manage users through the application.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Demo Credentials</p>
                  <p className="mb-3">Click any credential below to auto-fill the login form:</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {demoCredentials.map((cred, index) => (
                <button
                  key={index}
                  onClick={() => fillCredentials(cred.email, cred.password)}
                  className={`w-full text-left p-4 rounded-lg transition-colors duration-200 border-2 ${cred.color}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white bg-opacity-50">
                        {cred.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{cred.role}</div>
                        <div className="text-sm text-gray-600">{cred.description}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {cred.email} / {cred.password}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                      <span className="text-xs">Click to use</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">First Time Setup Required</p>
                  <p>If login fails, you need to create these demo users in your Supabase Authentication dashboard first. Click "Show setup instructions" above for detailed steps.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}