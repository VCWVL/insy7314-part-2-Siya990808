import React, { useState } from 'react';

const SecureInput = ({ type='text', name, value, onChange, pattern, placeholder, required=false }) => {
  const [error, setError] = useState('');

  const handleChange = e => {
    const val = e.target.value;
    if (pattern && val && !pattern.test(val)) {
      setError(`Invalid ${name}`);
    } else {
      setError('');
    }
    onChange({ target: { name, value: val } });
  };

  return (
    <div className="secure-input-container">
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
      />
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  );
};

export default SecureInput;