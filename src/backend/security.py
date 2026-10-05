import os
import jwt
from datetime import datetime, timezone, timedelta
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from dotenv import load_dotenv

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db  # Importe ta fonction de session DB
import models

# Charge les variables du fichier .env
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Indique à FastAPI quel endpoint fournit le token JWT (utilisé par Swagger /docs)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Initialisation du gestionnaire de hachage avec Bcrypt
password_hash = PasswordHash((BcryptHasher(),))

def hash_password(password: str) -> str:
    """Hache le mot de passe reçu en clair."""
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si le mot de passe en clair correspond au hash stocké."""
    return password_hash.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Génère un JWT contenant les données fournies et une date d'expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> models.Utilisateur:
    """Décode le token JWT et retourne l'utilisateur actuellement connecté."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Décodage du jeton avec la clé secrète
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    # Recherche de l'utilisateur en BDD
    user = db.query(models.Utilisateur).filter(models.Utilisateur.user_id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user