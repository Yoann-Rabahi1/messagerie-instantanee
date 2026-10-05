import json
from typing import Dict
from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal, get_db
from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from schema import *
from security import hash_password, verify_password, create_access_token, get_current_user

app = FastAPI(title="Messagerie instantanée")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]


@app.get("/")
def test_route():
    return {"message" : "Bien reçu"}

@app.get("/me", response_model=UtilisateurResponse)
async def get_me(current_user: models.Utilisateur = Depends(get_current_user)):
    # current_user est automatiquement récupéré et vérifié via le token JWT
    return current_user

@app.post("/api/comptes")
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

@app.post("/login", response_model=Token)
async def login(login: UtilisateurLogin, db: db_dependency):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.mail_user == login.mail_user).first()

    if not user or not verify_password(login.mdp_user, user.mdp_user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects"
        )

    # Création du token avec l'identifiant et l'email
    access_token = create_access_token(
        data={"sub": str(user.user_id), "email": user.mail_user}
    )

    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/utilisateurs", response_model=List[UtilisateurResponse])
async def get_users(db : db_dependency):

    users = db.query(models.Utilisateur).all()

    return users

@app.delete("/api/utilisateur{user_id}")
async def delete_user(user_id : int, db : db_dependency):

    user = db.query(models.Utilisateur).filter(
        models.Utilisateur.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="L'utilisateur n'existe pas.")

    db.delete(user)
    db.commit()

    return {"status" : "success", "message" : "L'utilisateur a été supprimé"}


@app.get("/messages/{contact_id}", response_model=List[MessageResponse])
async def get_conversation(contact_id : int, db : db_dependency, current_user : models.Utilisateur = Depends(get_current_user)):

    messages = (
        db.query(models.Message)
        .filter(
            ((models.Message.expediteur_id == current_user.user_id) & (models.Message.destinataire_id == contact_id)) |
            ((models.Message.expediteur_id == contact_id) & (models.Message.destinataire_id == current_user.user_id))
        )
        .order_by(models.Message.date_envoi.asc())
        .all()
    )
    return messages

@app.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message_http(
    message_data: MessageCreate,
    db: db_dependency,
    current_user: models.Utilisateur = Depends(get_current_user)
):
    """
    Envoie un message via HTTP POST. 
    L'expéditeur est extrait automatiquement du token JWT.
    """
    # Vérification de l'existence du destinataire
    destinataire = db.query(models.Utilisateur).filter(models.Utilisateur.user_id == message_data.destinataire_id).first()
    if not destinataire:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Le destinataire spécifié n'existe pas."
        )

    new_message = models.Message(
        expediteur_id=current_user.user_id,
        destinataire_id=message_data.destinataire_id,
        message_contenu=message_data.message_contenu
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message



class ConnectionManager:
    def __init__(self):
        # Stocke les sockets actives par user_id: { user_id: WebSocket }
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

        # 1. Envoyer à l'utilisateur qui vient de se connecter la liste des utilisateurs en ligne
        online_user_ids = list(self.active_connections.keys())
        await websocket.send_text(
            json.dumps({"type": "online_users", "users": online_user_ids})
        )

        # 2. Informer TOUS les autres utilisateurs que ce user est en ligne
        await self.broadcast_status(user_id=user_id, online=True)

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def broadcast_status(self, user_id: int, online: bool):
        """Notifie l'ensemble des clients connectés du changement de statut d'un utilisateur."""
        payload = json.dumps(
            {"type": "user_status", "user_id": user_id, "online": online}
        )
        for connection in self.active_connections.values():
            try:
                await connection.send_text(payload)
            except Exception:
                pass

    async def send_personal_message(self, message_data: dict, target_user_id: int):
        """Envoie un message en temps réel à un destinataire spécifique s'il est connecté."""
        if target_user_id in self.active_connections:
            websocket = self.active_connections[target_user_id]
            payload = json.dumps(message_data)
            await websocket.send_text(payload)


manager = ConnectionManager()


# ------------------------------------------------------------------
# Route WebSocket : /ws/{user_id}
# ------------------------------------------------------------------
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket, user_id: int, db: Session = Depends(get_db)
):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Attente de réception d'un message du client React
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)

            destinataire_id = data.get("destinataire_id")
            message_contenu = data.get("message_contenu")

            if destinataire_id and message_contenu:
                # A. Enregistrement en BDD (Commit)
                db_message = models.Message(
                    expediteur_id=user_id,
                    destinataire_id=int(destinataire_id),
                    message_contenu=message_contenu,
                )
                db.add(db_message)
                db.commit()
                db.refresh(db_message)

                # B. Préparation du payload de réponse
                payload = {
                    "type": "chat_message",
                    "message_id": db_message.message_id,
                    "expediteur_id": db_message.expediteur_id,
                    "destinataire_id": db_message.destinataire_id,
                    "message_contenu": db_message.message_contenu,
                    "date_envoi": db_message.date_envoi.isoformat(),
                }

                # C. Diffusion au destinataire ET confirmation à l'expéditeur
                await manager.send_personal_message(payload, int(destinataire_id))
                await manager.send_personal_message(payload, user_id)

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast_status(user_id=user_id, online=False)
    except Exception as e:
        print(f"Erreur WebSocket sur le user {user_id}: {e}")
        manager.disconnect(user_id)
        await manager.broadcast_status(user_id=user_id, online=False)