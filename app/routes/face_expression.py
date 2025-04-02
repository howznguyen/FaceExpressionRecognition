import base64
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Response,
    UploadFile,
    File,
    Form,
)
from starlette.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import io
import numpy as np
import cv2

router = APIRouter(prefix="/face-expression", tags=["Face Expression"])


class FaceExpressionInput(BaseModel):
    image: UploadFile = File(
        ...,
        description="The image to predict the face expression of",
        media_type="image/jpeg",
    )

    model_config = {"extra": "forbid"}


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class Expression(BaseModel):
    expression: str
    confidence: float
    bounding_box: BoundingBox


class FaceExpressionOutput(BaseModel):
    face_count: int
    expressions: List[Expression]


@router.post("/predict", response_model=FaceExpressionOutput)
async def predict(face_input: FaceExpressionInput = Depends()):
    from keras.models import load_model
    from tensorflow.keras.preprocessing.image import img_to_array
    import cv2

    # Đọc dữ liệu từ UploadFile
    contents = await face_input.image.read()

    # Đọc hình ảnh với OpenCV
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Chuyển sang grayscale cho việc phát hiện khuôn mặt
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Sử dụng face detector (Haar Cascade hoặc DNN)
    face_cascade = cv2.CascadeClassifier(
        f"models/HaarcascadeclassifierCascadeClassifier.xml"
    )
    classifier = load_model(f"models/model.h5")
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    results = []
    face_count = len(faces)

    face_expression_ouput = FaceExpressionOutput(face_count=face_count, expressions=[])

    # Kiểm tra nếu không có khuôn mặt nào được phát hiện
    if face_count == 0:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=face_expression_ouput.model_dump(),
        )

    # Xử lý từng khuôn mặt
    for x, y, w, h in faces:
        # Cắt khuôn mặt
        face_roi = gray[y : y + h, x : x + w]

        # Resize thành 48x48 cho mô hình
        face_img = cv2.resize(face_roi, (48, 48))

        # Chuẩn bị cho mô hình
        face_img_array = face_img.reshape((1, 48, 48, 1)).astype(np.float32) / 255.0

        # Dự đoán
        prediction = classifier.predict(face_img_array)

        # Xác định nhãn và độ tin cậy
        emotions = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]
        emotion_index = np.argmax(prediction[0])
        label = emotions[emotion_index]
        confidence = float(prediction[0][emotion_index])

        if confidence < 0.4:
            print(f"Confidence too low: {confidence}")
            continue

        # Loại bỏ nếu bounding box nhỏ hơn 150x150
        if w < 120 or h < 120:
            print(f"Bounding box too small: {w}x{h}")
            continue

        # Tạo bounding box trên ảnh gốc
        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Thêm kết quả vào danh sách
        results.append(
            Expression(
                expression=label,
                confidence=confidence,
                bounding_box=BoundingBox(x=x, y=y, width=w, height=h),
            )
        )
    face_expression_ouput.face_count = len(results)
    face_expression_ouput.expressions = results

    # Tùy chọn: Chuyển ảnh đã đánh dấu thành base64 để hiển thị
    # _, img_encoded = cv2.imencode(".jpg", img)
    # img_base64 = base64.b64encode(img_encoded).decode("utf-8")

    # return {
    #     "message": f"Phát hiện {len(faces)} khuôn mặt",
    # }

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=face_expression_ouput.model_dump(),
    )
