import React, { useState } from 'react';
import { apiClient } from '../../contexts/SecurityContext';
import { useNavigate, Link } from 'react-router-dom';

const RegistrationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    accountNumber: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full Name is required';
    if (!formData.idNumber || !/^\d{13}$/.test(formData.idNumber)) newErrors.idNumber = 'Valid 13-digit ID required';
    if (!formData.accountNumber || !/^\d{8,12}$/.test(formData.accountNumber)) newErrors.accountNumber = 'Valid account number required';
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords must match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', formData);
      setSuccessMsg('Registration successful! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error(err.response?.data);
      setErrors({ submit: err.response?.data?.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Create Account </h2>
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {errors.submit && <div className="alert alert-error">{errors.submit}</div>}
        
        <form onSubmit={handleSubmit}>
          <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} />
          {errors.fullName && <span className="validation-error">{errors.fullName}</span>}

          <input type="text" name="idNumber" placeholder="ID Number" value={formData.idNumber} onChange={handleChange} />
          {errors.idNumber && <span className="validation-error">{errors.idNumber}</span>}

          <input type="text" name="accountNumber" placeholder="Account Number" value={formData.accountNumber} onChange={handleChange} />
          {errors.accountNumber && <span className="validation-error">{errors.accountNumber}</span>}

          <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
          {errors.username && <span className="validation-error">{errors.username}</span>}

          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
          {errors.password && <span className="validation-error">{errors.password}</span>}

          <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />
          {errors.confirmPassword && <span className="validation-error">{errors.confirmPassword}</span>}

          <button type="submit" disabled={loading}>
            {loading ? ' Creating Account...' : ' Create Account'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>Already have an account? <Link to="/login">Sign in here</Link></p>
        </div>

        <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: 0, textAlign: 'center' }}>
             Password must contain: 8+ characters, uppercase, lowercase, number, and special character
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;