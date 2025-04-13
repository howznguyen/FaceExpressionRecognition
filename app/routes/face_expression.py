import base64
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
    UploadFile,
    File,
)
from fastapi.responses import HTMLResponse
from starlette.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import sqlite3
import json
import cv2
from datetime import datetime, timedelta
from keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from ultralytics import YOLO


router = APIRouter(prefix="/face-expression", tags=["Face Expression"])


# Kết nối và khởi tạo SQLite
def init_db():
    conn = sqlite3.connect("/code/app/history.db")  # Lưu tệp SQLite trong thư mục app
    cursor = conn.cursor()
    # Tạo bảng history nếu chưa tồn tại
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS detection_history (
            timestamp INTEGER PRIMARY KEY,
            image TEXT,  -- Lưu ảnh base64
            expressions TEXT  -- Lưu danh sách biểu cảm dưới dạng JSON
        )
    """
    )
    conn.commit()
    return conn


# Khởi tạo database khi ứng dụng khởi động
conn = init_db()

# Load mô hình một lần khi khởi động
yolo_model = YOLO("models/yolo_model.pt")
classifier = load_model("models/final_model.keras")


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
    # Đọc dữ liệu từ UploadFile
    contents = await face_input.image.read()

    # Chuyển thành base64 để lưu vào database
    image_base64 = base64.b64encode(contents).decode("utf-8")

    # Đọc hình ảnh với OpenCV
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Chuyển sang grayscale cho việc phân loại biểu cảm
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Phát hiện khuôn mặt với YOLO
    results = yolo_model(img)  # Dự đoán với YOLO
    faces = []
    for result in results:
        for box in result.boxes:
            # Lấy tọa độ và độ tin cậy từ YOLO
            x, y, x2, y2 = box.xyxy[0]  # Tọa độ bounding box (x, y, x2, y2)
            confidence = box.conf.item()  # Độ tin cậy của phát hiện
            class_id = int(box.cls.item())  # ID lớp (giả sử lớp 0 là "face")

            # Kiểm tra nếu đối tượng phát hiện là khuôn mặt (class_id và confidence phù hợp)
            if (
                class_id == 0 and confidence > 0.5
            ):  # Điều chỉnh ngưỡng confidence nếu cần
                x, y, x2, y2 = int(x), int(y), int(x2), int(y2)
                w = x2 - x
                h = y2 - y
                faces.append((x, y, w, h))

    face_count = len(faces)
    face_expression_output = FaceExpressionOutput(face_count=face_count, expressions=[])

    # Kiểm tra nếu không có khuôn mặt nào được phát hiện
    if face_count == 0:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=face_expression_output.model_dump(),
        )

    # Xử lý từng khuôn mặt
    results = []
    for x, y, w, h in faces:
        face_roi = gray[y : y + h, x : x + w]
        if face_roi.size == 0:
            continue

        face_img = cv2.resize(face_roi, (48, 48))
        face_img_array = face_img.reshape((1, 48, 48, 1)).astype(np.float32) / 255.0
        prediction = classifier.predict(face_img_array)
        emotions = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]
        emotion_index = np.argmax(prediction[0])
        label = emotions[emotion_index]
        if confidence < 0.4:
            continue

        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        results.append(
            Expression(
                expression=label,
                confidence=confidence,
                bounding_box=BoundingBox(x=x, y=y, width=w, height=h),
            )
        )

    face_expression_output.face_count = len(results)
    face_expression_output.expressions = results

    # Lưu vào SQLite
    if results:
        timestamp = int(datetime.now().timestamp() * 1000)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO detection_history (timestamp, image, expressions) VALUES (?, ?, ?)",
            (timestamp, image_base64, json.dumps([r.dict() for r in results])),
        )
        conn.commit()

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=face_expression_output.model_dump(),
    )


# Endpoint để lấy lịch sử
@router.get("/history")
async def get_history(
    period: str = "all", start_date: str = None, end_date: str = None
):
    """
    Lấy dữ liệu lịch sử theo khoảng thời gian.
    - period: "week" (tuần), "month" (tháng), "year" (năm), "all" (tất cả), hoặc "custom" (tùy chỉnh).
    - start_date: Ngày bắt đầu (định dạng YYYY-MM-DD, chỉ áp dụng khi period=custom).
    - end_date: Ngày kết thúc (định dạng YYYY-MM-DD, chỉ áp dụng khi period=custom).
    """
    cursor = conn.cursor()

    # Xác định khoảng thời gian
    now = datetime.now()
    if period == "custom" and start_date and end_date:
        try:
            start_time = int(
                datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000
            )
            end_time = (
                int(datetime.strptime(end_date, "%Y-%m-%d").timestamp() * 1000)
                + 86399999
            )  # Cuối ngày
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD.",
            )
    else:
        if period == "week":
            start_time = int((now - timedelta(days=7)).timestamp() * 1000)
        elif period == "month":
            start_time = int((now - timedelta(days=30)).timestamp() * 1000)
        elif period == "year":
            start_time = int((now - timedelta(days=365)).timestamp() * 1000)
        else:  # "all"
            start_time = 0
        end_time = int(now.timestamp() * 1000)

    # Lấy dữ liệu từ database
    cursor.execute(
        "SELECT timestamp, image, expressions FROM detection_history WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC",
        (start_time, end_time),
    )
    rows = cursor.fetchall()
    history = []
    for row in rows:
        history.append(
            {"timestamp": row[0], "image": row[1], "expressions": json.loads(row[2])}
        )
    return history


# Endpoint xóa một mục lịch sử
@router.delete("/history/{timestamp}")
async def delete_history_item(timestamp: int):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM detection_history WHERE timestamp = ?", (timestamp,))
    conn.commit()
    return {"message": f"Đã xóa mục lịch sử với timestamp {timestamp}"}


# Endpoint xóa toàn bộ lịch sử
@router.delete("/history")
async def clear_history():
    cursor = conn.cursor()
    cursor.execute("DELETE FROM detection_history")
    conn.commit()
    return {"message": "Đã xóa toàn bộ lịch sử"}


# Endpoint lấy thống kê cảm xúc
@router.get("/statistics")
async def get_statistics(
    period: str = "week", start_date: str = None, end_date: str = None
):
    """
    Lấy dữ liệu thống kê cảm xúc theo khoảng thời gian.
    - period: "week" (tuần), "month" (tháng), "year" (năm), "all" (tất cả), hoặc "custom" (tùy chỉnh).
    - start_date: Ngày bắt đầu (định dạng YYYY-MM-DD, chỉ áp dụng khi period=custom).
    - end_date: Ngày kết thúc (định dạng YYYY-MM-DD, chỉ áp dụng khi period=custom).
    """
    cursor = conn.cursor()

    # Xác định khoảng thời gian
    now = datetime.now()
    if period == "custom" and start_date and end_date:
        try:
            start_time = int(
                datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000
            )
            end_time = (
                int(datetime.strptime(end_date, "%Y-%m-%d").timestamp() * 1000)
                + 86399999
            )  # Cuối ngày
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD.",
            )
    else:
        if period == "week":
            start_time = int((now - timedelta(days=7)).timestamp() * 1000)
        elif period == "month":
            start_time = int((now - timedelta(days=30)).timestamp() * 1000)
        elif period == "year":
            start_time = int((now - timedelta(days=365)).timestamp() * 1000)
        else:  # "all"
            start_time = 0
        end_time = int(now.timestamp() * 1000)

    # Lấy dữ liệu từ database
    cursor.execute(
        "SELECT expressions FROM detection_history WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC",
        (start_time, end_time),
    )
    rows = cursor.fetchall()

    # Tính toán thống kê cảm xúc
    emotions_count = {
        "Angry": 0,
        "Disgust": 0,
        "Fear": 0,
        "Happy": 0,
        "Neutral": 0,
        "Sad": 0,
        "Surprise": 0,
    }

    total_faces = 0
    for row in rows:
        expressions = json.loads(row[0])
        for expr in expressions:
            emotion = expr["expression"]
            if emotion in emotions_count:
                emotions_count[emotion] += 1
                total_faces += 1

    # Tính phần trăm
    emotions_percentage = {}
    for emotion, count in emotions_count.items():
        emotions_percentage[emotion] = round(
            (count / total_faces * 100) if total_faces > 0 else 0, 2
        )

    return {
        "total_faces": total_faces,
        "emotions_count": emotions_count,
        "emotions_percentage": emotions_percentage,
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
    }


# Phục vụ index.html
@router.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    try:
        with open("static/index.html", "r") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content, status_code=200)
    except FileNotFoundError:
        return HTMLResponse(
            content="<h1>404 - Index file not found</h1>", status_code=404
        )
