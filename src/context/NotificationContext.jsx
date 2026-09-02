import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const notifySuccess = (msg) => addToast(msg, 'success');
  const notifyError = (msg) => addToast(msg, 'danger', 5000);
  const notifyWarning = (msg) => addToast(msg, 'warning');
  const notifyInfo = (msg) => addToast(msg, 'info');

  return (
    <NotificationContext.Provider value={{ addToast, notifySuccess, notifyError, notifyWarning, notifyInfo }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`card badge-${t.type}`}
            style={{
              padding: '12px 18px',
              minWidth: 260,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'modalIn 0.2s ease-out'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
