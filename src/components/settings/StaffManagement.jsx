import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const EMPTY = { id: null, full_name: '', role: 'viewer', pin: '', is_active: true };

export default function StaffManagement() {
  const { activeStaff, isAdmin, listStaff, saveStaff } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!isAdmin) return;
    const result = await listStaff();
    if (result.success) setRows(result.staff); else notifyError(result.error);
  };
  useEffect(() => { load(); }, [isAdmin]);

  const submit = async event => {
    event.preventDefault(); setBusy(true);
    const result = await saveStaff(form); setBusy(false);
    if (!result.success) return notifyError(result.error);
    notifySuccess(form.id ? 'Staff account updated.' : 'Staff account created.');
    setForm(null); load();
  };

  if (!isAdmin) return <div className="panel-card staff-management"><h3>Staff & PIN access</h3><p>Only an administrator can manage staff accounts. Your account can view every page without making changes.</p></div>;

  return <div className="panel-card staff-management">
    <div className="staff-management-heading"><div><h3>Staff & PIN access</h3><p>Email login is followed by one of these staff PINs.</p></div><button className="primary-button" onClick={() => setForm({ ...EMPTY })}>+ Add Staff</button></div>
    {form && <form className="staff-editor-grid" onSubmit={submit}>
      <label>Name<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
      <label>Access<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="viewer">View only · all pages</option><option value="admin">Admin · full control</option></select></label>
      <label>{form.id ? 'New PIN (optional)' : '4-digit PIN'}<input type="password" inputMode="numeric" pattern="[0-9]{4}" required={!form.id} maxLength="4" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
      <label className="staff-active-field"><input type="checkbox" disabled={form.id === activeStaff?.id} checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
      <div className="staff-editor-actions"><button type="button" className="secondary-button" onClick={() => setForm(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save Account'}</button></div>
    </form>}
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Access</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.full_name}</strong>{row.id === activeStaff?.id && <small className="current-staff-label">Current</small>}</td><td>{row.role === 'admin' ? 'Administrator' : 'View only'}</td><td>{row.is_active ? 'Active' : 'Inactive'}</td><td><button className="secondary-button small-button" onClick={() => setForm({ ...row, pin: '' })}>Edit</button></td></tr>)}</tbody></table></div>
  </div>;
}
