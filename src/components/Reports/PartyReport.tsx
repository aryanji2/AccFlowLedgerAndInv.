import React, { useState } from 'react';
import { Users, Download, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import jsPDF from 'jspdf';

interface PartyReportProps {
  dateRange: {
    from: string;
    to: string;
  };
}

export default function PartyReport({ dateRange }: PartyReportProps) {
  const [partyData] = useState({
    totalParties: 45,
    activeParties: 38,
    newParties: 5,
    overdueParties: 8,
    totalOutstanding: 850000,
    averageDebtorDays: 42,
    partyAnalysis: [
      { name: 'ABC Retailers', balance: 125000, debtorDays: 65, status: 'overdue', lastPayment: '2023-12-15' },
      { name: 'XYZ Distributors', balance: 95000, debtorDays: 45, status: 'high', lastPayment: '2024-01-05' },
      { name: 'Super Store', balance: 75000, debtorDays: 28, status: 'good', lastPayment: '2024-01-18' },
      { name: 'Quick Mart', balance: 65000, debtorDays: 52, status: 'high', lastPayment: '2024-01-02' },
      { name: 'Tech Solutions', balance: 45000, debtorDays: 25, status: 'good', lastPayment: '2024-01-20' },
    ],
    locationAnalysis: [
      { location: 'Mumbai Central', parties: 15, outstanding: 320000 },
      { location: 'Delhi NCR', parties: 12, outstanding: 280000 },
      { location: 'Bangalore Tech Hub', parties: 10, outstanding: 180000 },
      { location: 'Others', parties: 8, outstanding: 70000 },
    ],
    agingAnalysis: [
      { range: '0-30 days', amount: 250000, percentage: 29.4 },
      { range: '31-60 days', amount: 320000, percentage: 37.6 },
      { range: '61-90 days', amount: 180000, percentage: 21.2 },
      { range: '90+ days', amount: 100000, percentage: 11.8 },
    ],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'high': return 'text-yellow-600 bg-yellow-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Party Analysis Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Party Summary', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Parties: ${partyData.totalParties}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Active Parties: ${partyData.activeParties}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Outstanding: ${formatCurrency(partyData.totalOutstanding)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Average Debtor Days: ${partyData.averageDebtorDays}`, 20, yPosition);
    
    // Party Analysis
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Top Parties by Outstanding', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Party Name', 20, yPosition);
    doc.text('Balance', 80, yPosition);
    doc.text('Debtor Days', 120, yPosition);
    doc.text('Status', 160, yPosition);
    
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    partyData.partyAnalysis.forEach((party) => {
      doc.text(party.name, 20, yPosition);
      doc.text(formatCurrency(party.balance), 80, yPosition);
      doc.text(party.debtorDays.toString(), 120, yPosition);
      doc.text(party.status, 160, yPosition);
      yPosition += 8;
    });
    
    doc.save('party-report.pdf');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8" />
            <button
              onClick={exportToPDF}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="text-3xl font-bold mb-2">{partyData.totalParties}</div>
          <div className="text-purple-100">Total Parties</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{partyData.activeParties}</div>
          <div className="text-sm text-gray-500">Active Parties</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{partyData.overdueParties}</div>
          <div className="text-sm text-gray-500">Overdue Parties</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{partyData.averageDebtorDays}</div>
          <div className="text-sm text-gray-500">Avg Debtor Days</div>
        </div>
      </div>

      {/* Analysis Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Party Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Parties by Outstanding</h3>
          <div className="space-y-4">
            {partyData.partyAnalysis.map((party, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{party.name}</div>
                  <div className="text-sm text-gray-500">
                    {party.debtorDays} days • Last: {new Date(party.lastPayment).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(party.balance)}</div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(party.status)}`}>
                    {party.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Outstanding by Location</h3>
          <div className="space-y-4">
            {partyData.locationAnalysis.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{location.location}</div>
                  <div className="text-sm text-gray-500">{location.parties} parties</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(location.outstanding)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aging Analysis */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Outstanding Aging Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {partyData.agingAnalysis.map((age, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">{age.range}</div>
              <div className="text-xl font-bold text-gray-900 mb-1">{formatCurrency(age.amount)}</div>
              <div className="text-sm text-gray-500">{age.percentage}% of total</div>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Outstanding</h3>
            <p className="text-sm text-gray-500">Across all parties and locations</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(partyData.totalOutstanding)}</div>
            <div className="text-sm text-gray-500">Average: {partyData.averageDebtorDays} days</div>
          </div>
        </div>
      </div>
    </div>
  );
}