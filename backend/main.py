from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "backend" / "models" / "best.pt"

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

model = YOLO(str(MODEL_PATH))


def _decode_image(contents: bytes) -> np.ndarray:
    image_array = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="File bukan gambar yang valid")
    return image


def _format_detections(result: Any) -> list[dict[str, Any]]:
    detections: list[dict[str, Any]] = []
    names = result.names

    for box in result.boxes:
        class_id = int(box.cls[0].item())
        confidence = float(box.conf[0].item())
        x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]

        detections.append(
            {
                "class_id": class_id,
                "class_name": names.get(class_id, str(class_id)),
                "confidence": confidence,
                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            }
        )

    return detections


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload file gambar")

    contents = await file.read()
    image = _decode_image(contents)
    results = model.predict(image, verbose=False)
    result = results[0]

    return {
        "filename": file.filename,
        "image": {"width": int(result.orig_shape[1]), "height": int(result.orig_shape[0])},
        "detections": _format_detections(result),
    }


@app.websocket("/ws/inference")
async def websocket_inference(websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        while True:
            contents = await websocket.receive_bytes()
            image = _decode_image(contents)
            results = model.predict(image, verbose=False)
            result = results[0]

            await websocket.send_json(
                {
                    "image": {"width": int(result.orig_shape[1]), "height": int(result.orig_shape[0])},
                    "detections": _format_detections(result),
                }
            )
    except WebSocketDisconnect:
        return
    except HTTPException as exc:
        await websocket.send_json({"error": exc.detail})
        await websocket.close(code=1003)
