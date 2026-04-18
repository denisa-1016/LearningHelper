from sqlalchemy import Column, Integer, String, Text, JSON
from database import Base

class TableContent(Base):
    __tablename__ = "user_content"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    fileName = Column(String)
    summary = Column(Text)
    quizJSON = Column(JSON)