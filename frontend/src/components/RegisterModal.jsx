import React, { useState } from 'react';

export default function RegisterModal({ onClose, onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (phone.length !== 10) {
      setErrorMsg('Mobile Number must be exactly 10 digits.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      alert('Account registered successfully! Logging you in...');
      if (onRegisterSuccess) {
        onRegisterSuccess(data.user);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zoho-modal-overlay">
      <div className="zoho-modal-card zoho-modal-simple" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-user-plus" style={{ color: 'var(--zoho-blue)' }}></i> Citizen / User Registration
          </h2>
          <button className="zoho-modal-close" onClick={onClose}>&times;</button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Create your Helpdesk account to submit and track support tickets.
        </p>

        {errorMsg && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 12px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '14px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Ramesh Kumar Sahu" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Mobile Number (10 Digits) *</label>
            <input 
              type="tel" 
              className="form-control" 
              placeholder="e.g. 9826012345" 
              maxLength={10}
              required 
              value={phone} 
              onChange={handlePhoneChange} 
            />
            {phone && phone.length < 10 && (
              <small style={{ color: '#D97706', fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                {10 - phone.length} digit(s) remaining
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Email ID (Login Username) *</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="e.g. ramesh.sahu@gmail.com" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Create password..." 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" className="btn btn-zoho-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-check"></i>} Register Account
          </button>
        </form>

      </div>
    </div>
  );
}
