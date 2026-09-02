import React, { useState, useRef } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getDefaultLogoDataUrl } from '../../lib/defaultLogo';

export default function CompanySettings() {
  const { companySettings, setCompanySettings, saveCompanySettings, resetAllData, resetTransactionsOnly } = useBusiness();
  const { user, trustedDevice, setupDevicePin, removeDevicePin } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [form, setForm] = useState(companySettings);
  const logoInputRef = useRef(null);

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyWarning('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      notifyWarning('Image file is too large. Please select an image under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setForm(prev => ({ ...prev, logo_url: dataUrl }));
      notifySuccess('Logo image loaded! Click "Save Settings" below to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logo_url: '' }));
    notifySuccess('Custom logo removed. Default Gatronix emblem will be used.');
  };

  // PIN settings state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);

  const hasPinSet = Boolean(trustedDevice?.isTrusted && trustedDevice?.pinHash);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (saveCompanySettings) {
      await saveCompanySettings(form);
    } else {
      setCompanySettings(form);
      notifySuccess('Company settings updated');
    }
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
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>🏢 Company Profile, Logo & Invoicing Details</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5 }}>
            Configure your store branding, official address, and logo for printed wholesale invoices and receipts.
          </p>
        </div>

        <form onSubmit={handleSaveCompany}>
          {/* Logo Upload & Preview Section */}
          <div style={{ background: '#242424', padding: 16, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
              Company Logo (Printed on Invoices & Quotations)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{
                width: 88,
                height: 88,
                borderRadius: 8,
                border: '2px dashed var(--line)',
                background: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: 4
              }}>
                <img
                  src={form.logo_url || getDefaultLogoDataUrl()}
                  alt="Company Logo"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4 }}>
                  {form.logo_url ? '✓ Custom Logo Uploaded' : 'Default Gatronix Emblem Active'}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
                  Select an image (PNG or JPG). Appears in the top-right corner of all wholesale bills.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="primary-button small-button"
                    style={{ fontWeight: 700 }}
                  >
                    📷 Upload Logo Image
                  </button>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="secondary-button small-button"
                      style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)' }}
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Business Name & Tagline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>Business / Shop Name * (Contains 'Wholesale')</label>
              <input
                type="text"
                required
                value={form.business_name || ''}
                onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="e.g. Gatronix Store - Wholesale"
              />
            </div>
            <div>
              <label>Tagline</label>
              <input
                type="text"
                value={form.tagline || ''}
                onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="e.g. Direct Importers & Wholesale Distribution"
              />
            </div>
          </div>

          {/* Address Line 1 & Line 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Address Line 1</label>
              <input
                type="text"
                value={form.address_line1 || ''}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  address_line1: e.target.value,
                  address: `${e.target.value}${prev.address_line2 ? `, ${prev.address_line2}` : ''}`
                }))}
                placeholder="e.g. 43/H1, Kandy Road"
              />
            </div>
            <div>
              <label>Address Line 2 (City / Postal Code)</label>
              <input
                type="text"
                value={form.address_line2 || ''}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  address_line2: e.target.value,
                  address: `${prev.address_line1 ? `${prev.address_line1}, ` : ''}${e.target.value}`
                }))}
                placeholder="e.g. 20260 Madawala Bazaar"
              />
            </div>
          </div>

          {/* Contact Details (Phone, Email, WhatsApp) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Phone / Landline</label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. 0766600466"
              />
            </div>
            <div>
              <label>Email Address</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. gatronix11@gmail.com"
              />
            </div>
            <div>
              <label>WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp || ''}
                onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="e.g. 0766600466"
              />
            </div>
          </div>

          {/* Invoice Document Formatting */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Invoice Title Format</label>
              <select
                value={form.doc_title || 'WHOLESALE INVOICE'}
                onChange={(e) => setForm(prev => ({ ...prev, doc_title: e.target.value }))}
              >
                <option value="WHOLESALE INVOICE">WHOLESALE INVOICE</option>
                <option value="SALES INVOICE">SALES INVOICE</option>
              </select>
            </div>
            <div>
              <label>Default Paper Size</label>
              <select
                value={form.default_invoice_paper_size || 'A4'}
                onChange={(e) => setForm(prev => ({ ...prev, default_invoice_paper_size: e.target.value }))}
              >
                <option value="A4">A4 Sheet</option>
                <option value="A5">A5 Sheet</option>
              </select>
            </div>
            <div>
              <label>Min Margin Protection (%)</label>
              <input
                type="number"
                step="0.1"
                className="mono"
                value={form.min_profit_pct || 5.0}
                onChange={(e) => setForm(prev => ({ ...prev, min_profit_pct: Number(e.target.value) || 5 }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Invoice Footer Bottom Note</label>
            <input
              type="text"
              value={form.footer_text || ''}
              onChange={(e) => setForm(prev => ({ ...prev, footer_text: e.target.value }))}
              placeholder="e.g. Created with Gatronix POS - www.gatronix.com"
            />
          </div>

          <button type="submit" className="primary-button" style={{ marginTop: 16 }}>
            Save Settings
          </button>
        </form>
      </div>

      {/* Data Management & System Reset */}
      <div className="panel-card" style={{ marginTop: 24, borderLeft: '4px solid #ef4444' }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#ff8e8e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️</span> Data Management & System Reset
          </h3>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5 }}>
            Manage and clear system records. You can delete test transactions or completely reset all master and transactional data back to a clean slate.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* Card 1: Clear Transactions Only */}
          <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#ffca58' }}>
              📄 Reset Transactions & Documents Only
            </h4>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
              Clears all sales invoices, reservations, transit shipments, purchase documents, and payment entries. <strong>Keeps your product catalog and customer list</strong>, but resets all stock on-hand to 0.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete all transactions and documents? Product stock will reset to 0, but your product and customer catalog will be kept.")) {
                  resetTransactionsOnly();
                }
              }}
              className="secondary-button small-button"
              style={{ color: '#ffca58', borderColor: 'rgba(255, 202, 88, 0.4)', fontWeight: 700 }}
            >
              Reset Transactions Only
            </button>
          </div>

          {/* Card 2: Wipe All Added Data (Clean Reset) */}
          <div style={{ background: '#242424', padding: 14, border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#ef4444' }}>
              🗑️ Delete All Added Data (Full System Wipe)
            </h4>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
              Permanently wipes all products, inventory balances, customers, suppliers, purchases, shipments, invoices, and payments. Resets the entire system back to a clean, empty state.
            </p>
            <button
              type="button"
              onClick={() => {
                const confirmed = window.prompt("WARNING: This will permanently delete ALL products, documents, customers, suppliers, and payments!\n\nType 'DELETE' in uppercase to confirm full system wipe:");
                if (confirmed === 'DELETE') {
                  resetAllData();
                } else if (confirmed !== null) {
                  notifyWarning("Reset cancelled: confirmation word did not match 'DELETE'.");
                }
              }}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Wipe All Added Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
