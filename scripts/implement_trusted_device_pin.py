import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# 1. src/context/AuthContext.jsx
write_file('src/context/AuthContext.jsx', """
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Trusted device state
  const [trustedDevice, setTrustedDevice] = useState(() => {
    const saved = localStorage.getItem('gs_trusted_device_info');
    return saved ? JSON.parse(saved) : { isTrusted: false, email: '', pinHash: '' };
  });

  useEffect(() => {
    // Check active Supabase session
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = {
            id: session.user.id,
            email: session.user.email,
            role: 'owner',
            name: session.user.user_metadata?.name || 'Wholesale Owner'
          };
          setUser(u);
          localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
          
          // Mark device as recognized
          markDeviceAsTrusted(u.email);
        } else {
          const saved = localStorage.getItem('gs_wholesale_user');
          if (!saved) setUser(null);
        }
      } catch (err) {
        console.warn('Session check error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email,
          role: 'owner',
          name: session.user.user_metadata?.name || 'Wholesale Owner'
        };
        setUser(u);
        localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
        markDeviceAsTrusted(u.email);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('gs_wholesale_user');
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const markDeviceAsTrusted = (email) => {
    setTrustedDevice(prev => {
      const updated = { ...prev, isTrusted: true, email: email || prev.email };
      localStorage.setItem('gs_trusted_device_info', JSON.stringify(updated));
      return updated;
    });
  };

  // Simple, deterministic hash for 4-digit device PIN
  const hashPin = (pin, email) => {
    let hash = 0;
    const str = `${email || 'owner'}_PIN_${pin}_GS_SALT_9823`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  };

  const setupDevicePin = (pin) => {
    if (!pin || !/^[0-9]{4}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 4 digits (0-9)' };
    }
    if (!user?.email) {
      return { success: false, error: 'You must be logged in as owner to set a PIN' };
    }

    const hashed = hashPin(pin, user.email);
    const info = {
      isTrusted: true,
      email: user.email,
      name: user.name || 'Wholesale Owner',
      pinHash: hashed,
      updatedAt: new Date().toISOString()
    };

    setTrustedDevice(info);
    localStorage.setItem('gs_trusted_device_info', JSON.stringify(info));
    return { success: true };
  };

  const removeDevicePin = () => {
    setTrustedDevice(prev => {
      const info = { ...prev, pinHash: '' };
      localStorage.setItem('gs_trusted_device_info', JSON.stringify(info));
      return info;
    });
    return { success: true };
  };

  const loginWithPin = (pin) => {
    if (!pin || !/^[0-9]{4}$/.test(pin)) {
      return { success: false, error: 'Please enter a valid 4-digit PIN' };
    }
    if (!trustedDevice.isTrusted || !trustedDevice.pinHash) {
      return { success: false, error: 'Quick PIN is not configured on this device. Sign in with password first.' };
    }

    const testHash = hashPin(pin, trustedDevice.email);
    if (testHash === trustedDevice.pinHash) {
      const restoredUser = {
        email: trustedDevice.email,
        role: 'owner',
        name: trustedDevice.name || 'Wholesale Owner',
        isPinUnlocked: true
      };
      setUser(restoredUser);
      localStorage.setItem('gs_wholesale_user', JSON.stringify(restoredUser));
      return { success: true };
    } else {
      return { success: false, error: 'Incorrect 4-digit PIN' };
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }
      if (data?.user) {
        const u = {
          id: data.user.id,
          email: data.user.email,
          role: 'owner',
          name: data.user.user_metadata?.name || 'Wholesale Owner'
        };
        setUser(u);
        localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
        markDeviceAsTrusted(u.email);
        setLoading(false);
        return { success: true };
      }
      setLoading(false);
      return { success: false, error: 'Failed to retrieve user session' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const registerOwner = async (email, password, name = 'Wholesale Owner') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'owner' }
        }
      });
      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }
      if (data?.user) {
        const u = {
          id: data.user.id,
          email: data.user.email,
          role: 'owner',
          name
        };
        if (data.session) {
          setUser(u);
          localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
          markDeviceAsTrusted(u.email);
        }
        setLoading(false);
        return {
          success: true,
          needsEmailConfirmation: !data.session,
          message: data.session ? 'Owner account registered successfully!' : 'Account created! Please check your email to confirm if email confirmations are enabled.'
        };
      }
      setLoading(false);
      return { success: false, error: 'Registration failed' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem('gs_wholesale_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, registerOwner, logout,
      trustedDevice, setupDevicePin, removeDevicePin, loginWithPin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
""")

# 2. src/pages/Auth/Login.jsx
write_file('src/pages/Auth/Login.jsx', """
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
""")

# 3. src/pages/Settings/CompanySettings.jsx
write_file('src/pages/Settings/CompanySettings.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function CompanySettings() {
  const { companySettings, setCompanySettings, currencies, setCurrencies } = useBusiness();
  const { user, trustedDevice, setupDevicePin, removeDevicePin } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [form, setForm] = useState(companySettings);
  const [currList, setCurrList] = useState(currencies);

  // PIN settings state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);

  const hasPinSet = Boolean(trustedDevice?.isTrusted && trustedDevice?.pinHash);

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setCompanySettings(form);
    notifySuccess('Company settings updated');
  };

  const handleSaveRates = () => {
    setCurrencies(currList);
    notifySuccess('Exchange rates saved');
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (!pin || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
      notifyWarning('PIN must be exactly 4 numeric digits (0-9)');
      return;
    }
    if (pin !== confirmPin) {
      notifyError('PIN and Confirmation PIN do not match');
      return;
    }

    const res = setupDevicePin(pin);
    if (res.success) {
      notifySuccess('4-Digit Quick PIN saved for this trusted device!');
      setPin('');
      setConfirmPin('');
      setIsEditingPin(false);
    } else {
      notifyError(res.error || 'Failed to set PIN');
    }
  };

  const handleRemovePin = () => {
    removeDevicePin();
    notifySuccess('Quick PIN removed for this device');
    setIsEditingPin(false);
  };

  return (
    <div className="page-section" style={{ padding: 18, maxWidth: 900 }}>
      {/* Trusted Device Quick PIN Card */}
      <div className="panel-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>🔐 Trusted Device & 4-Digit Quick PIN Access</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5 }}>
              Enable instant 4-digit PIN unlock for this authorized device without re-entering email & password every time.
            </p>
          </div>
          <span className={`badge badge-${hasPinSet ? 'success' : 'neutral'}`}>
            {hasPinSet ? 'PIN ACTIVE' : 'NO PIN SET'}
          </span>
        </div>

        <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', marginBottom: 14, borderRadius: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <small style={{ color: 'var(--muted)' }}>Device Status</small>
              <div style={{ fontWeight: 700, color: '#52e37e' }}>✓ Trusted POS Terminal</div>
            </div>
            <div>
              <small style={{ color: 'var(--muted)' }}>Authenticated Owner</small>
              <div style={{ fontWeight: 700 }}>{user?.email || trustedDevice?.email || 'Owner'}</div>
            </div>
            <div>
              <small style={{ color: 'var(--muted)' }}>Quick Access Method</small>
              <div style={{ fontWeight: 700, color: hasPinSet ? 'var(--primary)' : 'var(--muted)' }}>
                {hasPinSet ? '4-Digit PIN Enabled' : 'Password Only'}
              </div>
            </div>
          </div>
        </div>

        {hasPinSet && !isEditingPin ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIsEditingPin(true)}
              className="primary-button small-button"
            >
              Change 4-Digit PIN
            </button>
            <button
              onClick={handleRemovePin}
              className="secondary-button small-button"
              style={{ color: '#ff8e8e' }}
            >
              Disable Quick PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSavePin}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label>4-Digit PIN *</label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  className="mono"
                  style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
              </div>
              <div>
                <label>Confirm PIN *</label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  className="mono"
                  style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="primary-button" style={{ height: 38 }}>
                  Save Quick PIN
                </button>
                {isEditingPin && (
                  <button type="button" onClick={() => setIsEditingPin(false)} className="secondary-button" style={{ height: 38 }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Company Profile & Invoicing Details */}
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <h3>Company Profile & Invoicing Details</h3>
        <form onSubmit={handleSaveCompany}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>Business Name *</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
              />
            </div>
            <div>
              <label>Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label>WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <label>Tax / VAT No</label>
              <input
                type="text"
                value={form.tax_number}
                onChange={(e) => setForm(prev => ({ ...prev, tax_number: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Minimum Profit Protection Margin (%)</label>
              <input
                type="number"
                step="0.1"
                className="mono"
                value={form.min_profit_pct}
                onChange={(e) => setForm(prev => ({ ...prev, min_profit_pct: Number(e.target.value) || 5 }))}
              />
            </div>
            <div>
              <label>Default Invoice Paper Size</label>
              <select
                value={form.default_invoice_paper_size}
                onChange={(e) => setForm(prev => ({ ...prev, default_invoice_paper_size: e.target.value }))}
              >
                <option value="A4">A4 Sheet</option>
                <option value="A5">A5 Sheet</option>
              </select>
            </div>
          </div>

          <button type="submit" className="primary-button" style={{ marginTop: 16 }}>
            Save Settings
          </button>
        </form>
      </div>

      {/* Currency Exchange Rates */}
      <div className="panel-card">
        <h3>Foreign Currency Rates (to LKR)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          {currList.map(c => (
            <div key={c.code} style={{ background: '#242424', padding: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>{c.code} ({c.symbol})</strong>
                {c.is_base && <span className="badge badge-success">Base</span>}
              </div>
              <input
                type="number"
                step="0.01"
                disabled={c.is_base}
                className="mono font-semibold"
                value={c.exchange_rate_to_lkr}
                onChange={(e) => setCurrList(prev => prev.map(x => x.code === c.code ? { ...x, exchange_rate_to_lkr: Number(e.target.value) || 1 } : x))}
              />
            </div>
          ))}
        </div>

        <button onClick={handleSaveRates} className="primary-button">
          Update Currency Rates
        </button>
      </div>
    </div>
  );
}
""")

print("Trusted device and 4-digit PIN system updated successfully.")
