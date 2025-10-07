import React, { useState, useEffect } from 'react';
import { useAuth, apiClient, SecurityUtils, VALIDATION_PATTERNS } from '../../contexts/SecurityContext';
import { Link, useNavigate } from 'react-router-dom';

const PaymentForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'ZAR',
    provider: '',
    swiftCode: '',
    beneficiaryAccount: ''
  });

  const [csrfToken, setCsrfToken] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await apiClient.get('/auth/csrf-token');
        setCsrfToken(response.data.csrfToken);
      } catch (err) {
        console.error('CSRF Token fetch failed:', err);
        setErrors({ 
          submit: 'Security token unavailable. Please refresh the page.' 
        });
      }
    };
    fetchCsrfToken();
  }, []);

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'amount':
        if (!value || !VALIDATION_PATTERNS.paymentAmount.test(value)) {
          error = 'Enter a valid positive amount (max 2 decimal places)';
        } else if (parseFloat(value) <= 0) {
          error = 'Amount must be greater than 0';
        }
        break;
      case 'currency':
        if (!value || !VALIDATION_PATTERNS.currencyCode.test(value)) {
          error = 'Enter a valid 3-letter currency code (e.g., ZAR, USD)';
        }
        break;
      case 'swiftCode':
        if (!value || !VALIDATION_PATTERNS.swiftCode.test(value)) {
          error = 'SWIFT code must be 8-11 alphanumeric characters';
        }
        break;
      case 'beneficiaryAccount':
        if (!value || value.length < 5) {
          error = 'Beneficiary account is required';
        } else if (!/^[A-Za-z0-9\s\-]+$/.test(value)) {
          error = 'Invalid beneficiary account format';
        }
        break;
      case 'provider':
        if (!value) {
          error = 'Please select a provider';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = SecurityUtils.sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    const error = validateField(name, sanitizedValue);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));

    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setErrors({ submit: 'Please log in to make payments' });
      return;
    }

    if (!csrfToken) {
      setErrors({ submit: 'Security token missing. Please refresh the page.' });
      return;
    }

    if (!validateForm()) {
      setErrors({ submit: 'Please fix the validation errors above' });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess('');

    try {
      const payload = {
        amount: parseFloat(formData.amount),
        currency: formData.currency.toUpperCase(),
        provider: formData.provider,
        swiftCode: formData.swiftCode.toUpperCase(),
        beneficiaryAccount: formData.beneficiaryAccount.trim()
      };
      
      await apiClient.post('/transactions', payload, {
        headers: { 'x-csrf-token': csrfToken }
      });

      setSuccess('Payment processed successfully! Redirecting to dashboard...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Payment error:', err);
      setErrors({ 
        submit: err.response?.data?.error || err.response?.data?.message || 'Server error processing payment' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="payment-container">
        <div className="payment-form-container">
          <div className="alert alert-error">
            Please log in to make a payment. <Link to="/login">Login here</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-form-container">
        <div className="payment-header">
          <h2> Make a Payment</h2>
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
        </div>
        
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}
        
        {errors.submit && (
          <div className="alert alert-error">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount *</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              required
            />
            {validationErrors.amount && (
              <span className="validation-error">{validationErrors.amount}</span>
            )}
          </div>

          <div className="form-group">
            <label>Currency *</label>
            <input
              type="text"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              placeholder="ZAR"
              maxLength={3}
              required
            />
            {validationErrors.currency && (
              <span className="validation-error">{validationErrors.currency}</span>
            )}
          </div>

          <div className="form-group">
            <label>Bank Provider *</label>
            <select 
              name="provider"
              value={formData.provider} 
              onChange={handleInputChange} 
              required
            >
              <option value="">Select a bank</option>
              <option value="StandardBank">Standard Bank</option>
              <option value="FNB">First National Bank (FNB)</option>
              <option value="ABSA">ABSA</option>
              <option value="Nedbank">Nedbank</option>
              <option value="Capitec">Capitec</option>
            </select>
            {validationErrors.provider && (
              <span className="validation-error">{validationErrors.provider}</span>
            )}
          </div>

          <div className="form-group">
            <label>SWIFT Code *</label>
            <input
              type="text"
              name="swiftCode"
              value={formData.swiftCode}
              onChange={handleInputChange}
              placeholder="SBZAZAJJ"
              required
            />
            {validationErrors.swiftCode && (
              <span className="validation-error">{validationErrors.swiftCode}</span>
            )}
          </div>

          <div className="form-group">
            <label>Beneficiary Account *</label>
            <input
              type="text"
              name="beneficiaryAccount"
              value={formData.beneficiaryAccount}
              onChange={handleInputChange}
              placeholder="Account number or name"
              required
            />
            {validationErrors.beneficiaryAccount && (
              <span className="validation-error">{validationErrors.beneficiaryAccount}</span>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? ' Processing...' : ' Submit Payment'}
            </button>
            <Link to="/dashboard" className="cancel-btn">
              Cancel
            </Link>
          </div>
        </form>

        <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}> Secure Transaction</h4>
          <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
            Your payment is protected by bank-level security including SSL encryption and CSRF protection.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;