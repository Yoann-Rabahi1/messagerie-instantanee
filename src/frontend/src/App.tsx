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
  const [loading, setLoading] = useState<boolean>(!!token);

  useEffect(() => {
    if (token) {
      setLoading(true);
      API.get<Utilisateur>('/me')
        .then((res) => {
          setCurrentUser(res.data);
        })
        .catch(() => handleLogout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
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

  if (loading || !currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Chargement de la session...</p>
      </div>
    );
  }

  return (
    <ChatWindow
      currentUser={currentUser}
      token={token}
      onLogout={handleLogout}
    />
  );
}