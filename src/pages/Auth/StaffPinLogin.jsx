import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function StaffPinLogin() {
  const { user, listUnlockStaff, unlockStaff, logout } = useAuth();
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    listUnlockStaff().then(result => {
      setBusy(false);
      if (!result.success) return setError(`${result.error}. Run database migration 010_staff_pin_access.sql.`);
      setStaff(result.staff);
      setSelectedId(result.staff[0]?.id || '');
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    const result = await unlockStaff(selectedId, pin);
    setBusy(false);
    if (!result.success) { setError(result.error); setPin(''); }
  };

  return <div className="auth-screen"><div className="auth-card panel-card staff-pin-card">
    <div className="auth-logo">GS</div>
    <h2>Staff PIN</h2>
    <p>Step 2 · Choose your account and unlock</p>
    <div className="staff-account-grid">
      {staff.map(row => <button key={row.id} type="button" className={selectedId === row.id ? 'selected' : ''} onClick={() => { setSelectedId(row.id); setPin(''); setError(''); }}>
        <span>{row.full_name.slice(0, 1).toUpperCase()}</span><strong>{row.full_name}</strong><small>{row.role === 'admin' ? 'Administrator' : 'View only'}</small>
      </button>)}
    </div>
    <form onSubmit={submit}>
      <label>4-digit PIN<input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus /></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button full-width" disabled={busy || !selectedId || pin.length !== 4}>{busy ? 'Checking…' : 'Unlock'}</button>
    </form>
    <button type="button" className="auth-link-button" onClick={logout}>Use a different email</button>
    <small className="authenticated-email">Email session: {user?.email}</small>
  </div></div>;
}
