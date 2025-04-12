import { loadHistoryFromAPI, loadStatisticsFromAPI } from './api.js';
import { refreshHistory, updateHistoryGrid } from './history.js';
import { updateStatistics } from './statistics.js';

export function initApp() {
  // Khởi tạo lịch sử
  loadHistoryFromAPI()
    .then((history) => {
      window.detectionHistory = history;
      updateHistoryGrid();
    })
    .catch((error) => {
      console.error('Lỗi khi tải lịch sử:', error);
      window.detectionHistory = [];
      updateHistoryGrid();
    });

  // Khởi tạo thống kê
  loadStatisticsFromAPI()
    .then((statistics) => {
      window.detectionStatistics = statistics;
      updateStatistics(statistics);
    })
    .catch((error) => {
      console.error('Lỗi khi tải thống kê:', error);
      window.detectionStatistics = {
        total_faces: 0,
        emotions_count: {
          Angry: 0,
          Disgust: 0,
          Fear: 0,
          Happy: 0,
          Neutral: 0,
          Sad: 0,
          Surprise: 0
        },
        emotions_percentage: {
          Angry: 0,
          Disgust: 0,
          Fear: 0,
          Happy: 0,
          Neutral: 0,
          Sad: 0,
          Surprise: 0
        },
        period: 'week'
      };
      updateStatistics(window.detectionStatistics);
      refreshHistory();
    });
}