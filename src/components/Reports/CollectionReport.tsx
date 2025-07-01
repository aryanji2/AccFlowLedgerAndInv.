import React, { useState } from 'react';
import { TrendingUp, Download, Calendar, CreditCard, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';

interface CollectionReportProps {
  dateRange: {
    from: string;
    to: string;
  };
}

export default function CollectionReport({ dateRange }: CollectionReportProps) {
  const [collectionData] = useState({
    totalCollections: 1890000,
    totalTransactions: 98,
    averageCollection: 19286,
    collectionsByMethod: [
      { method: 'Cash', amount: 756000, percentage: 40.0 },
      { method: 'UPI', amount: 567000, percentage: 30.0 },
      { method: 'Cheque', amount: 378000, percentage: 20.0 },
      { method: 'Bank Transfer', amount: 189000, percentage: 10.0 },
    ],
    dailyCollections: [
      { date: '2024-01-01', amount: 38000 },
      { date: '2024-01-02', amount: 42000 },
      { date: '2024-01-03', amount: 35000 },
      { date: '2024-01-04', amount: 48000 },
      { date: '2024-01-05', amount: 41000 },
    ],
    topCollectors: [
      { party: 'ABC Retailers', amount: 340000, transactions: 15 },
      { party: 'XYZ Distributors', amount: 285000, transactions: 12 },
      { party: 'Super Store', amount: 230000, transactions: 10 },
      { party: 'Quick Mart', amount: 195000, transactions: 8 },
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Collection Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Collection Summary', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Collections: ${formatCurrency(collectionData.totalCollections)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Transactions: ${collectionData.totalTransactions}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Average Collection: ${formatCurrency(collectionData.averageCollection)}`, 20, yPosition);
    
    // Collections by Method
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Collections by Payment Method', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Method', 20, yPosition);
    doc.text('Amount', 80, yPosition);
    doc.text('Percentage', 130, yPosition);
    
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    collectionData.collectionsByMethod.forEach((method) => {
      doc.text(method.method, 20, yPosition);
      doc.text(formatCurrency(method.amount), 80, yPosition);
      doc.text(`${method.percentage}%`, 130, yPosition);
      yPosition += 8;
    });
    
    doc.save('collection-report.pdf');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8" />
            <button
              onClick={exportToPDF}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="text-3xl font-bold mb-2">{formatCurrency(collectionData.totalCollections)}</div>
          <div className="text-teal-100">Total Collections</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{collectionData.totalTransactions}</div>
          <div className="text-sm text-gray-500">Total Transactions</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(collectionData.averageCollection)}</div>
          <div className="text-sm text-gray-500">Average Collection</div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections by Payment Method */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Collections by Payment Method</h3>
          <div className="space-y-4">
            {collectionData.collectionsByMethod.map((method, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{method.method}</div>
                    <div className="text-sm text-gray-500">{method.percentage}% of total</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(method.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Collecting Parties */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Collecting Parties</h3>
          <div className="space-y-4">
            {collectionData.topCollectors.map((party, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{party.party}</div>
                  <div className="text-sm text-gray-500">{party.transactions} transactions</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(party.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Collections Trend */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Collections Trend</h3>
        <div className="space-y-3">
          {collectionData.dailyCollections.map((day, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{new Date(day.date).toLocaleDateString()}</span>
              </div>
              <div className="font-semibold text-gray-900">{formatCurrency(day.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}