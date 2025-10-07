import React, { useState } from 'react';
import { useAuth, apiClient } from '../../contexts/SecurityContext';
import { useNavigate, Link } from 'react-router-dom';

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    accountNumber: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.username || !formData.accountNumber || !formData.password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', formData);
      setSuccessMsg('Login successful! Redirecting...');
      login(res.data.user);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Welcome to the Bank</h2>
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            name="username" 
            placeholder="Username" 
            value={formData.username} 
            onChange={handleChange} 
          />
          <input 
            type="text" 
            name="accountNumber" 
            placeholder="Account Number" 
            value={formData.accountNumber} 
            onChange={handleChange} 
          />
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={handleChange} 
          />
          <button type="submit" disabled={loading}>
            {loading ? '🔄 Signing in...' : ' Sign In'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>Don't have an account? <Link to="/register">Create one here</Link></p>
        </div>

        <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ fontSize: '14px', color: '#7f8c8d', margin: 0, textAlign: 'center' }}>
           Your security is our priority. All data is encrypted.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;