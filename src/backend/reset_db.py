from database import engine, Base
import models # Important pour que SQLAlchemy connaisse les tables

def reset_database():
    print("Suppression de toutes les tables...")
    # Cette commande supprime TOUTES les tables liées à 'Base'
    Base.metadata.drop_all(bind=engine)
    print("Toutes les tables ont été supprimées.")

if __name__ == "__main__":
    reset_database()