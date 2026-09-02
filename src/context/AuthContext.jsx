import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

const safeGet = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null') return fallback;
    return JSON.parse(saved);
  } catch (e) {
    return fallback;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeGet('gs_wholesale_user', {
    id: 'owner-wholesale-1',
    email: 'owner@gs-wholesale.lk',
    role: 'owner',
    name: 'Wholesale Owner'
  }));
  const [loading, setLoading] = useState(false);

  // Trusted device state
  const [trustedDevice, setTrustedDevice] = useState(() => safeGet('gs_trusted_device_info', { isTrusted: false, email: '', pinHash: '' }));

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
