from pydantic import BaseModel
from typing import List

#datele primite de la user
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

#trimitere la frontend
class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

# structura pt login
class UserLogin(BaseModel):
    email: str
    password: str

#token care tine minte ca e logat ut
class Token(BaseModel):
    access_token: str
    token_type: str

class FlashcardCreate(BaseModel):
    concept: str
    definition: str

class DeckCreate(BaseModel):
    title: str
    user_id: int
    cards: List[FlashcardCreate]

class FlashcardResponse(BaseModel):
    id: int
    concept: str
    definition: str

    class Config:
        orm_mode = True

class DeckResponse(BaseModel):
    id: int
    title: str
    user_id: int
    cards: List[FlashcardResponse]

    class Config:
        orm_mode = True