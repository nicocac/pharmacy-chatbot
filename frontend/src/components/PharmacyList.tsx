import React, { useState, useEffect } from 'react';
import { Pharmacy } from '../types';
import { chatbotAPI } from '../services/api';
import './PharmacyList.css';

interface PharmacyListProps {
  onSelectPharmacy: (phone: string) => void;
}

const PharmacyList: React.FC<PharmacyListProps> = ({ onSelectPharmacy }) => {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const response = await chatbotAPI.getAllPharmacies();
      
      if (response.success) {
        setPharmacies(response.pharmacies);
      } else {
        setError('Failed to load pharmacies');
      }
    } catch (err) {
      console.error('Error loading pharmacies:', err);
      setError('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pharmacy-list">
        <h3>Loading pharmacies...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pharmacy-list">
        <h3>Error loading pharmacies</h3>
        <button onClick={loadPharmacies}>Retry</button>
      </div>
    );
  }

  return (
    <div className="pharmacy-list">
      <h3>Test with Existing Pharmacies</h3>
      <p className="subtitle">Click on any pharmacy to simulate an inbound call</p>
      
      <div className="pharmacy-grid">
        {pharmacies.map((pharmacy) => (
          <div key={pharmacy.id} className="pharmacy-card">
            <div className="pharmacy-header">
              <h4>{pharmacy.name}</h4>
              <span className="rx-volume">{pharmacy.rxVolume.toLocaleString()} Rx/month</span>
            </div>
            
            <div className="pharmacy-details">
              <p><strong>Contact:</strong> {pharmacy.contactPerson || 'Pharmacy Manager'}</p>
              <p><strong>Phone:</strong> {pharmacy.phone}</p>
              <p><strong>Address:</strong> {pharmacy.address || `${pharmacy.city || 'Unknown'}, ${pharmacy.state || 'Unknown'}`}</p>
              <p><strong>Email:</strong> {pharmacy.email || 'Not provided'}</p>
            </div>
            
            <button 
              className="simulate-call-btn"
              onClick={() => onSelectPharmacy(pharmacy.phone)}
            >
              Simulate Call
            </button>
          </div>
        ))}
      </div>
      
      <div className="test-scenarios">
        <h4>Test Scenarios</h4>
        <div className="scenario-buttons">
          <button 
            className="scenario-btn new-lead"
            onClick={() => onSelectPharmacy('+1-555-NEW-LEAD')}
          >
            New Lead (Unknown Number)
          </button>
          <button 
            className="scenario-btn edge-case"
            onClick={() => onSelectPharmacy('+1-555-INVALID')}
          >
            API Error Scenario
          </button>
        </div>
      </div>
    </div>
  );
};

export default PharmacyList;