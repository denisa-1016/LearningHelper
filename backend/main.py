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
import re
import io
import docx
from collections import Counter

class TextRequest(BaseModel):
    text: str

app = FastAPI()

# creare tabel
models.Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:3000",
    "http://45.80.149.49:3000",  
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

def extrage_cuvinte_cheie(text: str, top_n: int = 5):
    #lista cuv fara val sintetica
    stop_words = {"si", "de", "la", "in", "pe", "cu", "un", "o", "sa", "ca", "pentru", "este", "sunt", "care", "din", "mai", "nu", "se", "ce", "au", "fost", "prin", "acest", "aceasta", "sau", "dar", "iar", "daca", "cum", "unui", "unei", "cel", "cea", "fie", "ale", "ai"}
    
    #extragere cuv
    cuvinte = re.findall(r'\b[a-zțșăâîA-ZȚȘĂÂÎ]+\b', text.lower())
    
    #filtrare cuv scurte si stop words
    cuvinte_filtrate = [c for c in cuvinte if c not in stop_words and len(c) > 2]
    
    # calc frecv cuvant
    frecventa = Counter(cuvinte_filtrate)
    
    # returnare cuv de top
    return [cuvant for cuvant, numar in frecventa.most_common(top_n)]

#algoritm derivat din Flesch Reading Ease
def calculeaza_complexitate(text: str):
    # cautare sfarsit propozitii
    propozitii = re.split(r'[.!?]+', text)
    propozitii = [p for p in propozitii if len(p.strip()) > 0]
    
    # extragere cuv
    cuvinte = re.findall(r'\b\w+\b', text)
    
    if not propozitii or not cuvinte:
        return {"scor": 0, "nivel": "Necunoscut", "timp_citire_minute": 0}
        
    medie_cuvinte_pe_prop = len(cuvinte) / len(propozitii)
    lungime_medie_cuvant = sum(len(c) for c in cuvinte) / len(cuvinte)
    
    # formula de compelxitate
    scor = (medie_cuvinte_pe_prop * 0.5) + (lungime_medie_cuvant * 5)
    
    nivel = "Ușor"
    if scor > 35: 
        nivel = "Dificil"
    elif scor > 25: 
        nivel = "Mediu"
        
    # in medie 200 cuv per minut
    timp_citire = max(1, round(len(cuvinte) / 200))
    
    return {
        "nivel": nivel,
        "timp_citire_minute": timp_citire,
        "total_cuvinte": len(cuvinte)
    }

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
        # pdf la gemini, docx local 
        cloudExt = [".pdf"]
        localExt = [".doc", ".docx", ".txt"]
        isImage = ext in [".png", ".jpg", ".jpeg", ".webp"]

        forAI = ""

        if ext in cloudExt:
            print("Procesare pdf")
            forAI = pdfToGoogle(filePath)
        elif ext in localExt:
            print(f"Procesare {ext} local...")
            if ext == ".docx":
                doc_word = docx.Document(filePath)
                forAI = "\n".join([paragraf.text for paragraf in doc_word.paragraphs])
            elif ext == ".txt":
                with open(filePath, "r", encoding="utf-8") as f:
                    forAI = f.read()
            else:
                return {"message": "Formatul vechi .doc nu este suportat. Vă rugăm să îl salvați ca .docx."}
        elif isImage:
            import base64
            with open(filePath, "rb") as image_file:
                 base64_data = base64.b64encode(image_file.read()).decode('utf-8')
            forAI = await OCR(base64_data)
        else:
            return {"message": "Extensie nesuportata"}
        
        print("Generare sinteza cu AI...")
        summaryRes = await summarizeBook(forAI)
        
        print("Rulare algoritmi locali de analiza...")
        text_pentru_analiza = forAI if isinstance(forAI, str) else summaryRes
        
        cuvinte_cheie = extrage_cuvinte_cheie(text_pentru_analiza)
        date_complexitate = calculeaza_complexitate(text_pentru_analiza)

        return {
            "filename": file.filename,
            "summary": summaryRes,
            "keywords": cuvinte_cheie,
            "complexity": date_complexitate
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

@app.post("/api/decks/save")
def save_deck(deck_data: schemas.DeckCreate, db: Session = Depends(get_db)):
    try:
        # creare pachet in baza de date
        new_deck = models.Deck(title=deck_data.title, user_id=deck_data.user_id)
        db.add(new_deck)
        db.commit()
        db.refresh(new_deck)
        
        # adugare carduri in pachet
        for card in deck_data.cards:
            new_card = models.Flashcard(
                deck_id=new_deck.id,
                concept=card.concept,
                definition=card.definition
            )
            db.add(new_card)
            
        # salvare carduri
        db.commit()
        
        return {"message": "Pachetul a fost salvat cu succes!", "deck_id": new_deck.id}
    except Exception as e:
        print(f"Eroare la salvarea pachetului: {e}")
        return {"message": "Eroare la salvarea pachetului"}
    
@app.get("/api/decks/user/{user_id}")
def get_user_decks(user_id: int, db: Session = Depends(get_db)):
    try:
        # preluare pachete plus carduri
        decks = db.query(models.Deck).filter(models.Deck.user_id == user_id).all()
        
        # format pt frontend
        result = []
        for deck in decks:
            result.append({
                "id": deck.id,
                "title": deck.title,
                "cards": [{"id": c.id, "concept": c.concept, "definition": c.definition} for c in deck.cards]
            })
        return result
    except Exception as e:
        print(f"Eroare la preluarea pachetelor: {e}")
        return []