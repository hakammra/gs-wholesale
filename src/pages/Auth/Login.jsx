import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function Login() {
  const { login, registerOwner, loginWithPin, trustedDevice } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const hasPinConfigured = Boolean(trustedDevice?.isTrusted && trustedDevice?.pinHash);

  // If PIN configured on this trusted device, start in PIN mode by default
  const [authMethod, setAuthMethod] = useState(hasPinConfigured ? 'pin' : 'password'); // 'pin' | 'password'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState(trustedDevice?.email || '');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('Business Owner');
  const [loading, setLoading] = useState(false);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      notifyWarning('Please enter your 4-digit PIN');
      return;
    }
    const res = loginWithPin(pin);
    if (res.success) {
      notifySuccess('Device unlocked successfully!');
    } else {
      notifyError(res.error || 'Invalid PIN');
      setPin('');
    }
  };

  const handlePinKeyClick = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        const res = loginWithPin(nextPin);
        if (res.success) {
          notifySuccess('Device unlocked successfully!');
        } else {
          notifyError(res.error || 'Invalid PIN');
          setPin('');
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      notifyWarning('Please provide both email and password');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const res = await login(email, password);
      if (res.success) {
        notifySuccess('Welcome back! Signed in to Supabase.');
      } else {
        notifyError(res.error || 'Login failed. Check your Supabase credentials or register an account.');
      }
    } else {
      const res = await registerOwner(email, password, ownerName);
      if (res.success) {
        notifySuccess(res.message || 'Owner account registered successfully!');
        if (res.needsEmailConfirmation) {
          setMode('login');
        }
      } else {
        notifyError(res.error || 'Registration failed');
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card panel-card" style={{ maxWidth: 420 }}>
        <div className="auth-logo">GS</div>
        <h2 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: 0.5 }}>
          GS WHOLESALE POS
        </h2>
        <p style={{ textAlign: 'center', margin: '0 0 16px', color: 'var(--muted)', fontSize: 13 }}>
          Direct Importers & Computer Products Wholesalers
        </p>

        {/* PIN LOGIN MODE */}
        {authMethod === 'pin' && hasPinConfigured ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Trusted POS Terminal</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                {trustedDevice.name || 'Owner'} ({trustedDevice.email})
              </div>
            </div>

            <form onSubmit={handlePinSubmit}>
              {/* PIN Display Bubbles */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid var(--primary)',
                      background: pin.length > i ? 'var(--primary)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Numeric Keypad for fast touchscreen / mouse entry */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 260, margin: '0 auto 16px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinKeyClick(String(num))}
                    style={{
                      padding: '14px 0',
                      fontSize: 18,
                      fontWeight: 700,
                      background: '#282828',
                      color: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  style={{
                    padding: '14px 0',
                    fontSize: 13,
                    fontWeight: 700,
                    background: '#202020',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKeyClick('0')}
                  style={{
                    padding: '14px 0',
                    fontSize: 18,
                    fontWeight: 700,
                    background: '#282828',
                    color: '#fff',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  style={{
                    padding: '14px 0',
                    fontSize: 15,
                    fontWeight: 700,
                    background: '#202020',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  ⌫
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                >
                  Sign in with Email & Password instead
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* PASSWORD / CREDENTIALS MODE */
          <div>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: '#242424', border: '1px solid var(--line)', marginBottom: 18, borderRadius: 4, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: mode === 'login' ? 'var(--primary)' : 'transparent',
                  color: mode === 'login' ? '#fff' : 'var(--muted)',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: mode === 'register' ? 'var(--primary)' : 'transparent',
                  color: mode === 'register' ? '#fff' : 'var(--muted)',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Create Owner Account
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              {mode === 'register' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Owner / Director Name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Owner Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. owner@gstechnologies.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Password</label>
                <input
                  type="password"
                  required
                  minLength="6"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="primary-button full-width"
                style={{ fontSize: 15, padding: '11px 0', fontWeight: 700 }}
              >
                {loading
                  ? (mode === 'login' ? 'Authenticating with Supabase...' : 'Creating Account...')
                  : (mode === 'login' ? 'Sign In as Owner' : 'Register & Connect to Supabase')}
              </button>

              {hasPinConfigured && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('pin')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                  >
                    ← Back to Quick 4-Digit PIN Unlock
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
          <span>Connected Project: <strong style={{ color: 'var(--primary)' }}>xxmdrrzoflakyzecmrmy</strong></span>
        </div>
      </div>
    </div>
  );
}
