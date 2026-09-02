import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/context/AuthContext.jsx
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
        } else {
          // If no active supabase session and no saved user, ensure user is null
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
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('gs_wholesale_user');
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

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
        // If session created immediately (auto-confirm enabled)
        if (data.session) {
          setUser(u);
          localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
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
    <AuthContext.Provider value={{ user, loading, login, registerOwner, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
""")

# src/pages/Auth/Login.jsx
write_file('src/pages/Auth/Login.jsx', """
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function Login() {
  const { login, registerOwner } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('Business Owner');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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

        <form onSubmit={handleSubmit}>
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
        </form>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
          <span>Connected Project: <strong style={{ color: 'var(--primary)' }}>xxmdrrzoflakyzecmrmy</strong></span>
        </div>
      </div>
    </div>
  );
}
""")

print("AuthContext.jsx and Login.jsx updated.")
