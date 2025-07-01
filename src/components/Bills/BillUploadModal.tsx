import React, { useState } from 'react';
import { X, Upload, Camera, FileText, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface BillUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: (billData: any) => void;
}

export default function BillUploadModal({ isOpen, onClose, categories, onSuccess }: BillUploadModalProps) {
  const { selectedFirm } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Simulate OCR processing
      simulateOCR(file);
    }
  };

  const simulateOCR = async (file: File) => {
    setLoading(true);
    
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock OCR text based on selected category
    const mockOcrText = `
PURCHASE INVOICE
Invoice No: INV-${Math.floor(Math.random() * 10000)}
Date: ${new Date().toLocaleDateString()}
Supplier: ABC Suppliers Ltd
GST: 27ABCDE1234F1Z5

Items:
${selectedCategory} Products - 200 pieces
Unit Price: ₹450
Total: ₹90,000

Additional Items - 150 pieces  
Unit Price: ₹225
Total: ₹33,750

Subtotal: ₹1,23,750
GST (18%): ₹22,275
Total Amount: ₹1,46,025
    `.trim();

    const mockParsedData = {
      bill_number: `INV-${Math.floor(Math.random() * 10000)}`,
      supplier_name: 'ABC Suppliers Ltd',
      bill_date: new Date().toISOString().split('T')[0],
      total_amount: 146025,
      items: [
        {
          product_name: `${selectedCategory} Products`,
          quantity: 200,
          pieces_per_case: 50,
          unit_price: 450,
          total_price: 90000,
          category: selectedCategory
        },
        {
          product_name: `Additional ${selectedCategory} Items`,
          quantity: 150,
          pieces_per_case: 100,
          unit_price: 225,
          total_price: 33750,
          category: selectedCategory
        }
      ]
    };

    setOcrText(mockOcrText);
    setParsedData(mockParsedData);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedCategory || !parsedData) return;

    try {
      setLoading(true);
      
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const billData = {
        ...parsedData,
        category: selectedCategory,
        file_url: URL.createObjectURL(selectedFile),
        ocr_text: ocrText,
        parsed_data: parsedData,
      };

      onSuccess(billData);
      resetForm();
    } catch (error) {
      console.error('Error uploading bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCategory('');
    setOcrText('');
    setParsedData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Bill</h2>
                <p className="text-sm text-gray-500">Upload bill photo or PDF for OCR processing</p>
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
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedCategory === category.name
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{category.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Bill Photo / PDF *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFile ? selectedFile.name : 'Choose file to upload'}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Supports JPG, PNG, PDF up to 10MB
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Choose File</span>
                </label>
              </div>
            </div>
          </div>

          {/* OCR Processing */}
          {loading && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-700 font-medium">Processing OCR...</span>
              </div>
            </div>
          )}

          {/* OCR Results */}
          {ocrText && parsedData && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">OCR Processing Complete</span>
                </div>
                <div className="text-sm text-green-600">
                  Successfully extracted bill data. Please review before submitting.
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Extracted Data:</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Bill Number:</span> {parsedData.bill_number}
                    </div>
                    <div>
                      <span className="font-medium">Supplier:</span> {parsedData.supplier_name}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(parsedData.bill_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> ₹{parsedData.total_amount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Items:</span> {parsedData.items.length} products
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <div className="font-medium">Review Required</div>
                    <div>Please verify the extracted data is correct before submitting for approval.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || !selectedCategory || !parsedData || loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}