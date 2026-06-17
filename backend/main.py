from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import MODEL_PATH
from inference import YoloInferenceService
from routes import create_router


app = FastAPI(title="YOLO Inference API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not MODEL_PATH.exists():
    raise RuntimeError(f"Model tidak ditemukan: {MODEL_PATH}")

inference_service = YoloInferenceService(str(MODEL_PATH))
app.include_router(create_router(inference_service))
