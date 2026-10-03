from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

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