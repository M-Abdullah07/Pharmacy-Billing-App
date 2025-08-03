import React, { useEffect, useState } from 'react';
import '../styles/Products.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    form: '',
    uom: '',
    quantity_in_uom: '',
    is_addictive: false,
    is_imported: false,
    retail_price: '',
    withheld_price: '',
    shelf_no: '',
    hold_sale: false,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getProducts();
      if (Array.isArray(data)) {
        setProducts(data);
        setError('');
      } else {
        setError(data?.error || 'Failed to load products.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      alert('Product name is required.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.addProduct(newProduct);
      if (result.success) {
        setShowAddModal(false);
        resetForm();
        await loadProducts();
      } else {
        alert(result.error || 'Failed to add product.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      form: '',
      uom: '',
      quantity_in_uom: '',
      is_addictive: false,
      is_imported: false,
      retail_price: '',
      withheld_price: '',
      shelf_no: '',
      hold_sale: false,
    });
  };

  const handleInputChange = (field, value) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.form?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.shelf_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return amount ? `Rs ${parseFloat(amount).toFixed(2)}` : 'Rs 0.00';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="products-page">
      {/* Professional Header */}
      <div className="page-header">
        <h2>📦 Product Management</h2>
        <p className="page-subtitle">Comprehensive inventory management and product catalog</p>
      </div>

      {/* Professional Controls */}
      <div className="controls-container">
        <input
          type="text"
          placeholder="Search products by name, form, or shelf number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-bar"
        />
        <button 
          className="add-product-btn" 
          onClick={() => setShowAddModal(true)}
          disabled={loading}
        >
          ➕ Add New Product
        </button>
      </div>

      {/* Professional Error Display */}
      {error && <div className="error">{error}</div>}

      {/* Professional Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Form</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th>Addictive</th>
                <th>Imported</th>
                <th>Retail Price</th>
                <th>Wholesale Price</th>
                <th>Shelf Location</th>
                <th>Hold Sale</th>
                <th>Date Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.form || '—'}</td>
                  <td>{product.uom || '—'}</td>
                  <td>{product.quantity_in_uom || 0}</td>
                  <td>{product.is_addictive ? 'Yes' : 'No'}</td>
                  <td>{product.is_imported ? 'Yes' : 'No'}</td>
                  <td>{formatCurrency(product.retail_price)}</td>
                  <td>{formatCurrency(product.withheld_price)}</td>
                  <td>{product.shelf_no || '—'}</td>
                  <td>{product.hold_sale ? 'Yes' : 'No'}</td>
                  <td>{formatDate(product.created_at)}</td>
                </tr>
              ))}
              {filteredProducts.length === 0 && !loading && (
                <tr>
                  <td colSpan="11">
                    {searchQuery ? 'No products match your search criteria.' : 'No products available. Add your first product to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Professional Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <h3>Add New Product</h3>
            
            <div className="modal-form-grid">
              <input 
                type="text"
                placeholder="Product Name *"
                value={newProduct.name} 
                onChange={e => handleInputChange('name', e.target.value)}
                required
              />
              
              <input 
                type="text"
                placeholder="Form (e.g., Tablet, Syrup)"
                value={newProduct.form} 
                onChange={e => handleInputChange('form', e.target.value)}
              />
              
              <input 
                type="text"
                placeholder="Unit of Measure"
                value={newProduct.uom} 
                onChange={e => handleInputChange('uom', e.target.value)}
              />
              
              <input 
                type="number"
                placeholder="Quantity in UOM"
                value={newProduct.quantity_in_uom} 
                onChange={e => handleInputChange('quantity_in_uom', parseInt(e.target.value) || '')}
                min="0"
              />
              
              <input 
                type="number"
                placeholder="Retail Price (Rs)"
                value={newProduct.retail_price} 
                onChange={e => handleInputChange('retail_price', parseFloat(e.target.value) || '')}
                min="0"
                step="0.01"
              />
              
              <input 
                type="number"
                placeholder="Wholesale Price (Rs)"
                value={newProduct.withheld_price} 
                onChange={e => handleInputChange('withheld_price', parseFloat(e.target.value) || '')}
                min="0"
                step="0.01"
              />
              
              <input 
                type="text"
                placeholder="Shelf Number"
                value={newProduct.shelf_no} 
                onChange={e => handleInputChange('shelf_no', e.target.value)}
              />
            </div>

            <div className="checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={newProduct.is_addictive} 
                  onChange={e => handleInputChange('is_addictive', e.target.checked)}
                />
                Controlled/Addictive Substance
              </label>
              
              <label>
                <input 
                  type="checkbox" 
                  checked={newProduct.is_imported} 
                  onChange={e => handleInputChange('is_imported', e.target.checked)}
                />
                Imported Product
              </label>
              
              <label>
                <input 
                  type="checkbox" 
                  checked={newProduct.hold_sale} 
                  onChange={e => handleInputChange('hold_sale', e.target.checked)}
                />
                Hold Sale (Temporarily Unavailable)
              </label>
            </div>

            <div className="modal-actions">
              <button 
                onClick={handleAddProduct}
                disabled={loading || !newProduct.name.trim()}
              >
                {loading ? 'Adding...' : 'Add Product'}
              </button>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}