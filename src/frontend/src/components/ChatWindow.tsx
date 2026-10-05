import React, { useState, useEffect, useRef } from 'react';
import type { Utilisateur, Message } from '../types';
import './ChatWindow.css';

interface ChatWindowProps {
  currentUser: Utilisateur;
  token: string;
  onLogout: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, token, onLogout }) => {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Défilement automatique vers le dernier message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Récupération de tous les utilisateurs
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
          const data: Utilisateur[] = await response.json();
          // Exclure l'utilisateur courant de la liste
          const otherUsers = data.filter(
            (u) => Number(u.user_id) !== Number(currentUser.user_id)
          );
          setUsers(otherUsers);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
      }
    };

    if (currentUser?.user_id && token) {
      fetchUsers();
    }
  }, [currentUser, token, onLogout]);

  // 2. Récupération de l'historique de conversation
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
        console.error('Erreur lors de la récupération des messages:', error);
      }
    };

    fetchMessages();
  }, [selectedUser, token, onLogout]);

  // 3. Connexion WebSocket unique (Gestion présence + Messages temps réel)
  useEffect(() => {
    if (!currentUser?.user_id) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${currentUser.user_id}`);

    ws.onopen = () => {
      console.log('WebSocket connecté');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // A. Mise à jour de la liste des utilisateurs en ligne
        if (data.type === 'online_users' && Array.isArray(data.users)) {
          setOnlineUsers(new Set(data.users.map((id: number | string) => Number(id))));
        } else if (data.type === 'user_status') {
          const userId = Number(data.user_id);
          setOnlineUsers((prev) => {
            const updated = new Set(prev);
            if (data.online) {
              updated.add(userId);
            } else {
              updated.delete(userId);
            }
            return updated;
          });
        }
        // B. Réception d'un nouveau message
        else if (data.type === 'chat_message' || data.message_id) {
          const receivedMsg: Message = data.message || data;

          setMessages((prevMessages) => {
            // Remplace un message temporaire (même ID ou même contenu récent) ou évite les doublons
            const exists = prevMessages.some(
              (m) =>
                m.message_id === receivedMsg.message_id ||
                (m.message_id > 1000000000000 &&
                  m.expediteur_id === receivedMsg.expediteur_id &&
                  m.message_contenu === receivedMsg.message_contenu)
            );

            if (exists) {
              return prevMessages.map((m) =>
                m.message_id > 1000000000000 &&
                m.expediteur_id === receivedMsg.expediteur_id &&
                m.message_contenu === receivedMsg.message_contenu
                  ? receivedMsg
                  : m
              );
            }

            // Affiche le message si la discussion avec cet utilisateur est active
            if (
              selectedUser &&
              (Number(receivedMsg.expediteur_id) === Number(selectedUser.user_id) ||
                Number(receivedMsg.destinataire_id) === Number(selectedUser.user_id))
            ) {
              return [...prevMessages, receivedMsg];
            }

            return prevMessages;
          });
        }
      } catch (e) {
        console.error('Erreur parsing message WebSocket:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };

    socketRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      }
    };
  }, [currentUser?.user_id, selectedUser]);

  // 4. Envoi de message avec affichage immédiat côté expéditeur
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const content = newMessage.trim();

    // ID temporaire unique
    const tempId = Date.now();
    const tempMessage: Message = {
      message_id: tempId,
      expediteur_id: currentUser.user_id,
      destinataire_id: selectedUser.user_id,
      message_contenu: content,
      date_envoi: new Date().toISOString(),
    };

    // 1. Mise à jour immédiate de l'interface locale
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    // 2. Envoi via WebSocket
    const payload = {
      destinataire_id: selectedUser.user_id,
      message_contenu: content,
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.error("Le WebSocket n'est pas ouvert. Impossible d'envoyer le message.");
    }
  };

  return (
    <div className="chat-container">
      {/* Barre latérale */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>
            {currentUser.prenom_user} {currentUser.nom_user}
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
                    {u.prenom_user} {u.nom_user}
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

      {/* Zone de chat principale */}
      <div className="chat-main">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>
                {selectedUser.prenom_user} {selectedUser.nom_user}
              </h3>
              <div className="status-container">
                <span
                  className={`status-indicator ${
                    onlineUsers.has(Number(selectedUser.user_id)) ? 'online' : ''
                  }`}
                />
                <span
                  className={`status-text ${
                    onlineUsers.has(Number(selectedUser.user_id)) ? 'online' : ''
                  }`}
                >
                  {onlineUsers.has(Number(selectedUser.user_id)) ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
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