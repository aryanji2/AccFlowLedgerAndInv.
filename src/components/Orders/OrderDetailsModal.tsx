import React from 'react';
import { X, Package, Check, Edit, Trash2, User, Calendar, FileText, AlertTriangle } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  party: string;
  partyId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  createdBy: string;
  notes?: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  productName: string;
  pieces: number;
  cases: number;
  unitPrice: number;
  totalPrice: number;
  piecesPerCase: number;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onApprove?: (orderId: string, status: 'approved' | 'rejected') => void;
  onEdit?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
}

export default function OrderDetailsModal({ isOpen, onClose, order, onApprove, onEdit, onDelete }: OrderDetailsModalProps) {
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
      case 'draft': return 'text-gray-600 bg-gray-50';
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
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
                <p className="text-sm text-gray-500">{order.orderNumber}</p>
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
          {/* Order Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Number</label>
                <div className="mt-1 text-sm text-gray-900">{order.orderNumber}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Party</label>
                <div className="mt-1 text-sm text-gray-900">{order.party}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Date</label>
                <div className="mt-1 text-sm text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <div className="mt-1 text-sm text-gray-900 flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{order.createdBy}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </div>
              </div>
            </div>
            
            {order.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <div className="mt-1 text-sm text-gray-900 p-3 bg-blue-50 rounded-lg">
                  {order.notes}
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cases
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pieces
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
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">
                            {item.piecesPerCase} pieces per case
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.cases}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.pieces}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.totalPrice)}
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
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status-specific notices */}
          {order.status === 'pending' && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <div className="font-medium">Approval Required</div>
                  <div>
                    This order is pending approval. Once approved, inventory will be updated accordingly.
                  </div>
                </div>
              </div>
            </div>
          )}

          {order.status === 'approved' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-700">
                  <div className="font-medium">Order Approved</div>
                  <div>
                    This order has been approved and inventory has been updated.
                  </div>
                </div>
              </div>
            </div>
          )}

          {order.status === 'draft' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <div className="font-medium">Draft Order</div>
                  <div>
                    This order is saved as a draft. You can edit or submit it for approval.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {(order.status === 'draft' || order.status === 'pending') && onEdit && (
              <button
                onClick={() => {
                  onEdit(order.id);
                  onClose();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Order</span>
              </button>
            )}
            
            {order.status === 'draft' && onDelete && (
              <button
                onClick={() => {
                  onDelete(order.id);
                  onClose();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            
            {order.status === 'pending' && onApprove && (
              <>
                <button
                  onClick={() => {
                    onApprove(order.id, 'rejected');
                    onClose();
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => {
                    onApprove(order.id, 'approved');
                    onClose();
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}