import json
import os
import base64
import typing_extensions as typing
from google import genai
from google.genai import types
from skills import longSummary, shortSummary, glossarySkill
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GOOGLE_API_KEY)
modelID = 'gemini-2.5-flash'

class QuizOption(typing.TypedDict):
    A: str
    B: str
    C: str
    D: str

class QuizQuestion(typing.TypedDict):
    question: str
    options: QuizOption
    correctAnswer: str
    explanation: str

class Flashcard(typing.TypedDict):
    concept: str
    definition: str

def pdfToGoogle(file_path: str):
    uploaded_file = client.files.upload(file=file_path)
    return uploaded_file

async def OCR(base64Image: str) -> str:
    try:
        image_bytes = base64.b64decode(base64Image)
        
        response = await client.aio.models.generate_content(
            model=modelID,
            contents=[
                "Esti un specialist in OCR. Transcrie tot textul din imaginea primita, iar daca este scris de mana incearca sa fii cat mai precis. Raspunde doar cu textul extras!",
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
            ]
        )
        return response.text
    except Exception as e:
        print("Eroare OCR: ", e)
        return ""

async def summarizeBook(sourceData):
    if isinstance(sourceData, str):
        words = len(sourceData.split())
        if words < 500:
            specifications = shortSummary
        else:
            specifications = longSummary
    else:
        specifications = longSummary

    try:
        response = await client.aio.models.generate_content(
            model=modelID,
            contents=sourceData,
            config=types.GenerateContentConfig(
                system_instruction=specifications
            )
        )
        return response.text
    except Exception as e:
        print(f"Eroare Rezumat: {e}")
        return "Eroare la procesarea rezumatului."
    
async def glossary(text):
    try:
        response = await client.aio.models.generate_content(
            model=modelID,
            contents=text,
            config=types.GenerateContentConfig(
                system_instruction=glossarySkill
            )
        )
        return response.text
    except Exception as e:
        print(f"Eroare Glosar: {e}")
        return "Eroare la procesarea glosarului."

async def quiz(sourceData) -> list:
    try:
        response = await client.aio.models.generate_content(
            model=modelID,
            contents=["Genereaza quiz-ul din acest document.", sourceData],
            config=types.GenerateContentConfig(
                system_instruction="Creeaza un quiz de 10 intrebari grila bazat pe textul primit. Fiecare intrebare trebuie sa aiba numarul ei. Distribuie raspunsurile corecte egal intre A, B, C si D. Nu pune raspunsul corect de 3 ori pe acceasi litera.",
                response_mime_type="application/json",
                response_schema=list[QuizQuestion],
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Eroare Quiz: {e}")
        return []
    
async def flashcardsGenerator(sourceData) -> list:
    try:
        print("Generam flashcards")
        response = await client.aio.models.generate_content(
            model=modelID,
            contents=["Extrage cele mai importante concepte din acest document pentru a crea flashcards de invatare.", sourceData],
            config=types.GenerateContentConfig(
                system_instruction="Creeaza un set de flashcards educationale bazate pe text. Extrage conceptele cheie. 'concept' trebuie sa fie un termen scurt, iar 'definition' trebuie sa fie explicatia clara si concisa a acelui termen. Returneaza o lista de obiecte JSON.",
                response_mime_type="application/json",
                response_schema=list[Flashcard],
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Eroare Flashcards: {e}")
        return []