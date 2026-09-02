import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'primary', subtext }) {
  const bgMap = {
    primary: 'var(--primary-subtle)',
    success: 'var(--success-subtle)',
    warning: 'var(--warning-subtle)',
    danger: 'var(--danger-subtle)',
    purple: 'var(--purple-subtle)'
  };
  const colorMap = {
    primary: '#38bdf8',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    purple: '#a78bfa'
  };

  return (
    <div className="stat-card">
      {Icon && (
        <div className="stat-icon" style={{ background: bgMap[color] || bgMap.primary, color: colorMap[color] || colorMap.primary }}>
          <Icon size={24} />
        </div>
      )}
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{subtext}</div>}
      </div>
    </div>
  );
}
