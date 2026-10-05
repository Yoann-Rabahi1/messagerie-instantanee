import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import API from '../services/api';
import type { UtilisateurCreate } from '../types';
import type { AxiosError } from 'axios';

interface SignupProps {
  onSwitchToLogin: () => void;
}

export default function Signup({ onSwitchToLogin }: SignupProps) {
  const [formData, setFormData] = useState<UtilisateurCreate>({
    nom_user: '',
    prenom_user: '',
    mail_user: '',
    telephone_user: '',
    mdp_user: '',
  });

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      await API.post('/api/comptes', formData);
      setSuccess(true);
      setTimeout(() => onSwitchToLogin(), 1500);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail: string }>;
      setError(axiosError.response?.data?.detail || "Erreur lors de l'inscription");
    }
  };

  return (
    <div style={styles.card}>
      <h2>Créer un compte</h2>
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>Compte créé ! Redirection...</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          name="nom_user"
          placeholder="Nom"
          value={formData.nom_user}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="text"
          name="prenom_user"
          placeholder="Prénom"
          value={formData.prenom_user}
          onChange={handleChange}
          required
          style={styles.input}
        />
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
          type="tel"
          name="telephone_user"
          placeholder="Téléphone (ex: 0612345678)"
          value={formData.telephone_user}
          onChange={handleChange}
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
          S'inscrire
        </button>
      </form>

      <p style={styles.footerText}>
        Déjà un compte ?{' '}
        <span onClick={onSwitchToLogin} style={styles.link}>
          Se connecter
        </span>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px', fontSize: '16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { color: 'red', fontSize: '14px' },
  success: { color: 'green', fontSize: '14px' },
  footerText: { marginTop: '15px', textAlign: 'center', fontSize: '14px' },
  link: { color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }
};