import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function Login() {
  const { login } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!email || !password) return notifyWarning('Enter your email and password.');
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (!result.success) return notifyError(result.error || 'Authentication failed.');
    notifySuccess('Email verified. Select your staff account and enter its PIN.');
  };

  return <div className="auth-screen"><div className="auth-card panel-card">
    <div className="auth-logo">GS</div>
    <h2 style={{ textAlign: 'center', margin: '0 0 4px' }}>GS WHOLESALE</h2>
    <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '0 0 18px' }}>Step 1 · Secure email login</p>
    <form onSubmit={submit}>
      <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" required minLength="6" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>
      <button className="primary-button full-width" disabled={busy}>{busy ? 'Checking…' : 'Continue to Staff PIN'}</button>
    </form>
  </div></div>;
}
