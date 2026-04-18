import base64
from docx import Document


def extractText(file_path, ext):
    text = ""
    try:
        if ext == ".docx" or ext == ".doc":
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        return text
    except Exception as e:
        print(f"Eroare la extragerea textului din {ext}: {e}")
        return ""

def encodeImage(imagePath: str) -> str:
    with open(imagePath, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def isImage(extension: str) -> bool:
    return extension in [".png", ".jpg", ".jpeg", ".webp"]

