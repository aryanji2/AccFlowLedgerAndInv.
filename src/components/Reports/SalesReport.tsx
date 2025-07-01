import React, { useState, useEffect } from 'react';
import { Receipt, TrendingUp, Download, Calendar, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';

interface SalesReportProps {
  dateRange: {
    from: string;
    to: string;
  };
}

export default function SalesReport({ dateRange }: SalesReportProps) {
  const [salesData, setSalesData] = useState({
    totalSales: 2450000,
    totalTransactions: 156,
    averageTicket: 15705,
    topProducts: [
      { name: 'Cement Bags', quantity: 1200, amount: 540000 },
      { name: 'Notebooks A4', quantity: 2500, amount: 62500 },
      { name: 'Fevicol', quantity: 800, amount: 68000 },
    ],
    dailySales: [
      { date: '2024-01-01', amount: 45000 },
      { date: '2024-01-02', amount: 52000 },
      { date: '2024-01-03', amount: 38000 },
      { date: '2024-01-04', amount: 61000 },
      { date: '2024-01-05', amount: 47000 },
    ],
    salesByParty: [
      { party: 'ABC Retailers', amount: 450000, percentage: 18.4 },
      { party: 'XYZ Distributors', amount: 380000, percentage: 15.5 },
      { party: 'Super Store', amount: 320000, percentage: 13.1 },
      { party: 'Quick Mart', amount: 280000, percentage: 11.4 },
      { party: 'Others', amount: 1020000, percentage: 41.6 },
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
    doc.text('Sales Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Sales Summary', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Sales: ${formatCurrency(salesData.totalSales)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Transactions: ${salesData.totalTransactions}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Average Ticket Size: ${formatCurrency(salesData.averageTicket)}`, 20, yPosition);
    
    // Top Products
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Top Products', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Product', 20, yPosition);
    doc.text('Quantity', 80, yPosition);
    doc.text('Amount', 130, yPosition);
    
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    salesData.topProducts.forEach((product) => {
      doc.text(product.name, 20, yPosition);
      doc.text(product.quantity.toString(), 80, yPosition);
      doc.text(formatCurrency(product.amount), 130, yPosition);
      yPosition += 8;
    });
    
    // Sales by Party
    yPosition += 15;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Sales by Party', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Party', 20, yPosition);
    doc.text('Amount', 80, yPosition);
    doc.text('Percentage', 130, yPosition);
    
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    salesData.salesByParty.forEach((party) => {
      doc.text(party.party, 20, yPosition);
      doc.text(formatCurrency(party.amount), 80, yPosition);
      doc.text(`${party.percentage}%`, 130, yPosition);
      yPosition += 8;
    });
    
    doc.save('sales-report.pdf');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Receipt className="w-8 h-8" />
            <button
              onClick={exportToPDF}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="text-3xl font-bold mb-2">{formatCurrency(salesData.totalSales)}</div>
          <div className="text-green-100">Total Sales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{salesData.totalTransactions}</div>
          <div className="text-sm text-gray-500">Total Transactions</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(salesData.averageTicket)}</div>
          <div className="text-sm text-gray-500">Average Ticket Size</div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Products</h3>
          <div className="space-y-4">
            {salesData.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500">Qty: {product.quantity}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(product.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Party */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales by Party</h3>
          <div className="space-y-4">
            {salesData.salesByParty.map((party, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{party.party}</div>
                  <div className="text-sm text-gray-500">{party.percentage}% of total</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(party.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Sales Trend */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Sales Trend</h3>
        <div className="space-y-3">
          {salesData.dailySales.map((day, index) => (
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