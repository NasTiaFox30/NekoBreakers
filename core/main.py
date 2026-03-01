import os
import random
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

MODEL_PATH = "uk_model.bin"
model = None

@app.on_event("startup")
def load_model():
    global model
    try:
        if not os.path.exists(MODEL_PATH):
            print(f"--- ПОМИЛКА: Файл {MODEL_PATH} не знайдено! Перевір вкладку Files. ---")
            return

        print(f"--- Спроба завантаження {MODEL_PATH}... ---")
        
        # Спроба 1: Текстовий формат (найімовірніше для Ubercorpus)
        try:
            print("Спроба 1: Завантаження як текст (binary=False)...")
            model = gensim.models.KeyedVectors.load_word2vec_format(
                MODEL_PATH, binary=False, unicode_errors='ignore'
            )
        except Exception as e:
            print(f"Спроба 1 не вдалася: {e}")
            # Спроба 2: Бінарний формат
            print("Спроба 2: Завантаження як бінарний файл (binary=True)...")
            model = gensim.models.KeyedVectors.load_word2vec_format(
                MODEL_PATH, binary=True, unicode_errors='ignore'
            )
        
        print(f"--- МОДЕЛЬ ЗАВАНТАЖЕНА! Слів у базі: {len(model)} ---")
        print("--- Neko Brain ОНЛАЙН ---")
            
    except Exception as e:
        print(f"--- КРИТИЧНА ПОМИЛКА ЗАВАНТАЖЕННЯ: {str(e)} ---")

class ComparisonRequest(BaseModel):
    word1: str
    word2: str

@app.get("/")
async def root():
    status = "Active" if model else "Loading/Error"
    count = len(model) if model else 0
    return {"status": status, "words_count": count}

@app.post("/similarity")
async def get_similarity(req: ComparisonRequest):
    if model is None:
        return {"similarity": 0.0, "rank": 4999, "error": "Model not loaded"}
    try:
        w1 = req.word1.lower().strip()
        w2 = req.word2.lower().strip()
        
        if w1 not in model or w2 not in model:
            return {"similarity": 0.0, "rank": 4999, "info": "Word not found"}
            
        sim = model.similarity(w1, w2)
        
        # Рахуємо ранг серед ТОП-5000
        similar_list = model.most_similar(w2, topn=5000)
        rank = 5000
        for i, (word, score) in enumerate(similar_list):
            if word == w1:
                rank = i + 1
                break
                
        return {"similarity": float(sim), "rank": rank}
    except Exception as e:
        return {"similarity": 0.0, "rank": 4999, "error": str(e)}

@app.get("/get_word")
async def get_random_word():
    if model is None:
        return {"error": "Model not loaded"}
    
    # Беремо найбільш вживані слова (перші 10к)
    all_words = list(model.key_to_index.keys())[:10000]
    suitable_words = [w for w in all_words if 4 <= len(w) <= 9 and w.isalpha()]
    
    if not suitable_words:
        return {"word": "ПРОГРАМА"}
            
    return {"word": random.choice(suitable_words).upper()}

@app.get("/get_hint/{target}")
async def get_hint(target: str):
    if model is None or target.lower() not in model:
        return {"error": "Target not in vocab"}
    
    # Отримуємо підказку з топ-300 (але не перші 10, щоб не було занадто легко)
    similar = model.most_similar(target.lower(), topn=300)
    hint_word, score = random.choice(similar[15:])
    
    # Визначаємо ранг підказки
    rank = next(i for i, (w, s) in enumerate(similar) if w == hint_word) + 1
    
    return {"word": hint_word.upper(), "rank": rank}