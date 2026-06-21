from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class TableContent(Base):
    __tablename__ = "user_content"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    fileName = Column(String)
    summary = Column(Text)
    quizJSON = Column(JSON)

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Deck(Base):
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("user_content.id")) 

    # un pachet are mai multe carduri
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    concept = Column(String)
    definition = Column(Text)

    # un card apartine unui pachet
    deck = relationship("Deck", back_populates="cards")