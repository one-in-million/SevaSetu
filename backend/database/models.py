# backend/app/database/models.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .connection import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True) # Tracks the specific chat session
    
    # Profile Fields (The bot will try to fill these)
    name = Column(String, nullable=True)
    state = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    income = Column(Float, nullable=True) # Annual income
    caste = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    education = Column(String, nullable=True)

    # Link to their chat messages
    messages = relationship("ChatMessage", back_populates="user", cascade="all, delete")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"))
    
    role = Column(String) # "user" or "assistant"
    content = Column(String) # The actual message text
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Link back to the user
    user = relationship("UserProfile", back_populates="messages")