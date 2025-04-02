# Ứng dụng Nhận diện Biểu cảm Khuôn mặt

Ứng dụng này cho phép nhận diện biểu cảm khuôn mặt từ hình ảnh hoặc webcam, sử dụng công nghệ xử lý hình ảnh và học máy.

## Tính năng

- Nhận diện biểu cảm khuôn mặt từ hình ảnh tải lên
- Nhận diện biểu cảm khuôn mặt qua webcam
- Hiển thị chi tiết các biểu cảm và xác suất tương ứng
- Lưu lịch sử nhận diện để xem lại sau

## Cài đặt và Chạy

### Yêu cầu

- Docker và Docker Compose

### Các lệnh Docker

1. Build image:

```bash
docker-compose --profile build up builder --build
```

2. Chạy container:

```bash
docker-compose up -d
```

3. Xem logs:

```bash
docker-compose logs backend -f
``
```
