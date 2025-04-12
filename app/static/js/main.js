import { initApp } from './init.js';
import { setupTabs } from './tabs.js';
import { handleUpload } from './upload.js';
import { handleWebcam } from './webcam.js';
import { handlePaste } from './paste.js';
import { manageHistory } from './history.js';
import { displayStatistics } from './statistics.js';

// Khởi tạo ứng dụng khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
  initApp(); // Khởi tạo ứng dụng
  setupTabs(); // Thiết lập các tab
  handleUpload(); // Xử lý tải lên tệp
  handleWebcam(); // Xử lý webcam
  handlePaste(); // Xử lý dán hình ảnh từ clipboard
  manageHistory(); // Quản lý lịch sử
  displayStatistics(); // Hiển thị thống kê
});