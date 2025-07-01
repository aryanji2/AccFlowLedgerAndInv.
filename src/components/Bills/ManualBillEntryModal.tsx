import React, { useState } from 'react';
import { X, FileText, Plus, Trash2, Package, Clipboard, RotateCcw } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface Category {
  id: string;
  name: string;
  color: string;
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

interface ManualBillEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: (billData: any) => void;
}

export default function ManualBillEntryModal({ isOpen, onClose, categories, onSuccess }: ManualBillEntryModalProps) {
  const { selectedFirm } = useApp();
  const [formData, setFormData] = useState({
    bill_number: '',
    supplier_name: '',
    bill_date: new Date().toISOString().split('T')[0],
    category: '',
  });
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const parseTextInput = () => {
    if (!textInput.trim() || !formData.category) {
      alert('Please enter text and select a category first');
      return;
    }

    const lines = textInput.split('\n').filter(line => line.trim());
    const parsedItems: BillItem[] = [];

    lines.forEach((line, index) => {
      // Expected format: "Description – Total pieces \ Pieces per case"
      // Example: "MANSA A4 172 MRP 80/85 – 324 pcs\ 162"
      
      const match = line.match(/^(.+?)\s*[–-]\s*(\d+)(?:\s*(?:pcs?|pieces?|p))?\s*[\\\/]\s*(\d+)$/i);
      
      if (match) {
        const [, description, totalPieces, piecesPerCase] = match;
        const quantity = parseInt(totalPieces);
        const perCase = parseInt(piecesPerCase);
        const cases = Math.floor(quantity / perCase);
        
        // Extract price from description if available (looking for numbers that could be prices)
        const priceMatch = description.match(/(\d+(?:\.\d{2})?)/g);
        let unitPrice = 0;
        
        if (priceMatch && priceMatch.length > 0) {
          // Take the last number as it's likely the price
          unitPrice = parseFloat(priceMatch[priceMatch.length - 1]);
        }

        const newItem: BillItem = {
          id: `parsed-${Date.now()}-${index}`,
          product_name: description.trim(),
          quantity: quantity,
          pieces_per_case: perCase,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
          category: formData.category,
        };

        parsedItems.push(newItem);
      }
    });

    if (parsedItems.length > 0) {
      setBillItems(prev => [...prev, ...parsedItems]);
      setTextInput('');
      setShowTextInput(false);
    } else {
      alert('No valid items found. Please check the format:\n"Description – Total pieces \\ Pieces per case"');
    }
  };

  const addBillItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      product_name: '',
      quantity: 0,
      pieces_per_case: 1,
      unit_price: 0,
      total_price: 0,
      category: formData.category,
    };
    setBillItems([...billItems, newItem]);
  };

  const updateBillItem = (id: string, field: keyof BillItem, value: any) => {
    setBillItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate total price when quantity or unit price changes
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const removeBillItem = (id: string) => {
    setBillItems(items => items.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return billItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bill_number || !formData.supplier_name || !formData.category || billItems.length === 0) {
      alert('Please fill all required fields and add at least one item');
      return;
    }

    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const billData = {
        ...formData,
        total_amount: getTotalAmount(),
        items: billItems,
      };

      onSuccess(billData);
      resetForm();
    } catch (error) {
      console.error('Error creating manual bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bill_number: '',
      supplier_name: '',
      bill_date: new Date().toISOString().split('T')[0],
      category: '',
    });
    setBillItems([]);
    setTextInput('');
    setShowTextInput(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Manual Bill Entry</h2>
                <p className="text-sm text-gray-500">Enter bill details manually or paste text from another source</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number *
              </label>
              <input
                type="text"
                value={formData.bill_number}
                onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                placeholder="Enter bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="Enter supplier name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date *
              </label>
              <input
                type="date"
                value={formData.bill_date}
                onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Text Input Section */}
          {showTextInput && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Paste Bill Text</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter bill text manually or paste text from another source
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter bill text here..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Required Format:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use format: "Description – Total pieces \ Pieces per case"</li>
                    <li>• Example: "MANSA A4 172 MRP 80/85 – 324 pcs\ 162"</li>
                    <li>• Description: Everything before "–"</li>
                    <li>• Total pieces: Number between "–" and "\" (can include pcs/pieces/p)</li>
                    <li>• Pieces per case: Number after "\"</li>
                    <li>• Cases calculated as: Total pieces ÷ Pieces per case</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTextInput('');
                      setShowTextInput(false);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextInput('')}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={parseTextInput}
                    disabled={!textInput.trim() || !formData.category}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Parse & Add Items</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bill Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Bill Items</h3>
              <div className="flex space-x-2">
                {!showTextInput && (
                  <button
                    type="button"
                    onClick={() => setShowTextInput(true)}
                    disabled={!formData.category}
                    className="flex items-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Clipboard className="w-4 h-4" />
                    <span>Paste from Clipboard</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={addBillItem}
                  disabled={!formData.category}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {billItems.length > 0 && (
              <div className="space-y-4">
                {billItems.map((item, index) => (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeBillItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => updateBillItem(item.id, 'product_name', e.target.value)}
                          placeholder="Enter product name"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateBillItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price *
                        </label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateBillItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total Price
                        </label>
                        <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded">
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Pieces per Case
                      </label>
                      <input
                        type="number"
                        value={item.pieces_per_case}
                        onChange={(e) => updateBillItem(item.id, 'pieces_per_case', parseInt(e.target.value) || 1)}
                        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Cases: {Math.floor(item.quantity / item.pieces_per_case)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(getTotalAmount())}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {billItems.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 mb-2">No items added</div>
                <div className="text-sm text-gray-400">
                  {formData.category ? 'Click "Add Item" to start adding products or "Paste from Clipboard" to parse text' : 'Select a category first'}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || billItems.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}