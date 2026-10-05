from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UtilisateurBase(BaseModel):
    nom_user : str
    prenom_user : str
    mail_user : EmailStr
    telephone_user : str


class UtilisateurCreate(UtilisateurBase):
    mdp_user : str

class UtilisateurLogin(BaseModel):
    mail_user : EmailStr
    mdp_user : str

class UtilisateurResponse(UtilisateurBase):
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    destinataire_id: int
    message_contenu: str

class MessageResponse(BaseModel):
    message_id: int
    expediteur_id: int
    destinataire_id: int
    message_contenu: str
    date_envoi: Optional[datetime] = None

    class Config:
        from_attributes = True