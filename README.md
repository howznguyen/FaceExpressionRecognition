# Ứng dụng Nhận diện Biểu cảm Khuôn mặt

Ứng dụng này cho phép nhận diện biểu cảm khuôn mặt từ hình ảnh hoặc webcam, sử dụng công nghệ xử lý hình ảnh và học máy.

## Tính năng

- Nhận diện biểu cảm khuôn mặt từ hình ảnh tải lên
- Nhận diện biểu cảm khuôn mặt qua webcam
- Nhận diện biểu cảm khuôn mặt thông qua dán ảnh
- Hiển thị chi tiết các biểu cảm và xác suất tương ứng
- Lưu lịch sử nhận diện để xem lại sau
- Thống kê biểu cảm khuôn mặt trong tuần/tháng/năm
- Thống kê biểu cảm khuôn mặt trong khoảng thời gian cụ thể
- Lọc lịch sử theo thời gian được thống kê

## Cài đặt và Chạy

### Yêu cầu

- Docker và Docker Compose

### Chạy Docker

1. Copy file .env.example và bỏ đuôi .example
2. Build image:

```bash
docker-compose --profile build up builder --build
```

3. Chạy container

```bash
docker-compose up -d
```

[Xem logs]

```bash
docker-compose logs backend -f
```
