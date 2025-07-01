import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Edit, Trash2, Palette, AlertTriangle, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  firm_id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  product_count?: number;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  firmId: string | null;
  categories: Category[];
  onSuccess: () => void;
}

const colorOptions = [
  { name: 'Green', value: 'bg-green-500', preview: 'bg-green-500' },
  { name: 'Blue', value: 'bg-blue-500', preview: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500', preview: 'bg-purple-500' },
  { name: 'Red', value: 'bg-red-500', preview: 'bg-red-500' },
  { name: 'Orange', value: 'bg-orange-500', preview: 'bg-orange-500' },
  { name: 'Teal', value: 'bg-teal-500', preview: 'bg-teal-500' },
  { name: 'Pink', value: 'bg-pink-500', preview: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500', preview: 'bg-indigo-500' },
  { name: 'Yellow', value: 'bg-yellow-500', preview: 'bg-yellow-500' },
  { name: 'Cyan', value: 'bg-cyan-500', preview: 'bg-cyan-500' },
  { name: 'Lime', value: 'bg-lime-500', preview: 'bg-lime-500' },
  { name: 'Amber', value: 'bg-amber-500', preview: 'bg-amber-500' },
];

export default function CategoryManagementModal({ isOpen, onClose, firmId, categories, onSuccess }: CategoryManagementModalProps) {
  const { userProfile } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're using mock data
    if (categories.some(cat => cat.id.startsWith('cat-'))) {
      setIsUsingMockData(true);
    } else {
      setIsUsingMockData(false);
    }
  }, [categories]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmId) return;
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (isUsingMockData) {
        if (editingCategory) {
          console.log('Category updated (mock):', {
            id: editingCategory.id,
            name: formData.name,
            description: formData.description,
            color: formData.color,
          });
        } else {
          console.log('Category created (mock):', {
            firm_id: firmId,
            name: formData.name,
            description: formData.description,
            color: formData.color,
            created_by: userProfile?.id,
          });
        }

        onSuccess();
        resetForm();
        return;
      }
      
      if (editingCategory) {
        // Update existing category
        const { data, error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating category:', error);
          setError('Failed to update category. Please try again.');
          throw error;
        }
        
        console.log('Category updated:', data);
      } else {
        // Create new category
        const { data, error } = await supabase
          .from('categories')
          .insert({
            firm_id: firmId,
            name: formData.name,
            description: formData.description,
            color: formData.color,
            created_by: userProfile?.id
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating category:', error);
          setError('Failed to create category. Please try again.');
          throw error;
        }
        
        console.log('Category created:', data);
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will be unassigned.')) return;

    try {
      setLoading(true);
      setError(null);
      
      if (isUsingMockData) {
        console.log('Category deleted (mock):', categoryId);
        onSuccess();
        return;
      }
      
      // Check if category has products
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId);
      
      if (countError) {
        console.error('Error checking category products:', countError);
      } else if (count && count > 0) {
        // Update products to remove category
        const { error: updateError } = await supabase
          .from('products')
          .update({ category_id: null })
          .eq('category_id', categoryId);
        
        if (updateError) {
          console.error('Error updating products:', updateError);
        }
      }
      
      // Delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) {
        console.error('Error deleting category:', error);
        setError('Failed to delete category. Please try again.');
        throw error;
      }
      
      console.log('Category deleted:', categoryId);
      onSuccess();
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: 'bg-blue-500' });
    setShowCreateForm(false);
    setEditingCategory(null);
    setErrors({});
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
    setShowCreateForm(true);
    setErrors({});
  };

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
              <p className="text-sm text-gray-500">Manage product categories for this firm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="text-sm text-red-600">{error}</div>
            </div>
          </div>
        )}

        {/* Mock Data Notice */}
        {isUsingMockData && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-600">
                You're viewing demo data. Changes won't be saved to the database.
              </div>
            </div>
          </div>
        )}

        {!showCreateForm ? (
          <div className="space-y-4">
            {/* Search and Add New */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Categories List */}
            <div className="space-y-3 mt-4">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center`}>
                        <Tag className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-500">{category.description}</div>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="text-xs text-gray-400">
                            Created: {new Date(category.created_at).toLocaleDateString()}
                          </div>
                          {category.product_count !== undefined && (
                            <div className="flex items-center space-x-1 text-xs text-purple-600">
                              <Package className="w-3 h-3" />
                              <span>{category.product_count} products</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEdit(category)}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        disabled={loading}
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2">
                    {searchTerm ? 'No matching categories found' : 'No categories found'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {searchTerm ? 'Try a different search term' : 'Create your first product category to organize inventory'}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">
                  Category Color *
                </label>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      formData.color === color.value
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${color.preview}`}></div>
                    <span className="text-sm font-medium text-gray-700">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Errors Summary */}
            {Object.keys(errors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Please fix the following errors:</p>
                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                      {Object.values(errors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}