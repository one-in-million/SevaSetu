from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api.chat import router as chat_router

# Import your database configuration and models
from database.connection import engine
from database import models

# 1. Initialize Database Tables
# This tells SQLAlchemy to look at models.py and create the tables in pgAdmin if they don't exist
print("⚙️ Checking PostgreSQL database and creating tables if necessary...")
models.Base.metadata.create_all(bind=engine)

# 2. Initialize FastAPI App
app = FastAPI(
    title="SevaSetu Agentic API",
    description="Backend for the AI-powered Government Scheme Assistant",
    version="1.0.0"
)

# 3. Setup CORS (Cross-Origin Resource Sharing)
# This allows your Next.js frontend to securely send requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Your Next.js default port
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, etc.
    allow_headers=["*"], # Allows all headers
)

# 4. Basic Health Check Endpoint
@app.get("/")
def health_check():
    return {
        "status": "online", 
        "message": "SevaSetu Agentic Backend is up and running!"
    }
# Add this import at the top with your other imports


# Add this right below your CORSMiddleware section
app.include_router(chat_router, prefix="/api")

# 5. Run the server (Only if run directly)
if __name__ == "__main__":
    print("🚀 Starting FastAPI server on http://localhost:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)