from pydantic import BaseModel

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