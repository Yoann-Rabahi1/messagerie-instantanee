from fastapi import FastAPI

app = FastAPI(title="Messagerie instantanée")

@app.get("/")
def test_route():
    return {"message" : "Bien reçu"}