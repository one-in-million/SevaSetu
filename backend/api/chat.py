# backend/api/chat.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage

# Import DB and Graph dependencies
from database.connection import get_db
from database import models
from core.graph import app_graph

router = APIRouter()

# Define the structure of the incoming data from Next.js
class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    print(f"📥 Received message from session: {request.session_id}")
    
    # 1. Fetch or Create the User Profile
    user = db.query(models.UserProfile).filter(models.UserProfile.session_id == request.session_id).first()
    if not user:
        user = models.UserProfile(session_id=request.session_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Save the User's Message to the Database
    user_msg_db = models.ChatMessage(user_id=user.id, role="user", content=request.message)
    db.add(user_msg_db)
    db.commit()
    user = db.query(models.UserProfile).filter(models.UserProfile.session_id == request.session_id).first()
    # 3. Load Chat History for LangGraph
    # We load the last 10 messages to keep the context window manageable
    chat_history = db.query(models.ChatMessage).filter(models.ChatMessage.user_id == user.id).order_by(models.ChatMessage.timestamp.asc()).limit(10).all()
    
    langchain_messages = []
    for msg in chat_history:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        else:
            langchain_messages.append(AIMessage(content=msg.content))

    # 4. Prepare the User Profile for LangGraph State
    profile_dict = {
        "name": user.name,
        "state": user.state,
        "age": user.age,
        "gender": user.gender,
        "income": user.income,
        "caste": user.caste,
        "occupation": user.occupation,
        "education": user.education
    }

    # 5. Initialize the LangGraph State
    initial_state = {
        "messages": langchain_messages,
        "user_profile": profile_dict,
        "intent": None,
        "matched_schemes": [],
        "missing_fields": [],
        "final_response": None
    }

    # 6. RUN THE LANGGRAPH WORKFLOW
    print("🚀 Triggering LangGraph Workflow...")
    try:
        final_state = app_graph.invoke(initial_state)
    except Exception as e:
        print(f"❌ Error in LangGraph: {e}")
        raise HTTPException(status_code=500, detail="Internal AI Processing Error")

    # 7. Extract the final response
    # It either comes from the Clerk (final_response) or an earlier node (like Solicitor asking a question)
    if final_state.get("final_response"):
        ai_text = final_state["final_response"]
    else:
        # If the graph stopped early (e.g., to ask a question), grab the last AI message
        ai_text = final_state["messages"][-1].content
    # 7.5 Update the Database Profile with any newly extracted information
    updated_profile = final_state.get("user_profile", {})
    
    if updated_profile.get("name"): user.name = updated_profile["name"]
    if updated_profile.get("state"): user.state = updated_profile["state"]
    if updated_profile.get("age"): user.age = updated_profile["age"]
    if updated_profile.get("gender"): user.gender = updated_profile["gender"]
    if updated_profile.get("income"): user.income = updated_profile["income"]
    if updated_profile.get("caste"): user.caste = updated_profile["caste"]
    if updated_profile.get("occupation"): user.occupation = updated_profile["occupation"]
    if updated_profile.get("education"): user.education = updated_profile["education"]
    
    db.commit()

    # 8. Save the AI's Response to the Database
    ai_msg_db = models.ChatMessage(user_id=user.id, role="assistant", content=ai_text)
    db.add(ai_msg_db)
    db.commit()

    return ChatResponse(response=ai_text)