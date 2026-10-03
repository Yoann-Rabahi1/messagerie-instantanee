from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Utilisateur(Base):
    __tablename__ = "utilisateur"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    nom_user = Column(String(50), nullable=False)
    prenom_user = Column(String(50), nullable=False)
    mail_user = Column(String(100), unique=True, nullable=False)
    telephone_user = Column(String(20), unique=True)
    mdp_user = Column(String(255), nullable=False)

    messages_envoyes = relationship("Message", back_populates="expediteur", foreign_keys="Message.expediteur_id")
    messages_recus = relationship("Message", back_populates="destinataire", foreign_keys="Message.destinataire_id")


class Message(Base):
    __tablename__ = "message"

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    expediteur_id = Column(Integer, ForeignKey("utilisateur.user_id"), nullable=False)
    destinataire_id = Column(Integer, ForeignKey("utilisateur.user_id"), nullable=False)
    message_contenu = Column(Text, nullable=False)

    # ⚠️ LES NOMS DANS back_populates DOIVENT EXISTER DANS UTILISATEUR
    expediteur = relationship("Utilisateur", foreign_keys=[expediteur_id], back_populates="messages_envoyes")
    destinataire = relationship("Utilisateur", foreign_keys=[destinataire_id], back_populates="messages_recus")