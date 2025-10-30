import React, { useState } from 'react';
import Modal from './Modal';
import './ScheduleCallbackModal.css';

interface ScheduleCallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preferredTime: string, notes?: string) => void;
  isLoading?: boolean;
}

const ScheduleCallbackModal: React.FC<ScheduleCallbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ preferredTime?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { preferredTime?: string } = {};
    
    if (!preferredTime.trim()) {
      newErrors.preferredTime = 'Preferred time is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(preferredTime, notes.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setPreferredTime('');
    setNotes('');
    setErrors({});
    onClose();
  };

  const suggestedTimes = [
    'Tomorrow morning (9 AM - 12 PM)',
    'Tomorrow afternoon (1 PM - 5 PM)',
    'This week morning (9 AM - 12 PM)', 
    'This week afternoon (1 PM - 5 PM)',
    'Next week morning (9 AM - 12 PM)',
    'Next week afternoon (1 PM - 5 PM)'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule Callback"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="callback-form">
        <div className="form-section">
          <label htmlFor="preferredTime" className="form-label">
            Preferred Time <span className="required">*</span>
          </label>
          <textarea
            id="preferredTime"
            value={preferredTime}
            onChange={(e) => {
              setPreferredTime(e.target.value);
              if (errors.preferredTime) {
                setErrors({ ...errors, preferredTime: undefined });
              }
            }}
            placeholder="e.g., Tomorrow at 2 PM, Friday morning, Next week Tuesday afternoon"
            className={`form-input ${errors.preferredTime ? 'error' : ''}`}
            rows={3}
            disabled={isLoading}
          />
          {errors.preferredTime && (
            <span className="error-message">{errors.preferredTime}</span>
          )}
        </div>

        <div className="suggested-times">
          <p className="suggested-times-label">Quick suggestions:</p>
          <div className="suggested-times-grid">
            {suggestedTimes.map((time, index) => (
              <button
                key={index}
                type="button"
                className="suggested-time-button"
                onClick={() => setPreferredTime(time)}
                disabled={isLoading}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="notes" className="form-label">
            Additional Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific topics to discuss or additional information..."
            className="form-input"
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !preferredTime.trim()}
          >
            {isLoading ? 'Scheduling...' : 'Schedule Callback'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleCallbackModal;