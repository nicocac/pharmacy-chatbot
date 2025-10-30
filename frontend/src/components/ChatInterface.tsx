import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Pharmacy, ApiResponse } from '../types';
import { chatbotAPI } from '../services/api';
import ScheduleCallbackModal from './ScheduleCallbackModal';
import SendEmailModal from './SendEmailModal';
import './ChatInterface.css';

interface ChatInterfaceProps {
  phoneNumber: string;
  onPhoneNumberChange: (phone: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ phoneNumber, onPhoneNumberChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [isNewLead, setIsNewLead] = useState(false);
  const [collectingInfo, setCollectingInfo] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startChat = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await chatbotAPI.startChat(phoneNumber);
      
      if (response.success) {
        setMessages([{
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        }]);
        setPharmacy(response.pharmacy || null);
        setIsNewLead(response.isNewLead || false);
        setCollectingInfo(response.isNewLead || false);
        setChatStarted(true);
        // Focus input after starting chat
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        alert(response.message);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage(phoneNumber, inputMessage);
      
      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (response.pharmacy) {
          setPharmacy(response.pharmacy);
        }
        if (response.collectingInfo !== undefined) {
          setCollectingInfo(response.collectingInfo);
        }
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Focus input after receiving response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleScheduleCallback = () => {
    setShowCallbackModal(true);
  };

  const handleCallbackSubmit = async (preferredTime: string, notes?: string) => {
    setIsLoading(true);
    try {
      const response = await chatbotAPI.scheduleCallback(phoneNumber, preferredTime, notes);
      
      const message: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error scheduling callback:', error);
      alert('Failed to schedule callback. Please try again.');
    } finally {
      setIsLoading(false);
      // Focus input after callback action
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSendEmail = () => {
    if (!pharmacy?.email && !collectingInfo) {
      alert('Email address not available. Please provide an email address first.');
      return;
    }
    setShowEmailModal(true);
  };

  const handleEmailConfirm = async () => {
    setIsLoading(true);
    try {
      const response = await chatbotAPI.sendFollowUpEmail(phoneNumber);
      
      const message: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
      // Focus input after email action
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setPharmacy(null);
    setIsNewLead(false);
    setCollectingInfo(false);
    setChatStarted(false);
    setInputMessage('');
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Pharmesol Inbound Sales Chatbot</h2>
        <div className="phone-input-section">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            placeholder="Enter caller's phone number"
            disabled={chatStarted}
            className="phone-input"
          />
          {!chatStarted ? (
            <button onClick={startChat} disabled={isLoading || !phoneNumber.trim()}>
              {isLoading ? 'Starting...' : 'Start Call'}
            </button>
          ) : (
            <button onClick={resetChat} className="reset-btn">
              New Call
            </button>
          )}
        </div>
      </div>

      {pharmacy && (
        <div className="pharmacy-info">
          <h3>Pharmacy Information</h3>
          <div className="pharmacy-details">
            <p><strong>Name:</strong> {pharmacy.name}</p>
            <p><strong>Contact:</strong> {pharmacy.contactPerson || 'Pharmacy Manager'}</p>
            <p><strong>Address:</strong> {pharmacy.address || `${pharmacy.city || 'Unknown'}, ${pharmacy.state || 'Unknown'}`}</p>
            <p><strong>Monthly Rx Volume:</strong> {pharmacy.rxVolume.toLocaleString()}</p>
            <p><strong>Email:</strong> {pharmacy.email || 'Not provided'}</p>
          </div>
        </div>
      )}

      {isNewLead && (
        <div className="new-lead-indicator">
          <span className="indicator-badge">New Lead</span>
          {collectingInfo && <span className="collecting-info">Collecting Information...</span>}
        </div>
      )}

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-timestamp">
              {message.timestamp?.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {chatStarted && (
        <>
          <div className="input-section">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={2}
            />
            <button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
              Send
            </button>
          </div>

          <div className="action-buttons">
            <button onClick={handleScheduleCallback} disabled={isLoading}>
              Schedule Callback
            </button>
            <button onClick={handleSendEmail} disabled={isLoading}>
              Send Follow-up Email
            </button>
          </div>
        </>
      )}

      <ScheduleCallbackModal
        isOpen={showCallbackModal}
        onClose={() => setShowCallbackModal(false)}
        onSubmit={handleCallbackSubmit}
        isLoading={isLoading}
      />

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onConfirm={handleEmailConfirm}
        pharmacyEmail={pharmacy?.email}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatInterface;