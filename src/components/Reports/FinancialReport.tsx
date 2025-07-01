import React, { useState } from 'react';
import { DollarSign, Download, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import jsPDF from 'jspdf';

interface FinancialReportProps {
  dateRange: {
    from: string;
    to: string;
  };
}

export default function FinancialReport({ dateRange }: FinancialReportProps) {
  const [financialData] = useState({
    revenue: 2450000,
    collections: 1890000,
    outstanding: 560000,
    expenses: 180000,
    netProfit: 2270000,
    profitMargin: 92.7,
    cashFlow: [
      { month: 'Jan', inflow: 450000, outflow: 35000 },
      { month: 'Feb', inflow: 520000, outflow: 42000 },
      { month: 'Mar', inflow: 380000, outflow: 38000 },
      { month: 'Apr', inflow: 610000, outflow: 45000 },
      { month: 'May', inflow: 490000, outflow: 20000 },
    ],
    profitLoss: {
      revenue: 2450000,
      costOfGoods: 0, // Trading business
      grossProfit: 2450000,
      operatingExpenses: 180000,
      netProfit: 2270000,
    },
    balanceSheet: {
      assets: {
        cash: 850000,
        accountsReceivable: 560000,
        inventory: 0, // Trading business
        total: 1410000,
      },
      liabilities: {
        accountsPayable: 120000,
        total: 120000,
      },
      equity: 1290000,
    },
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
    doc.text('Financial Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Financial Summary
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Financial Summary', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Revenue: ${formatCurrency(financialData.revenue)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Collections: ${formatCurrency(financialData.collections)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Outstanding: ${formatCurrency(financialData.outstanding)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Net Profit: ${formatCurrency(financialData.netProfit)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Profit Margin: ${financialData.profitMargin}%`, 20, yPosition);
    
    // Profit & Loss
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Profit & Loss Statement', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Revenue: ${formatCurrency(financialData.profitLoss.revenue)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Gross Profit: ${formatCurrency(financialData.profitLoss.grossProfit)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Operating Expenses: ${formatCurrency(financialData.profitLoss.operatingExpenses)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Net Profit: ${formatCurrency(financialData.profitLoss.netProfit)}`, 20, yPosition);
    
    doc.save('financial-report.pdf');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8" />
            <button
              onClick={exportToPDF}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="text-3xl font-bold mb-2">{formatCurrency(financialData.revenue)}</div>
          <div className="text-green-100">Total Revenue</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-green-600">+{financialData.profitMargin}%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(financialData.netProfit)}</div>
          <div className="text-sm text-gray-500">Net Profit</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(financialData.outstanding)}</div>
          <div className="text-sm text-gray-500">Outstanding</div>
        </div>
      </div>

      {/* Financial Statements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit & Loss Statement */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Profit & Loss Statement</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-gray-900">Revenue</span>
              <span className="font-semibold text-green-600">{formatCurrency(financialData.profitLoss.revenue)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">Gross Profit</span>
              <span className="font-semibold text-gray-900">{formatCurrency(financialData.profitLoss.grossProfit)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="font-medium text-gray-900">Operating Expenses</span>
              <span className="font-semibold text-red-600">({formatCurrency(financialData.profitLoss.operatingExpenses)})</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-t-2 border-blue-200">
              <span className="font-bold text-gray-900">Net Profit</span>
              <span className="font-bold text-blue-600">{formatCurrency(financialData.profitLoss.netProfit)}</span>
            </div>
            
            <div className="text-center p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">Profit Margin: </span>
              <span className="font-semibold text-gray-900">{financialData.profitMargin}%</span>
            </div>
          </div>
        </div>

        {/* Balance Sheet */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Balance Sheet</h3>
          <div className="space-y-6">
            {/* Assets */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Assets</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cash & Bank</span>
                  <span className="font-medium">{formatCurrency(financialData.balanceSheet.assets.cash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accounts Receivable</span>
                  <span className="font-medium">{formatCurrency(financialData.balanceSheet.assets.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium text-gray-900">Total Assets</span>
                  <span className="font-semibold">{formatCurrency(financialData.balanceSheet.assets.total)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Liabilities</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accounts Payable</span>
                  <span className="font-medium">{formatCurrency(financialData.balanceSheet.liabilities.accountsPayable)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium text-gray-900">Total Liabilities</span>
                  <span className="font-semibold">{formatCurrency(financialData.balanceSheet.liabilities.total)}</span>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Owner's Equity</span>
                <span className="font-semibold text-blue-600">{formatCurrency(financialData.balanceSheet.equity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Analysis */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cash Flow Analysis</h3>
        <div className="space-y-4">
          {financialData.cashFlow.map((month, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{month.month}</div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Inflow</div>
                  <div className="font-semibold text-green-600">{formatCurrency(month.inflow)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Outflow</div>
                  <div className="font-semibold text-red-600">{formatCurrency(month.outflow)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Net</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(month.inflow - month.outflow)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}