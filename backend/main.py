from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import shutil
#import asyncio

from database import engine, get_db
import models, schemas, security
from ai import summarizeBook, glossary, quiz, OCR, pdfToGoogle, flashcardsGenerator
#from utils import extractText, isImage, encodeImage 

class TextRequest(BaseModel):
    text: str

app = FastAPI()

# creare tabel
models.Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:3000",  
    "http://localhost",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://192.168.56.1:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware( 
    CORSMiddleware,
    allow_origins=origins,  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

uploads = "uploads" 
saveText ="saveText"
os.makedirs(uploads, exist_ok=True) 
os.makedirs(saveText, exist_ok=True)

# database = "postgresql://postgres:licenta123*#*@db.pvnnhwotebaatvghaqyx.supabase.co:5432/postgres"
#engine = create_engine(database)
#sessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
#base = declarative_base()

#class table(base):
    #__tablename__ = "user_content"
    #id = Column(Integer, primary_key=True, index=True)
    #fileName = Column(String)
    #summary = Column(Text)
    #quizJSON = Column(JSON)

#Base.metadata.create_all(bind=engine)

@app.get("/api/test")
def get_test_message():
    return {"message": "Conexiunea functioneaza!"}

#autentificare

@app.post("/api/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # verif mail in baza de date
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email deja inregistrat.")
    
    # criptare parola
    hashed_password = security.get_password_hash(user.password)
    
    # creare ut si salvare in baza de date
    new_user = models.User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # actualizare cu id ul dat de postgre
    
    print(f"Utilizator nou: {new_user.email}")
    return new_user

#login
@app.post("/api/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    #cautare ut dupa mail
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
    #verif daca exista si daca parola se potriveste cu cea criptata
    if not db_user or not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email sau parola incorecte.")
    
    print(f"Utilizator logat cu succes: {db_user.email}")
    return {
        "message": "Login successful", 
        "user": {"id": db_user.id, "name": db_user.name, "email": db_user.email}
    }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filePath = os.path.join("uploads", file.filename)

    with open(filePath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ext = os.path.splitext(file.filename)[1].lower()

    try:
        #pdf la gemini, docx local 
        cloudExt = [".pdf"]
        localExt = [".doc", ".docx", ".txt"]
        isImage = ext in [".png", ".jpg", ".jpeg", ".webp"]

        forAI = ""

        if ext in cloudExt:
            print("Procesare pdf")
            forAI = pdfToGoogle(filePath)
        elif ext in localExt:
            print(f"Procesare {ext} local...")
            with open(filePath, "r", encoding="utf-8") as f:
                 forAI = f.read()
        elif isImage:
            import base64
            with open(filePath, "rb") as image_file:
                 base64_data = base64.b64encode(image_file.read()).decode('utf-8')
            forAI = await OCR(base64_data)
        else:
            return {"message": "Extensie nesuportata"}

        print("generare sinteza")
        summaryRes = await summarizeBook(forAI)
        
        return {
            "filename": file.filename,
            "summary": summaryRes
        }
    except Exception as e:
        print(f"Eroare upload: {e}")
        return {"message": "Eroare la procesare"}

#flashcards
@app.post("/api/flashcards")
async def createFlashcards(request: TextRequest):
    try:
        print("generare flashcards")
        cards = await flashcardsGenerator(request.text)
        return {"flashcards": cards}
    except Exception as e:
        print(f"Eroare la generarea flashcardurilor: {e}")
        return {"flashcards": []}

#quiz
@app.post("/api/quiz")
async def createQuiz(request: TextRequest):
    try:
        print("generare quiz")
        quizData = await quiz(request.text) 
        return {"quiz": quizData}
    except Exception as e:
        print(f"Eroare la generarea quizului: {e}")
        return {"quiz": []}
    
#glosar
@app.post("/api/glossary")
async def createGlossary(request: TextRequest):
    try:
        print("generare glosar")
        glossaryText = await glossary(request.text) 
        return {"glossary": glossaryText}
    except Exception as e:
        print(f"Eroare la generarea glosarului: {e}")
        return {"glossary": ""}