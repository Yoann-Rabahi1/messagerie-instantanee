import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import API from '../services/api';
import type { UtilisateurLogin, TokenResponse } from '../types';
import type { AxiosError } from 'axios';

interface LoginProps {
  onLogin: (token: string) => void;
  onSwitchToSignup: () => void;
}

export default function Login({ onLogin, onSwitchToSignup }: LoginProps) {
  const [formData, setFormData] = useState<UtilisateurLogin>({
    mail_user: '',
    mdp_user: '',
  });

  const [error, setError] = useState<string>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const response = await API.post<TokenResponse>('/login', formData);
      onLogin(response.data.access_token);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail: string }>;
      setError(axiosError.response?.data?.detail || 'Identifiants incorrects');
    }
  };

  return (
    <div style={styles.card}>
      <h2>Connexion</h2>
      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          name="mail_user"
          placeholder="Adresse e-mail"
          value={formData.mail_user}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="password"
          name="mdp_user"
          placeholder="Mot de passe"
          value={formData.mdp_user}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Se connecter
        </button>
      </form>

      <p style={styles.footerText}>
        Pas encore de compte ?{' '}
        <span onClick={onSwitchToSignup} style={styles.link}>
          Créer un compte
        </span>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px', fontSize: '16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { color: 'red', fontSize: '14px' },
  footerText: { marginTop: '15px', textAlign: 'center', fontSize: '14px' },
  link: { color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }
};