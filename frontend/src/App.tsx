import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import PharmacyList from './components/PharmacyList';
import './App.css';

function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');

  const handleSelectPharmacy = (phone: string) => {
    setPhoneNumber(phone);
    setCurrentView('chat');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setPhoneNumber('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pharmesol Sales Chatbot Demo</h1>
        <nav>
          <button 
            className={currentView === 'list' ? 'active' : ''}
            onClick={() => setCurrentView('list')}
          >
            Pharmacy Directory
          </button>
          <button 
            className={currentView === 'chat' ? 'active' : ''}
            onClick={() => setCurrentView('chat')}
          >
            Chat Interface
          </button>
        </nav>
      </header>

      <main className="App-main">
        {currentView === 'list' ? (
          <PharmacyList onSelectPharmacy={handleSelectPharmacy} />
        ) : (
          <div>
            <div className="back-button-container">
              <button onClick={handleBackToList} className="back-button">
                ← Back to Pharmacy List
              </button>
            </div>
            <ChatInterface 
              phoneNumber={phoneNumber} 
              onPhoneNumberChange={setPhoneNumber}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
