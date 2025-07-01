import React, { useState } from 'react';
import { CreditCard, Download, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';

interface ChequeReportProps {
  dateRange: {
    from: string;
    to: string;
  };
}

export default function ChequeReport({ dateRange }: ChequeReportProps) {
  const [chequeData] = useState({
    totalCheques: 45,
    pendingCheques: 12,
    clearedCheques: 28,
    bouncedCheques: 5,
    totalAmount: 1250000,
    pendingAmount: 350000,
    clearedAmount: 780000,
    bouncedAmount: 120000,
    chequesByStatus: [
      { party: 'ABC Retailers', chequeNo: 'CHQ123456', amount: 45000, dueDate: '2024-01-20', status: 'pending' },
      { party: 'XYZ Distributors', chequeNo: 'CHQ789012', amount: 35000, dueDate: '2024-01-18', status: 'cleared' },
      { party: 'Quick Mart', chequeNo: 'CHQ345678', amount: 25000, dueDate: '2024-01-25', status: 'bounced' },
      { party: 'Super Store', chequeNo: 'CHQ901234', amount: 55000, dueDate: '2024-01-22', status: 'pending' },
      { party: 'Tech Solutions', chequeNo: 'CHQ567890', amount: 30000, dueDate: '2024-01-15', status: 'cleared' },
    ],
    monthlyTrend: [
      { month: 'Jan', received: 15, cleared: 12, bounced: 2 },
      { month: 'Feb', received: 18, cleared: 15, bounced: 1 },
      { month: 'Mar', received: 12, cleared: 10, bounced: 2 },
    ],
    bankWise: [
      { bank: 'HDFC Bank', cheques: 15, amount: 450000 },
      { bank: 'SBI', cheques: 12, amount: 380000 },
      { bank: 'ICICI Bank', cheques: 10, amount: 280000 },
      { bank: 'Axis Bank', cheques: 8, amount: 140000 },
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
      case 'cleared': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'bounced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'bounced': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Cheque Management Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Cheque Summary', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Cheques: ${chequeData.totalCheques}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Pending: ${chequeData.pendingCheques}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Cleared: ${chequeData.clearedCheques}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Bounced: ${chequeData.bouncedCheques}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Amount: ${formatCurrency(chequeData.totalAmount)}`, 20, yPosition);
    
    // Cheque Details
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Cheque Details', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Party', 20, yPosition);
    doc.text('Cheque No', 60, yPosition);
    doc.text('Amount', 100, yPosition);
    doc.text('Due Date', 140, yPosition);
    doc.text('Status', 180, yPosition);
    
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    chequeData.chequesByStatus.forEach((cheque) => {
      doc.text(cheque.party.substring(0, 15), 20, yPosition);
      doc.text(cheque.chequeNo, 60, yPosition);
      doc.text(formatCurrency(cheque.amount), 100, yPosition);
      doc.text(new Date(cheque.dueDate).toLocaleDateString(), 140, yPosition);
      doc.text(cheque.status, 180, yPosition);
      yPosition += 8;
    });
    
    doc.save('cheque-report.pdf');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-8 h-8" />
            <button
              onClick={exportToPDF}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="text-3xl font-bold mb-2">{chequeData.totalCheques}</div>
          <div className="text-indigo-100">Total Cheques</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{chequeData.pendingCheques}</div>
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-xs text-gray-400">{formatCurrency(chequeData.pendingAmount)}</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{chequeData.clearedCheques}</div>
          <div className="text-sm text-gray-500">Cleared</div>
          <div className="text-xs text-gray-400">{formatCurrency(chequeData.clearedAmount)}</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{chequeData.bouncedCheques}</div>
          <div className="text-sm text-gray-500">Bounced</div>
          <div className="text-xs text-gray-400">{formatCurrency(chequeData.bouncedAmount)}</div>
        </div>
      </div>

      {/* Analysis Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cheque Status Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Cheques</h3>
          <div className="space-y-4">
            {chequeData.chequesByStatus.map((cheque, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{cheque.party}</div>
                  <div className="text-sm text-gray-500">
                    {cheque.chequeNo} • Due: {new Date(cheque.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(cheque.amount)}</div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cheque.status)}`}>
                    {getStatusIcon(cheque.status)}
                    <span className="ml-1 capitalize">{cheque.status}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank-wise Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Bank-wise Distribution</h3>
          <div className="space-y-4">
            {chequeData.bankWise.map((bank, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{bank.bank}</div>
                  <div className="text-sm text-gray-500">{bank.cheques} cheques</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(bank.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trend</h3>
        <div className="space-y-4">
          {chequeData.monthlyTrend.map((month, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{month.month}</div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Received</div>
                  <div className="font-semibold text-blue-600">{month.received}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Cleared</div>
                  <div className="font-semibold text-green-600">{month.cleared}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Bounced</div>
                  <div className="font-semibold text-red-600">{month.bounced}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(chequeData.totalAmount)}</div>
            <div className="text-sm text-gray-500">Total Cheque Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {((chequeData.clearedCheques / chequeData.totalCheques) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {((chequeData.bouncedCheques / chequeData.totalCheques) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Bounce Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}