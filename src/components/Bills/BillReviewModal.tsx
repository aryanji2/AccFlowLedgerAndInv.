import React from 'react';
import { X, FileText, Check, AlertTriangle, Package, Calendar, User } from 'lucide-react';

interface Bill {
  id: string;
  bill_number: string;
  supplier_name: string;
  total_amount: number;
  bill_date: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by_name: string;
  created_at: string;
  items?: BillItem[];
}

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  pieces_per_case: number;
  unit_price: number;
  total_price: number;
  category: string;
}

interface BillReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  onApprove: (billId: string) => void;
  onReject: (billId: string) => void;
  canApprove: boolean;
}

export default function BillReviewModal({ isOpen, onClose, bill, onApprove, onReject, canApprove }: BillReviewModalProps) {
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
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Bill Review</h2>
                <p className="text-sm text-gray-500">Review bill details and approve for inventory update</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Bill Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bill Number</label>
                <div className="mt-1 text-sm text-gray-900">{bill.bill_number}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <div className="mt-1 text-sm text-gray-900">{bill.supplier_name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bill Date</label>
                <div className="mt-1 text-sm text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(bill.bill_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {bill.category}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                    {bill.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <div className="mt-1 text-sm text-gray-900 flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{bill.created_by_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Items */}
          {bill.items && bill.items.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bill.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-500">
                            {item.pieces_per_case} pieces per case
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity} pieces
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(bill.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Approval Notice */}
          {bill.status === 'pending' && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <div className="font-medium">Approval Required</div>
                  <div>
                    This bill is pending approval. Once approved, the items will be automatically added to inventory.
                  </div>
                </div>
              </div>
            </div>
          )}

          {bill.status === 'approved' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-700">
                  <div className="font-medium">Bill Approved</div>
                  <div>
                    This bill has been approved and the items have been added to inventory.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {bill.status === 'pending' && canApprove && (
              <>
                <button
                  onClick={() => {
                    onReject(bill.id);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    onApprove(bill.id);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve & Update Inventory
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}