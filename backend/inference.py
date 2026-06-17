from typing import Any

from ultralytics import YOLO


class YoloInferenceService:
    def __init__(self, model_path: str) -> None:
        self.model = YOLO(model_path)

    def predict(self, image: Any) -> dict[str, Any]:
        result = self.model.predict(image, verbose=False)[0]
        return {
            "image": {"width": int(result.orig_shape[1]), "height": int(result.orig_shape[0])},
            "detections": self._format_detections(result),
        }

    def _format_detections(self, result: Any) -> list[dict[str, Any]]:
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
