import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (name, email, password, userType) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name,
        email,
        password,
        user_type: userType
      });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Components
const AuthModal = ({ isOpen, onClose, isLogin, setIsLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'vendor'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.name, formData.email, formData.password, formData.userType);
      }

      if (result.success) {
        onClose();
        setFormData({ name: '', email: '', password: '', userType: 'vendor' });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 modal-content">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Login' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                I am a
              </label>
              <select
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="vendor">Vendor (Street Food Seller)</option>
                <option value="supplier">Supplier (Farmer/Wholesaler)</option>
              </select>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterBar = ({ filters, setFilters, categories }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border">
    <h3 className="text-md font-semibold mb-3 text-gray-800">🔍 Market Filters</h3>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Min Rating</label>
        <select
          value={filters.minRating}
          onChange={(e) => setFilters({...filters, minRating: e.target.value})}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
        >
          <option value="">Any Rating</option>
          <option value="4.5">4.5+ ⭐</option>
          <option value="4.0">4.0+ ⭐</option>
          <option value="3.5">3.5+ ⭐</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          placeholder="Search location..."
          value={filters.location}
          onChange={(e) => setFilters({...filters, location: e.target.value})}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Min Quantity</label>
        <input
          type="number"
          placeholder="Bulk quantity..."
          value={filters.minQuantity}
          onChange={(e) => setFilters({...filters, minQuantity: e.target.value})}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
        />
      </div>
    </div>
  </div>
);

const ProductFilters = ({ filters, setFilters }) => (
  <div className="bg-gray-50 rounded-lg p-3 mb-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Price Range</label>
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="">All Categories</option>
          <option value="Vegetables">Vegetables</option>
          <option value="Fruits">Fruits</option>
          <option value="Spices">Spices</option>
          <option value="Herbs">Herbs</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock</label>
        <input
          type="number"
          placeholder="Min quantity..."
          value={filters.minQuantity}
          onChange={(e) => setFilters({...filters, minQuantity: e.target.value})}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        />
      </div>
    </div>
  </div>
);

const NotificationPanel = ({ notifications, onMarkRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-800"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <div className="font-medium text-sm text-gray-800">
                    {notification.title}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {notification.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewModal = ({ isOpen, onClose, supplier, onSubmitReview }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmitReview(supplier.id, rating, comment);
      setRating(5);
      setComment('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 modal-content">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Review {supplier.stall_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              placeholder="Share your experience..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-green-400"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

const SupplierCard = ({ supplier, onViewStall, onReview }) => (
  <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 supplier-card stall-card">
    <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500 relative overflow-hidden">
      <img
        src={supplier.image_url}
        alt={supplier.stall_name}
        className="w-full h-full object-cover"
      />
      <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-sm font-medium shadow">
        ⭐ {supplier.rating}
      </div>
      <div className="absolute top-3 left-3 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
        🏪 STALL
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-lg mb-2 text-gray-800">{supplier.stall_name}</h3>
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{supplier.description}</p>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-500">📍 {supplier.location}</span>
        <span className="text-xs text-gray-500">🚚 {supplier.delivery_rating}★</span>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        👥 {supplier.total_reviews || 0} reviews
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onViewStall(supplier)}
          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 transition-colors text-sm"
        >
          Visit Stall
        </button>
        <button
          onClick={() => onReview(supplier)}
          className="bg-blue-500 text-white py-2 px-3 rounded-md hover:bg-blue-600 transition-colors text-sm"
        >
          Review
        </button>
      </div>
    </div>
  </div>
);

const ProductCard = ({ product, onAddToCart }) => {
  const getBulkPricing = () => {
    if (!product.bulk_discount_tiers || product.bulk_discount_tiers.length === 0) return null;
    
    return product.bulk_discount_tiers.map(tier => {
      const discountedPrice = product.price_per_unit * (1 - tier.discount);
      return (
        <div key={tier.min_qty} className="text-xs text-green-600">
          {tier.min_qty}+ {product.unit}: ${discountedPrice.toFixed(2)}/{product.unit}
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:-translate-y-1 transition-transform duration-200">
      <div className="h-32 bg-gradient-to-br from-yellow-400 to-orange-500 overflow-hidden relative">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-xs font-medium">
          {product.category}
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-md mb-1">{product.name}</h4>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.description}</p>
        
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-green-600 price-highlight">
              ${product.price_per_unit}/{product.unit}
            </span>
            <span className="text-xs text-gray-500">{product.quantity_available} available</span>
          </div>
          
          {/* Bulk Pricing Display */}
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium text-gray-700">🏪 Bulk Pricing:</div>
            {getBulkPricing()}
          </div>
        </div>
        
        <button
          onClick={() => onAddToCart(product)}
          className="w-full bg-orange-500 text-white py-2 px-3 rounded text-sm hover:bg-orange-600 transition-colors btn-market"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

const SupplierDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [myStall, setMyStall] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showCreateStall, setShowCreateStall] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token, logout, user } = useAuth();

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Vegetables',
    price_per_unit: '',
    unit: 'kg',
    quantity_available: '',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2',
    bulk_discount_tiers: [
      { min_qty: 10, discount: 0.05, label: '10+ kg: 5% off' },
      { min_qty: 25, discount: 0.10, label: '25+ kg: 10% off' }
    ]
  });

  // New stall form state
  const [newStall, setNewStall] = useState({
    stall_name: '',
    description: '',
    contact_phone: '',
    location: '',
    image_url: 'https://images.unsplash.com/photo-1532079563951-0c8a7dacddb3'
  });

  useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    try {
      // Try to get existing stall
      const stallResponse = await axios.get(`${API}/suppliers/my-stall`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyStall(stallResponse.data);

      // Load products
      const productsResponse = await axios.get(`${API}/products/my-products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyProducts(productsResponse.data);

      // Load analytics
      const analyticsResponse = await axios.get(`${API}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(analyticsResponse.data);

      // Load orders
      const ordersResponse = await axios.get(`${API}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(ordersResponse.data);

    } catch (error) {
      if (error.response?.status === 404) {
        setShowCreateStall(true);
      }
      console.error('Error loading supplier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStall = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/suppliers`, newStall, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateStall(false);
      loadSupplierData();
    } catch (error) {
      console.error('Error creating stall:', error);
      alert('Failed to create stall');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/products`, {
        ...newProduct,
        price_per_unit: parseFloat(newProduct.price_per_unit),
        quantity_available: parseInt(newProduct.quantity_available)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddProduct(false);
      setNewProduct({
        name: '',
        category: 'Vegetables',
        price_per_unit: '',
        unit: 'kg',
        quantity_available: '',
        description: '',
        image_url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2',
        bulk_discount_tiers: [
          { min_qty: 10, discount: 0.05, label: '10+ kg: 5% off' },
          { min_qty: 25, discount: 0.10, label: '25+ kg: 10% off' }
        ]
      });
      loadSupplierData();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadSupplierData();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supplier dashboard...</p>
        </div>
      </div>
    );
  }

  if (showCreateStall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🏪 Create Your Digital Stall</h2>
            <form onSubmit={handleCreateStall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stall Name</label>
                <input
                  type="text"
                  required
                  value={newStall.stall_name}
                  onChange={(e) => setNewStall({...newStall, stall_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Fresh Garden Produce"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={newStall.description}
                  onChange={(e) => setNewStall({...newStall, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  placeholder="Describe your stall and what you offer..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={newStall.contact_phone}
                  onChange={(e) => setNewStall({...newStall, contact_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  placeholder="+1-555-0123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={newStall.location}
                  onChange={(e) => setNewStall({...newStall, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Central Market District"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Create Stall
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">🏪 Supplier Dashboard</h1>
              {myStall && <p className="text-sm text-gray-600">{myStall.stall_name}</p>}
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 px-3 py-1 rounded-md transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                + Add Product
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'products', 'orders', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{analytics.total_products}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{analytics.total_orders}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-yellow-600">${analytics.total_revenue}</div>
              <div className="text-sm text-gray-600">Revenue</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-purple-600">{analytics.rating}⭐</div>
              <div className="text-sm text-gray-600">{analytics.total_reviews} Reviews</div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Your Products</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                + Add Product
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {myProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-green-400 to-blue-500 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-md mb-1">{product.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{product.category}</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-green-600">${product.price_per_unit}/{product.unit}</span>
                      <span className="text-xs text-gray-500">{product.quantity_available} left</span>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="w-full bg-red-500 text-white py-1 px-2 rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Orders</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-500">No orders yet</div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Order #{order.id.slice(-8)}</div>
                        <div className="text-sm text-gray-600">{order.items.length} items</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${order.total_amount}</div>
                        <div className="text-sm text-gray-600">{order.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Analytics Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Top Products</h3>
                {analytics.top_products.map((product, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span>{product.name}</span>
                    <span className="text-green-600">{product.sales} sales</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Average Rating</span>
                    <span className="font-medium">{analytics.rating}⭐</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Reviews</span>
                    <span className="font-medium">{analytics.total_reviews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Products Listed</span>
                    <span className="font-medium">{analytics.total_products}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto modal-content">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 pb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Add New Product</h3>
                <button onClick={() => setShowAddProduct(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            
            <div className="p-6 pt-4">
              <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                >
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Spices">Spices</option>
                  <option value="Herbs">Herbs</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.price_per_unit}
                    onChange={(e) => setNewProduct({...newProduct, price_per_unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="pieces">pieces</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Available</label>
                <input
                  type="number"
                  required
                  value={newProduct.quantity_available}
                  onChange={(e) => setNewProduct({...newProduct, quantity_available: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    placeholder="Enter image URL or choose from presets below..."
                  />
                  
                  {/* Image Preview */}
                  {newProduct.image_url && (
                    <div className="mt-2">
                      <img
                        src={newProduct.image_url}
                        alt="Product preview"
                        className="w-20 h-20 object-cover rounded-md border"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Preset Image Options */}
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Quick select preset images:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Vegetables', url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400' },
                        { name: 'Fruits', url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400' },
                        { name: 'Spices', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400' },
                        { name: 'Herbs', url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400' }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setNewProduct({...newProduct, image_url: preset.url})}
                          className="relative group"
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-12 object-cover rounded border hover:border-green-500 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded flex items-center justify-center">
                            <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              {preset.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                Add Product
              </button>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CartView = ({ cart, onRemoveItem, onUpdateQuantity, onBackToMarket }) => {
  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      onRemoveItem(productId);
    } else {
      onUpdateQuantity(productId, newQuantity);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🛒 Your Cart</h2>
          <button
            onClick={onBackToMarket}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Continue Shopping
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">Your cart is empty</div>
            <button
              onClick={onBackToMarket}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">🥬</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{item.name || 'Product'}</h3>
                      <p className="text-sm text-gray-600">${item.price_per_unit}/unit</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        ${(item.quantity * item.price_per_unit).toFixed(2)}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onRemoveItem(item.product_id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-800">Total Items:</span>
                <span className="text-lg font-semibold text-gray-800">{cart.items.length}</span>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                <span className="text-xl font-bold text-green-600">${cart.total_amount.toFixed(2)}</span>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={onBackToMarket}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Continue Shopping
                </button>
                <button
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VirtualMarket = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSupplierForReview, setSelectedSupplierForReview] = useState(null);
  const [showCartView, setShowCartView] = useState(false);
  
  // Filter states
  const [supplierFilters, setSupplierFilters] = useState({
    category: '',
    minRating: '',
    location: '',
    minQuantity: ''
  });
  
  const [productFilters, setProductFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    minQuantity: ''
  });

  const { user, token, logout } = useAuth();

  const categories = ['Vegetables', 'Fruits', 'Spices', 'Herbs'];

  useEffect(() => {
    loadSuppliers();
    loadNotifications();
    initializeDemoData();
    if (token) {
      loadCart();
    }
  }, [supplierFilters, token]);

  useEffect(() => {
    if (selectedSupplier) {
      loadSupplierProducts(selectedSupplier.id);
      loadSupplierReviews(selectedSupplier.id);
    }
  }, [selectedSupplier, productFilters]);

  const loadCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error('Error loading cart:', error);
      // Keep empty cart state if error
    }
  };

  const initializeDemoData = async () => {
    try {
      await axios.post(`${API}/demo/init`);
    } catch (error) {
      console.error('Error initializing demo data:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (supplierFilters.category) params.append('category', supplierFilters.category);
      if (supplierFilters.minRating) params.append('min_rating', supplierFilters.minRating);
      if (supplierFilters.location) params.append('location', supplierFilters.location);

      const response = await axios.get(`${API}/suppliers?${params.toString()}`);
      setSuppliers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setLoading(false);
    }
  };

  const loadSupplierProducts = async (supplierId) => {
    try {
      const params = new URLSearchParams();
      if (productFilters.category) params.append('category', productFilters.category);
      if (productFilters.minPrice) params.append('min_price', productFilters.minPrice);
      if (productFilters.maxPrice) params.append('max_price', productFilters.maxPrice);
      if (productFilters.minQuantity) params.append('min_quantity', productFilters.minQuantity);

      const response = await axios.get(`${API}/suppliers/${supplierId}/products?${params.toString()}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSupplierReviews = async (supplierId) => {
    try {
      const response = await axios.get(`${API}/suppliers/${supplierId}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadNotifications = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleViewStall = (supplier) => {
    setSelectedSupplier(supplier);
    loadSupplierProducts(supplier.id);
    loadSupplierReviews(supplier.id);
  };

  const handleReviewSupplier = (supplier) => {
    setSelectedSupplierForReview(supplier);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (supplierId, rating, comment) => {
    try {
      await axios.post(`${API}/reviews`, {
        supplier_id: supplierId,
        rating,
        comment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Review submitted successfully!');
      
      // Reload supplier data and reviews
      loadSuppliers();
      if (selectedSupplier && selectedSupplier.id === supplierId) {
        loadSupplierReviews(supplierId);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error.response?.data?.detail || 'Failed to submit review');
    }
  };

  const handleAddToCart = async (product) => {
    if (!token) {
      alert('Please login to add items to cart');
      return;
    }

    try {
      const cartItem = {
        product_id: product.id,
        supplier_id: product.supplier_id,
        quantity: 1,
        price_per_unit: product.price_per_unit
      };

      await axios.post(`${API}/cart/add`, cartItem, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reload cart from backend to ensure synchronization
      await loadCart();

      alert('Item added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart');
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleBackToMarket = () => {
    setSelectedSupplier(null);
    setProducts([]);
    setReviews([]);
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      await axios.delete(`${API}/cart/remove/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadCart();
      alert('Item removed from cart!');
    } catch (error) {
      console.error('Error removing from cart:', error);
      alert('Failed to remove item from cart');
    }
  };

  const handleUpdateCartItem = async (productId, quantity) => {
    try {
      await axios.put(`${API}/cart/update/${productId}?quantity=${quantity}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      alert('Failed to update cart');
    }
  };

  const handleViewCart = () => {
    setShowCartView(true);
    setSelectedSupplier(null);
  };

  const handleBackToMarketFromCart = () => {
    setShowCartView(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading the marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-700">🏪 MicroMarket</h1>
              {selectedSupplier && (
                <button
                  onClick={handleBackToMarket}
                  className="ml-6 text-blue-600 hover:text-blue-800 flex items-center market-nav"
                >
                  ← Back to Market
                </button>
              )}
              {showCartView && (
                <button
                  onClick={handleBackToMarketFromCart}
                  className="ml-6 text-blue-600 hover:text-blue-800 flex items-center market-nav"
                >
                  ← Back to Market
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-4">
                  <NotificationPanel 
                    notifications={notifications}
                    onMarkRead={handleMarkNotificationRead}
                  />
                  <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                  <button
                    onClick={handleViewCart}
                    className="bg-green-100 hover:bg-green-200 px-3 py-1 rounded-full text-xs transition-colors border border-green-300 hover:border-green-400"
                  >
                    🛒 {cart.items.length} items (${cart.total_amount.toFixed(2)})
                  </button>
                  <button
                    onClick={logout}
                    className="text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 px-3 py-1 rounded-md transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCartView ? (
          <CartView 
            cart={cart}
            onRemoveItem={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateCartItem}
            onBackToMarket={handleBackToMarketFromCart}
          />
        ) : !selectedSupplier ? (
          <div>
            {/* Market Overview */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Welcome to the Virtual Wholesale Market
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Browse digital stalls from local suppliers and farmers. Find fresh produce, 
                compare prices, and order in bulk for your street food business.
              </p>
            </div>

            {/* Filters */}
            <FilterBar 
              filters={supplierFilters}
              setFilters={setSupplierFilters}
              categories={categories}
            />

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-responsive">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onViewStall={handleViewStall}
                  onReview={handleReviewSupplier}
                />
              ))}
            </div>
            
            {suppliers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No suppliers found matching your filters.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Supplier Stall View */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={selectedSupplier.image_url}
                  alt={selectedSupplier.stall_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedSupplier.stall_name}</h2>
                  <p className="text-gray-600">{selectedSupplier.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-yellow-600">⭐ {selectedSupplier.rating} Rating</span>
                    <span className="text-sm text-blue-600">🚚 {selectedSupplier.delivery_rating} Delivery</span>
                    <span className="text-sm text-gray-600">📞 {selectedSupplier.contact_phone}</span>
                    <span className="text-sm text-gray-600">👥 {reviews.length} Reviews</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Filters */}
            <ProductFilters 
              filters={productFilters}
              setFilters={setProductFilters}
            />

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
            
            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found matching your filters.</p>
              </div>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Customer Reviews</h3>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map(review => (
                    <div key={review.id} className="border-b pb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="text-yellow-400">
                          {'⭐'.repeat(review.rating)}
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        supplier={selectedSupplierForReview}
        onSubmitReview={handleSubmitReview}
      />
    </div>
  );
};

const Home = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    // Show different dashboard based on user type
    if (user.user_type === 'supplier') {
      return <SupplierDashboard />;
    } else {
      return <VirtualMarket />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
              🏪 MicroMarket
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The Digital Wholesale Marketplace connecting street food vendors with fresh produce suppliers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setIsLogin(false);
                  setAuthModalOpen(true);
                }}
                className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors btn-market"
              >
                Start Selling (Vendor)
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setAuthModalOpen(true);
                }}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors btn-market"
              >
                Join as Supplier
              </button>
              <button
                onClick={() => {
                  setIsLogin(true);
                  setAuthModalOpen(true);
                }}
                className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:border-gray-400 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-lg overflow-hidden shadow-2xl shadow-market-lg">
            <img
              src="https://images.unsplash.com/photo-1532079563951-0c8a7dacddb3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxtYXJrZXRwbGFjZXxlbnwwfHx8fDE3NTM1Mzg0NDd8MA&ixlib=rb-4.1.0&q=85"
              alt="Virtual Marketplace"
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Choose MicroMarket?</h2>
          <p className="text-lg text-gray-600">Everything you need to run your street food business efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-market">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Virtual Market Map</h3>
            <p className="text-gray-600">Navigate through digital stalls like walking in a real bazaar. Advanced filters and smooth browsing experience.</p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-market">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Smart Pricing & Bulk Discounts</h3>
            <p className="text-gray-600">Real-time price updates, bulk discount tiers, and price drop notifications to maximize your savings.</p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-market">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛒</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Complete Supplier Management</h3>
            <p className="text-gray-600">Multi-supplier cart, reviews system, order tracking, and supplier analytics dashboard.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Business?</h2>
          <p className="text-xl text-green-100 mb-8">Join thousands of vendors and suppliers already using MicroMarket</p>
          <button
            onClick={() => {
              setIsLogin(false);
              setAuthModalOpen(true);
            }}
            className="bg-white text-green-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors btn-market"
          >
            Get Started Today
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Home />
      </div>
    </AuthProvider>
  );
}

export default App;