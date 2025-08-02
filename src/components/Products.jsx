import React, { useEffect, useState } from 'react';
import '../styles/Products.css'; // Create this file for custom styling

export default function Products() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await window.electronAPI.getProducts();
    if (Array.isArray(data)) {
      setProducts(data);
    } else {
      setError(data?.error || 'Failed to load products.');
    }
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <h2>📦 Products</h2>
        <p className="page-subtitle">View and manage your product inventory</p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Form</th>
              <th>UOM</th>
              <th>Qty in UOM</th>
              <th>Addictive</th>
              <th>Imported</th>
              <th>Retail Price</th>
              <th>Withheld Price</th>
              <th>Shelf No</th>
              <th>Hold Sale</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.form || '-'}</td>
                <td>{p.uom || '-'}</td>
                <td>{p.quantity_in_uom}</td>
                <td>{p.is_addictive ? 'Yes' : 'No'}</td>
                <td>{p.is_imported ? 'Yes' : 'No'}</td>
                <td>Rs {p.retail_price?.toFixed(2)}</td>
                <td>Rs {p.withheld_price?.toFixed(2)}</td>
                <td>{p.shelf_no || '-'}</td>
                <td>{p.hold_sale ? 'Yes' : 'No'}</td>
                <td>{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center' }}>No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}