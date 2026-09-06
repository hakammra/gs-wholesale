import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeStaff, setActiveStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);

  const refreshStaffSession = useCallback(async () => {
    setStaffLoading(true);
    const { data, error } = await supabase.rpc('get_wholesale_security_state');
    if (error) {
      setActiveStaff(null);
      setStaffLoading(false);
      return { success: false, error: error.message };
    }
    setActiveStaff(data?.active_staff || null);
    setStaffLoading(false);
    return { success: true, staff: data?.active_staff || null };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user || null);
      setLoading(false);
      if (data.session?.user) await refreshStaffSession();
      else setStaffLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setActiveStaff(null);
      if (session?.user) setTimeout(refreshStaffSession, 0);
      else setStaffLoading(false);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [refreshStaffSession]);

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return { success: false, error: error.message };
    setUser(data.user);
    await refreshStaffSession();
    return { success: true };
  };

  const registerOwner = async (email, password, name = 'Wholesale Owner') => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    setLoading(false);
    if (error) return { success: false, error: error.message };
    if (data.session) {
      setUser(data.user);
      await refreshStaffSession();
    }
    return { success: true, needsEmailConfirmation: !data.session };
  };

  const listUnlockStaff = async () => {
    const { data, error } = await supabase.rpc('list_wholesale_staff_for_unlock');
    return error ? { success: false, error: error.message, staff: [] } : { success: true, staff: data || [] };
  };

  const unlockStaff = async (staffId, pin) => {
    const { data, error } = await supabase.rpc('unlock_wholesale_staff', { p_staff_id: staffId, p_pin: pin });
    if (error) return { success: false, error: error.message };
    setActiveStaff(data);
    return { success: true, staff: data };
  };

  const lockStaff = async () => {
    await supabase.rpc('lock_wholesale_staff');
    setActiveStaff(null);
  };

  const listStaff = async () => {
    const { data, error } = await supabase.rpc('admin_list_wholesale_staff');
    return error ? { success: false, error: error.message, staff: [] } : { success: true, staff: data || [] };
  };

  const saveStaff = async ({ id = null, full_name, role, pin, is_active = true }) => {
    const { data, error } = await supabase.rpc('admin_save_wholesale_staff', {
      p_staff_id: id, p_full_name: full_name, p_role: role,
      p_pin: pin || null, p_is_active: is_active
    });
    return error ? { success: false, error: error.message } : { success: true, staff: data };
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setActiveStaff(null);
  };

  return <AuthContext.Provider value={{
    user, activeStaff, isAdmin: activeStaff?.role === 'admin', isReadOnly: activeStaff?.role === 'viewer',
    loading, staffLoading, login, registerOwner, logout,
    refreshStaffSession, listUnlockStaff, unlockStaff, lockStaff, listStaff, saveStaff
  }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
