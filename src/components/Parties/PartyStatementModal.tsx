import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, TrendingUp, TrendingDown, Receipt, User, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

interface Party {
  id: string;
  firm_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  type: 'customer' | 'supplier';
  debtor_days: number;
  last_payment_date?: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'collection' | 'opening_balance';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
  payment_method?: string;
}

interface PartyStatement {
  party: Party;
  transactions: Transaction[];
  summary: {
    opening_balance: number;
    closing_balance: number;
    total_debits: number;
    total_credits: number;
  };
}

interface PartyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
}

export default function PartyStatementModal({ isOpen, onClose, party }: PartyStatementModalProps) {
  const { selectedFirm } = useApp();
  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen && party) {
      fetchPartyStatement();
    }
  }, [isOpen, party, dateRange]);

  const fetchPartyStatement = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch transactions from Supabase
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          status,
          bill_number,
          payment_method,
          notes,
          transaction_date,
          created_at
        `)
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm?.id)
        .eq('status', 'approved')
        .gte('transaction_date', dateRange.from)
        .lte('transaction_date', dateRange.to)
        .order('transaction_date', { ascending: true });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        setError('Failed to load transaction data.');
        return;
      }

      if (!transactionsData || transactionsData.length === 0) {
        setStatement({
          party,
          transactions: [],
          summary: {
            opening_balance: 0,
            closing_balance: 0,
            total_debits: 0,
            total_credits: 0,
          }
        });
        return;
      }

      // Calculate opening balance (all approved transactions before the start date)
      const { data: priorTransactions, error: priorError } = await supabase
        .from('transactions')
        .select('type, amount, status')
        .eq('party_id', party.id)
        .eq('firm_id', selectedFirm?.id)
        .eq('status', 'approved')
        .lt('transaction_date', dateRange.from)
        .order('transaction_date', { ascending: true });

      if (priorError) {
        console.error('Error fetching prior transactions:', priorError);
      }

      // Calculate opening balance
      let openingBalance = 0;
      if (priorTransactions && priorTransactions.length > 0) {
        priorTransactions.forEach(t => {
          if (t.type === 'sale') {
            openingBalance += t.amount;
          } else if (t.type === 'collection') {
            openingBalance -= t.amount;
          }
        });
      }

      // Transform transactions to statement format
      const transactions: Transaction[] = [];
      
      // Add opening balance entry if there is one
      if (openingBalance !== 0) {
        transactions.push({
          id: 'opening-balance',
          date: dateRange.from,
          type: 'opening_balance',
          description: 'Opening Balance',
          debit: openingBalance > 0 ? openingBalance : 0,
          credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
          balance: openingBalance,
          reference: 'OB',
        });
      }

      // Add all transactions
      let runningBalance = openingBalance;
      transactionsData.forEach(t => {
        if (t.status === 'approved') {
          if (t.type === 'sale') {
            runningBalance += t.amount;
            transactions.push({
              id: t.id,
              date: t.transaction_date,
              type: 'sale',
              description: `Sale - ${t.bill_number || 'No Bill Number'}`,
              debit: t.amount,
              credit: 0,
              balance: runningBalance,
              reference: t.bill_number || '',
              payment_method: t.payment_method,
            });
          } else if (t.type === 'collection') {
            runningBalance -= t.amount;
            transactions.push({
              id: t.id,
              date: t.transaction_date,
              type: 'collection',
              description: `Payment received - ${t.payment_method || 'Unknown method'}${t.notes ? ` - ${t.notes}` : ''}`,
              debit: 0,
              credit: t.amount,
              balance: runningBalance,
              reference: t.bill_number || '',
              payment_method: t.payment_method,
            });
          }
        }
      });

      // Calculate summary
      const totalDebits = transactions.filter(t => t.type !== 'opening_balance').reduce((sum, t) => sum + t.debit, 0);
      const totalCredits = transactions.filter(t => t.type !== 'opening_balance').reduce((sum, t) => sum + t.credit, 0);

      setStatement({
        party,
        transactions,
        summary: {
          opening_balance: openingBalance,
          closing_balance: runningBalance,
          total_debits: totalDebits,
          total_credits: totalCredits,
        }
      });
      
    } catch (error) {
      console.error('Error fetching party statement:', error);
      setError('An error occurred while fetching the statement.');
    } finally {
      setLoading(false);
    }
  };
  
  const exportStatementToPDF = () => {
    if (!statement) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    
    // Helper function to add a new page if needed
    const checkForNewPage = (yPos: number, neededSpace: number = 20) => {
      if (yPos + neededSpace > pageHeight - margin) {
        doc.addPage();
        return margin + 10;
      }
      return yPos;
    };
    
    // Header
    let yPosition = margin;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedFirm?.name || 'Your Company'}`, pageWidth / 2, yPosition, { align: 'center' });
    
    // Statement period
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Statement Period: ${new Date(dateRange.from).toLocaleDateString('en-GB')} to ${new Date(dateRange.to).toLocaleDateString('en-GB')}`, pageWidth / 2, yPosition, { align: 'center' });
    
    // Horizontal line
    yPosition += 8;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    
    // Party Information
    yPosition += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Party Details:', margin, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${party.name}`, margin, yPosition);
    
    yPosition += 5;
    doc.text(`Contact: ${party.contact_person || 'N/A'}`, margin, yPosition);
    doc.text(`Phone: ${party.phone || 'N/A'}`, pageWidth / 2, yPosition);
    
    yPosition += 5;
    doc.text(`Address: ${party.address || 'N/A'}`, margin, yPosition);
    
    yPosition += 5;
    doc.text(`Email: ${party.email || 'N/A'}`, margin, yPosition);
    
    // Summary Box
    yPosition += 12;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', margin, yPosition);
    
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    
    const summaryY = yPosition;
    doc.text(`Opening Balance: ${formatCurrency(statement.summary.opening_balance)}`, margin, summaryY);
    doc.text(`Closing Balance: ${formatCurrency(statement.summary.closing_balance)}`, pageWidth / 2, summaryY);
    
    yPosition += 5;
    doc.text(`Total Debits: ${formatCurrency(statement.summary.total_debits)}`, margin, yPosition);
    doc.text(`Total Credits: ${formatCurrency(statement.summary.total_credits)}`, pageWidth / 2, yPosition);
    
    yPosition += 5;
    doc.text(`Debtor Days: ${party.debtor_days}`, margin, yPosition);
    
    // Transaction Table
    yPosition += 15;
    yPosition = checkForNewPage(yPosition, 40);
    
    // Table header with border
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 2;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    // Column positions - adjusted for better fit
    const dateX = margin + 2;
    const descX = margin + 25;
    const refX = margin + 85;
    const methodX = margin + 110;
    const debitX = margin + 130;
    const creditX = margin + 155;
    const balanceX = margin + 180;
    
    doc.text('Date', dateX, yPosition + 5);
    doc.text('Description', descX, yPosition + 5);
    doc.text('Reference', refX, yPosition + 5);
    doc.text('Method', methodX, yPosition + 5);
    doc.text('Debit', debitX, yPosition + 5);
    doc.text('Credit', creditX, yPosition + 5);
    doc.text('Balance', balanceX, yPosition + 5);
    
    yPosition += 8;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    
    // Transaction Data
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    statement.transactions.forEach((transaction) => {
      yPosition = checkForNewPage(yPosition, 8);
      
      // Format date
      const formattedDate = new Date(transaction.date).toLocaleDateString('en-GB');
      
      // Truncate description if too long
      const maxDescLength = 35;
      const description = transaction.description.length > maxDescLength 
        ? transaction.description.substring(0, maxDescLength) + '...' 
        : transaction.description;
      
      doc.text(formattedDate, dateX, yPosition);
      doc.text(description, descX, yPosition);
      doc.text(transaction.reference || '', refX, yPosition);
      doc.text(transaction.payment_method || '', methodX, yPosition);
      
      // Format amounts
      if (transaction.debit > 0) {
        doc.text(formatCurrencyForPDF(transaction.debit), debitX, yPosition);
      }
      if (transaction.credit > 0) {
        doc.text(formatCurrencyForPDF(transaction.credit), creditX, yPosition);
      }
      
      // Balance with DR/CR
      const balanceText = transaction.balance >= 0 
        ? `${formatCurrencyForPDF(transaction.balance)} DR`
        : `${formatCurrencyForPDF(Math.abs(transaction.balance))} CR`;
      doc.text(balanceText, balanceX, yPosition);
      
      yPosition += 6;
    });
    
    // Final line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    
    // Final Summary
    yPosition += 10;
    yPosition = checkForNewPage(yPosition, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Final Statement:', margin, yPosition);
    
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    
    const finalBalanceText = statement.summary.closing_balance >= 0 
      ? `Closing Balance: ${formatCurrency(statement.summary.closing_balance)} DR`
      : `Closing Balance: ${formatCurrency(Math.abs(statement.summary.closing_balance))} CR`;
    
    doc.text(finalBalanceText, margin, yPosition);
    
    // Footer
    const footerPosition = pageHeight - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, margin, footerPosition);
    doc.text('AccFlow Business Management System', pageWidth - margin, footerPosition, { align: 'right' });
    
    // Save the PDF with a meaningful filename
    const filename = `${party.name.replace(/\s+/g, '-').toLowerCase()}-statement-${dateRange.from}-to-${dateRange.to}.pdf`;
    doc.save(filename);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatCurrencyForPDF = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getBalanceColor = (balance: number) => {
    return balance >= 0 ? 'text-red-600' : 'text-green-600';
  };

  const getBalanceText = (balance: number) => {
    return balance >= 0 
      ? `${formatCurrency(balance)} DR` // Debit (they owe us)
      : `${formatCurrency(Math.abs(balance))} CR`; // Credit (we owe them)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">{party.name}</h2>
                <p className="text-sm text-blue-100">
                  Account Statement - {new Date(dateRange.from).toLocaleDateString()} to {new Date(dateRange.to).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportStatementToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-blue-100 mb-1">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-blue-400 bg-blue-50 bg-opacity-20 text-white rounded focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-100 mb-1">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-blue-400 bg-blue-50 bg-opacity-20 text-white rounded focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <div className="text-red-600 mb-2">{error}</div>
              <button 
                onClick={fetchPartyStatement}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : statement ? (
            <div className="p-4 sm:p-6">
              {/* Party Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Contact Person</h3>
                    <p className="text-gray-900">{party.contact_person || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                    <p className="text-gray-900">{party.phone || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="text-gray-900">{party.email || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Address</h3>
                    <p className="text-gray-900">{party.address || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium">Opening Balance</div>
                  <div className={`text-base sm:text-lg font-bold ${getBalanceColor(statement.summary.opening_balance)}`}>
                    {getBalanceText(statement.summary.opening_balance)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-green-600 font-medium">Closing Balance</div>
                  <div className={`text-base sm:text-lg font-bold ${getBalanceColor(statement.summary.closing_balance)}`}>
                    {getBalanceText(statement.summary.closing_balance)}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-purple-600 font-medium">Total Debits</div>
                  <div className="text-base sm:text-lg font-bold text-red-600">
                    {formatCurrency(statement.summary.total_debits)}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-orange-600 font-medium">Total Credits</div>
                  <div className="text-base sm:text-lg font-bold text-green-600">
                    {formatCurrency(statement.summary.total_credits)}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              {statement.transactions.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                          <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                          <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statement.transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">
                              <div className="flex items-center space-x-2">
                                {transaction.type === 'sale' && <Receipt className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />}
                                {transaction.type === 'collection' && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />}
                                {transaction.type === 'opening_balance' && <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />}
                                <span className="truncate max-w-[200px]">{transaction.description}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {transaction.reference || '-'}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {transaction.payment_method ? (
                                <span className="capitalize">{transaction.payment_method}</span>
                              ) : '-'}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-right">
                              {transaction.debit > 0 && (
                                <span className="text-red-600 font-medium">
                                  {formatCurrency(transaction.debit)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-right">
                              {transaction.credit > 0 && (
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(transaction.credit)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-right">
                              <span className={`font-medium ${getBalanceColor(transaction.balance)}`}>
                                {getBalanceText(transaction.balance)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <div className="text-gray-500 mb-2">No transactions found</div>
                  <div className="text-sm text-gray-400">
                    No transactions found for the selected date range.
                  </div>
                </div>
              )}

              {/* Summary Footer */}
              {statement.transactions.length > 0 && (
                <div className="mt-6 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="text-center">
                      <div className="text-xs sm:text-sm text-gray-500">Total Debits</div>
                      <div className="text-base sm:text-lg font-bold text-red-600">
                        {formatCurrency(statement.summary.total_debits)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm text-gray-500">Total Credits</div>
                      <div className="text-base sm:text-lg font-bold text-green-600">
                        {formatCurrency(statement.summary.total_credits)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm text-gray-500">Closing Balance</div>
                      <div className={`text-base sm:text-lg font-bold ${getBalanceColor(statement.summary.closing_balance)}`}>
                        {getBalanceText(statement.summary.closing_balance)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Debtor Days Explanation */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Debtor Days Information</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      This party has an average payment period of <span className="font-medium">{party.debtor_days} days</span>.
                      {party.last_payment_date && (
                        <span> Last payment was received on {new Date(party.last_payment_date).toLocaleDateString()}.</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Note: Debtor days represent the average number of days this party takes to pay their invoices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}