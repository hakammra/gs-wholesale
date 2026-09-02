import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Confirm', confirmType = 'danger' }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`btn btn-${confirmType}`}>{confirmText}</button>
        </>
      }
    >
      <p style={{ color: 'var(--text)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}
