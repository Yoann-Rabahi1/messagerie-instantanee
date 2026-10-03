from fastapi import FastAPI, HTTPException, Depends, status
from database import engine, SessionLocal, get_db
from typing import Annotated
from sqlalchemy.orm import Session
import models
from schema import *
from security import hash_password

app = FastAPI(title="Messagerie instantanée")

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]


@app.get("/")
def test_route():
    return {"message" : "Bien reçu"}

@app.post("/signup")
async def create_user(User : UtilisateurCreate, db : db_dependency) -> UtilisateurCreate:

    mdp_hache = hash_password(User.mdp_user)

    new_user = models.Utilisateur(
            mail_user = User.mail_user,
            prenom_user = User.prenom_user,
            nom_user = User.nom_user,
            telephone_user = User.telephone_user,
            mdp_user = mdp_hache
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user