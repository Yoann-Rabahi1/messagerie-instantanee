import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

export interface User {
  user_id: number;
  prenom: string;
  nom: string;
  email: string;
}

export interface Message {
  message_id: number;
  expediteur_id: number;
  destinataire_id: number;
  message_contenu: string;
  date_envoi: string;
}

interface ChatWindowProps {
  currentUser: User;
  token: string;
  onLogout: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, token, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Récupération des utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/utilisateurs', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          onLogout();
          return;
        }

        if (response.ok) {
          const data: User[] = await response.json();
          const otherUsers = data.filter(
            (u) => Number(u.user_id) !== Number(currentUser.user_id)
          );
          setUsers(otherUsers);
        }
      } catch (error) {
        console.error('Erreur utilisateurs:', error);
      }
    };

    if (currentUser?.user_id && token) {
      fetchUsers();
    }
  }, [currentUser, token, onLogout]);

  // 2. Récupération des messages
  useEffect(() => {
    if (!selectedUser || !token) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:8000/messages/${selectedUser.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          onLogout();
          return;
        }

        if (response.ok) {
          const data: Message[] = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Erreur messages:', error);
      }
    };

    fetchMessages();
  }, [selectedUser, token, onLogout]);

  // 3. WebSocket
  useEffect(() => {
    if (!currentUser?.user_id) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${currentUser.user_id}`);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'user_status') {
          setOnlineUsers((prev) => {
            const updated = new Set(prev);
            if (data.online) {
              updated.add(Number(data.user_id));
            } else {
              updated.delete(Number(data.user_id));
            }
            return updated;
          });
        } else if (data.type === 'chat_message' || data.message_id) {
          const receivedMsg: Message = data;
          setMessages((prev) => {
            const exists = prev.some((m) => m.message_id === receivedMsg.message_id);
            if (exists) return prev;

            if (
              selectedUser &&
              (Number(receivedMsg.expediteur_id) === Number(selectedUser.user_id) ||
                Number(receivedMsg.destinataire_id) === Number(selectedUser.user_id))
            ) {
              return [...prev, receivedMsg];
            }
            return prev;
          });
        }
      } catch (e) {
        console.error('Erreur parsing WebSocket:', e);
      }
    };

    socketRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      }
    };
  }, [currentUser?.user_id, selectedUser?.user_id]);

  // 4. Envoi de message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const payload = {
      destinataire_id: selectedUser.user_id,
      message_contenu: newMessage.trim(),
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      setNewMessage('');
    }
  };

  return (
    <div className="chat-container">
      {/* Barre latérale */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>
            {currentUser.prenom} {currentUser.nom}
          </h3>
          <button onClick={onLogout} className="btn-logout">
            Déconnexion
          </button>
        </div>

        <div className="user-list-container">
          <h4 className="user-list-title">Discussions ({users.length})</h4>
          {users.length === 0 ? (
            <p className="no-users">Aucun autre utilisateur trouvé.</p>
          ) : (
            users.map((u) => {
              const isSelected = selectedUser?.user_id === u.user_id;
              const isOnline = onlineUsers.has(Number(u.user_id));

              return (
                <div
                  key={u.user_id}
                  onClick={() => setSelectedUser(u)}
                  className={`user-item ${isSelected ? 'selected' : ''}`}
                >
                  <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                    {u.prenom} {u.nom}
                  </span>

                  <div className="status-container">
                    <span className={`status-indicator ${isOnline ? 'online' : ''}`} />
                    <span className={`status-text ${isOnline ? 'online' : ''}`}>
                      {isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zone principale */}
      <div className="chat-main">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>
                {selectedUser.prenom} {selectedUser.nom}
              </h3>
              <span
                className={`status-indicator ${
                  onlineUsers.has(Number(selectedUser.user_id)) ? 'online' : ''
                }`}
              />
            </div>

            <div className="chat-messages">
              {messages.map((msg) => {
                const isMe = Number(msg.expediteur_id) === Number(currentUser.user_id);
                return (
                  <div
                    key={msg.message_id}
                    className={`message-wrapper ${isMe ? 'me' : 'other'}`}
                  >
                    <div className="message-bubble">
                      <p className="message-text">{msg.message_contenu}</p>
                      <span className="message-time">
                        {new Date(msg.date_envoi).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-form">
              <input
                type="text"
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="chat-input"
              />
              <button type="submit" className="btn-send">
                Envoyer
              </button>
            </form>
          </>
        ) : (
          <div className="placeholder-container">
            <h3>Sélectionnez un contact pour démarrer une discussion</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;