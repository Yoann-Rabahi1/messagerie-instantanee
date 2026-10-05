// Types correspondant aux modèles SQLAlchemy / schémas Pydantic

export interface UtilisateurCreate {
  nom_user: string;
  prenom_user: string;
  mail_user: string;
  telephone_user?: string;
  mdp_user: string;
}

export interface UtilisateurLogin {
  mail_user: string;
  mdp_user: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}



export interface MessageCreate {
  destinataire_id: number;
  message_contenu: string;
}

export interface Utilisateur {
  user_id: number;
  prenom_user: string;
  nom_user: string;
  email_user: string;
}

export interface Message {
  message_id: number;
  expediteur_id: number;
  destinataire_id: number;
  message_contenu: string;
  date_envoi: string;
}