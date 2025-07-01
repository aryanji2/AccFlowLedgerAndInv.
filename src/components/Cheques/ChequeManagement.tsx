import React, { useState } from 'react';
import ReceivedCheques from './ReceivedCheques'; 
import PayableCheques from './PayableCheques'; 
import { Download, Upload } from 'lucide-react';

export default function ChequeManagement() {
  const [activeTab, setActiveTab] = useState<'received' | 'payable'>('received');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-500 to-blue-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cheque Management</h1>
            <p className="text-green-100 mt-1">
              Track all incoming and outgoing cheques in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg w-full transition-colors ${
            activeTab === 'received'
              ? 'bg-green-600 text-white shadow'
              : 'text-gray-600 hover:bg-green-50'
          }`}
        >
          <Download className="w-4 h-4 inline-block mr-2" />
          Received Cheques
        </button>
        <button
          onClick={() => setActiveTab('payable')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg w-full transition-colors ${
            activeTab === 'payable'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-blue-50'
          }`}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Payable Cheques (Due on Us)
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'received' && <ReceivedCheques />}
        {activeTab === 'payable' && <PayableCheques />}
      </div>
    </div>
  );
}