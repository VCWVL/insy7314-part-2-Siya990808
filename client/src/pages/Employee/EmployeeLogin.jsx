// client/src/pages/Employee/EmployeeLogin.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const EmployeeLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value.trim()
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/employee/auth/login',
        formData,
        { withCredentials: true }
      );

      if (response.data.employee) {
        sessionStorage.setItem('employee', JSON.stringify(response.data.employee));
        navigate('/employee/dashboard');
      }
    } catch (err) {
      console.error('Employee login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Employee Portal</h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px' }}>
            International Payments Management
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '5px',
            color: '#c33',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '500' }}>
              Employee Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '500' }}>
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s'
            }}
          >
            {loading ? 'Logging in...' : 'Employee Login'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffc107'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
            <strong>Employee Access Only</strong><br />
            This portal is restricted to authorized bank staff.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link 
            to="/login" 
            style={{ 
              color: '#3498db', 
              textDecoration: 'none', 
              fontSize: '14px' 
            }}
          >
            ← Back to Customer Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;