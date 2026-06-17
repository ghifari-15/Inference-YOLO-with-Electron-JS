from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from image_utils import decode_image
from inference import YoloInferenceService


def create_router(inference_service: YoloInferenceService) -> APIRouter:
    router = APIRouter()

    @router.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @router.post("/predict")
    async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Upload file gambar")

        contents = await file.read()
        prediction = inference_service.predict(decode_image(contents))

        return {
            "filename": file.filename,
            **prediction,
        }

    @router.websocket("/ws/inference")
    async def websocket_inference(websocket: WebSocket) -> None:
        await websocket.accept()

        try:
            while True:
                contents = await websocket.receive_bytes()
                await websocket.send_json(inference_service.predict(decode_image(contents)))
        except WebSocketDisconnect:
            return
        except HTTPException as exc:
            await websocket.send_json({"error": exc.detail})
            await websocket.close(code=1003)

    return router
