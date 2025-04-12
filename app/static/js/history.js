import { deleteHistoryItem, clearAllHistory } from './api.js';
import { displayHistoryDetail } from './api.js';

window.detectionHistory = [];

export function manageHistory() {
  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả lịch sử?')) {
      clearAllHistory()
        .then(() => {
          window.detectionHistory = [];
          updateHistoryGrid();
          showNotification('Đã xóa tất cả lịch sử', 'success');
        })
        .catch((error) => {
          console.error('Lỗi khi xóa lịch sử:', error);
          showNotification('Có lỗi khi xóa lịch sử', 'error');
        });
    }
  });
}

export function updateHistoryGrid() {
  const historyGrid = document.getElementById('historyGrid');
  historyGrid.innerHTML = '';

  if (!window.detectionHistory || window.detectionHistory.length === 0) return;

  window.detectionHistory.forEach((item) => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item relative bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200';
    historyItem.setAttribute('data-timestamp', item.timestamp);

    const date = new Date(item.timestamp);
    const formattedDate = `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN')}`;

    historyItem.innerHTML = `
      <div class="absolute top-2 right-2">
        <button class="delete-btn text-gray-400 hover:text-red-500 focus:outline-none" title="Xóa">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div class="w-full h-32 bg-gray-100">
        ${item.image ? `<img src="data:image/jpeg;base64,${item.image}" alt="History thumbnail" class="w-full h-full object-cover">` : `
          <div class="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        `}
      </div>
      <div class="p-3">
        <div class="text-xs text-gray-500 mb-1">${formattedDate}</div>
        <div class="font-medium">${item.expressions ? `${item.expressions.length} khuôn mặt` : 'Không có khuôn mặt'}</div>
      </div>
    `;
    historyGrid.appendChild(historyItem);
  });

  setupHistoryItemListeners();
}

function setupHistoryItemListeners() {
  document.querySelectorAll('.history-item').forEach((item) => {
    const timestamp = item.getAttribute('data-timestamp');
    item.addEventListener('click', (event) => {
      if (!event.target.closest('.delete-btn')) {
        const historyItem = window.detectionHistory.find((h) => h.timestamp == timestamp);
        if (historyItem) displayHistoryDetail(historyItem);
      }
    });

    const deleteBtn = item.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (confirm('Bạn có chắc chắn muốn xóa mục này?')) {
          deleteHistoryItem(parseInt(timestamp))
            .then(() => {
              window.detectionHistory = window.detectionHistory.filter((h) => h.timestamp != timestamp);
              updateHistoryGrid();
              showNotification('Đã xóa mục lịch sử', 'success');
            })
            .catch((error) => {
              console.error('Lỗi khi xóa mục lịch sử:', error);
              showNotification('Có lỗi khi xóa mục lịch sử', 'error');
            });
        }
      });
    }
  });
}

export function addToHistory(result, imageBase64) {
  try {
    console.log('Thêm vào lịch sử với dữ liệu:', result);
    if (!result) {
      console.error('Không có dữ liệu kết quả để lưu vào lịch sử');
      return;
    }

    const expressionsData = result.detections || result.expressions || [];
    const historyItem = {
      timestamp: Date.now(),
      expressions: expressionsData,
      image: imageBase64,
    };

    window.detectionHistory.unshift(historyItem);
    updateHistoryGrid();
  } catch (error) {
    console.error('Lỗi khi thêm vào lịch sử:', error);
  }
}

function showNotification(message, type = 'info') {
  let notificationContainer = document.getElementById('notificationContainer');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notificationContainer';
    notificationContainer.className = 'fixed bottom-4 right-4 z-50';
    document.body.appendChild(notificationContainer);
  }

  const notification = document.createElement('div');
  notification.className = `mb-2 p-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0 ${
    type === 'success' ? 'bg-green-500 text-white' : type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
  }`;
  notification.innerHTML = message;
  notificationContainer.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Hàm làm mới lịch sử dựa trên bộ lọc thời gian
export async function refreshHistory() {
  const periodFilter = document.getElementById("periodFilter");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const period = periodFilter.value;

  let url = "/face-expression/history";
  if (period === "custom") {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
      showNotification("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc", "error");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      showNotification("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc", "error");
      return;
    }

    url += `?period=custom&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `?period=${period}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Không thể lấy dữ liệu lịch sử');
    }
    const history = await response.json();
    window.detectionHistory = history;
    updateHistoryGrid(history);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu lịch sử:', error);
    showNotification('Đã xảy ra lỗi khi lấy dữ liệu lịch sử', 'error');
  }
}