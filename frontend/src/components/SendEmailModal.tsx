import React, { useState } from 'react';
import Modal from './Modal';
import './SendEmailModal.css';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pharmacyEmail?: string | null;
  isLoading?: boolean;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pharmacyEmail,
  isLoading = false
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Follow-up Email"
      maxWidth="500px"
    >
      <div className="email-modal-content">
        <div className="email-info">
          <p className="email-description">
            A follow-up email will be sent with information about Pharmesol's services 
            and how we can help optimize your pharmacy operations.
          </p>
          
          {pharmacyEmail ? (
            <div className="email-recipient">
              <strong>Recipient:</strong> {pharmacyEmail}
            </div>
          ) : (
            <div className="email-warning">
              <span className="warning-icon">⚠️</span>
              <span>Email will be sent to the address provided during this conversation.</span>
            </div>
          )}
        </div>

        <div className="email-content-preview">
          <h4>Email will include:</h4>
          <ul>
            <li>Pharmesol service overview</li>
            <li>Benefits for high-volume pharmacies</li>
            <li>Contact information for next steps</li>
            <li>Relevant resources and case studies</li>
          </ul>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SendEmailModal;