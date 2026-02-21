from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
from pydantic import BaseModel

# ===== Supabase Config =====
SUPABASE_URL = "https://ymsctiblyflxmbgeptpj.supabase.co"
SUPABASE_KEY = "sb_publishable_EwNC0U18zZZ6f69L6Phl7w_httP81XW"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ===== FastAPI App =====
app = FastAPI()


# ===== Request Body Model =====
class LoginRequest(BaseModel):
    email: str
    password: str


# ===== Login Route =====
@app.post("/login")
def login(data: LoginRequest):

    response = supabase.table("users") \
        .select("*") \
        .eq("email", data.email) \
        .eq("password", data.password) \
        .execute()

    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = response.data[0]

    return {
        "message": "Login successful",
        "name": user["name"],
        "email": user["email"]
    }


# ===== Root Route =====
@app.get("/")
def root():
    return {"message": "Server is running"}