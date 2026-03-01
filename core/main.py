import os
import gensim.models
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Тепер шлях прямий, бо файл вже в репозиторії
MODEL_PATH = "uk_model.bin"

model = None

@app.on_event("startup")
def load_model():
    global model
    try:
        if not os.path.exists(MODEL_PATH):
            print(f"--- ПОМИЛКА: Файл {MODEL_PATH} не знайдено в репозиторії! ---")
            return

        print(f"--- Завантаження моделі з локального файлу... ---")
        # Спробуємо завантажити. Якщо це Word2Vec формат:
        model = gensim.models.KeyedVectors.load_word2vec_format(
            MODEL_PATH, 
            binary=True, 
            unicode_errors='ignore'
        )
        print("--- Neko Brain ОНЛАЙН (Українська мова) ---")
        
    except Exception as e:
        print(f"--- КРИТИЧНА ПОМИЛКА ЗАВАНТАЖЕННЯ: {str(e)} ---")

class ComparisonRequest(BaseModel):
    word1: str
    word2: str

@app.get("/")
async def root():
    status = "Active" if model else "Loading/Error"
    return {"status": status, "model": "Ukrainian Ubercorpus W2V"}

@app.post("/similarity")
async def get_similarity(req: ComparisonRequest):
    if model is None:
        return {"similarity": 0.0, "error": "Model not loaded"}
    try:
        w1 = req.word1.lower().strip()
        w2 = req.word2.lower().strip()
        
        if w1 not in model or w2 not in model:
            return {"similarity": 0.0, "info": "Word not found"}
            
        sim = model.similarity(w1, w2)
        return {"similarity": float(sim)}
    except Exception as e:
        return {"similarity": 0.0, "error": str(e)}