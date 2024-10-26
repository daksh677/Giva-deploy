import React, { useState, useEffect } from 'react';

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', quantity: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    fetchProducts();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.name || !form.description || !form.price || !form.quantity) {
      setError('All fields are required');
      return false;
    }
    
    const price = parseFloat(form.price);
    const quantity = parseInt(form.quantity);
    
    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number');
      return false;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number');
      return false;
    }
    
    return true;
  };

  const canModifyProduct = (productUserId) => {
    return isAdmin || productUserId === parseInt(userId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      const url = editingId 
        ? `http://localhost:5000/api/products/${editingId}`
        : 'http://localhost:5000/api/products';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save product');
      }

      setForm({ name: '', description: '', price: '', quantity: '' });
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      setError(err.message);
      console.error('Submit error:', err);
    }
  };

  const handleEdit = (product) => {
    if (!canModifyProduct(product.user_id)) {
      setError('You do not have permission to edit this product');
      return;
    }

    setForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      quantity: product.quantity.toString()
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, productUserId) => {
    if (!canModifyProduct(productUserId)) {
      setError('You do not have permission to delete this product');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }

      fetchProducts();
    } catch (err) {
      setError(err.message);
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
            <button
              className="absolute top-0 right-0 px-4 py-3"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side - Add Product Form */}
          <div className="md:w-1/3">
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-4">
              <h2 className="text-2xl font-bold mb-6">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Product Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Enter product description"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Enter quantity"
                    min="1"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded transition-colors"
                  >
                    {editingId ? 'Update Product' : 'Add Product'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm({ name: '', description: '', price: '', quantity: '' });
                      }}
                      className="w-1/3 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right side - Products List */}
          <div className="md:w-2/3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6">Existing Products</h2>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-pulse">Loading products...</div>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
                  <div className="space-y-4">
                    {products.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        No products found
                      </div>
                    ) : (
                      products.map((product) => (
                        <div
                          key={product.id}
                          className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-grow">
                              <h3 className="text-xl font-semibold text-gray-800">
                                {product.name}
                              </h3>
                              <p className="text-gray-600 mt-1">
                                {product.description}
                              </p>
                              <div className="mt-2">
                                <span className="text-lg font-bold text-blue-600">
                                  ₹{product.price}
                                </span>
                                <span className="text-sm text-gray-500 ml-4">
                                  Quantity: {product.quantity}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEdit(product)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"

                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(product.id, product.user_id)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"

                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductManagement;
