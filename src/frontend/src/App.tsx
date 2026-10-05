import { useState, useEffect } from 'react';
import API from './services/api';
import Login from './components/Login';
import Signup from './components/Signup';
import ChatWindow from './components/ChatWindow';
import type { Utilisateur } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      API.get<Utilisateur>('/me')
        .then((res) => setCurrentUser(res.data))
        .catch(() => handleLogout());
    }
  }, [token]);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  if (!token && isSigningUp) {
    return <Signup onSwitchToLogin={() => setIsSigningUp(false)} />;
  }

  if (!token) {
    return <Login onLogin={handleLogin} onSwitchToSignup={() => setIsSigningUp(true)} />;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Messagerie Instantanée</h2>
        <div>
          <span style={{ marginRight: '15px' }}>
            Connecté : <strong>{currentUser?.prenom_user} {currentUser?.nom_user}</strong>
          </span>
          <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      {currentUser && <ChatWindow currentUser={currentUser} />}
    </div>
  );
}