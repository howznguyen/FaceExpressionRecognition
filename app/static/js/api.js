import { addToHistory } from './history.js';
import { showNotification } from './utils.js';

// Gửi yêu cầu dự đoán biểu cảm
export async function analyzeImage(imageBase64, source) {
  try {
    const blob = await (await fetch(`data:image/jpeg;base64,${imageBase64}`)).blob();
    const formData = new FormData();
    formData.append('image', blob, `${source}-image.jpg`);
    console.log(`Sending request to /face-expression/predict for ${source}...`);
    const response = await fetch('http://localhost:9009/face-expression/predict', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi từ server: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    result.image = imageBase64;
    console.log(`Assigned ${source} image to result, base64 length:`, result.image.length);
    return result;
  } catch (error) {
    throw error;
  }
}

// Lấy toàn bộ lịch sử từ API
export async function loadHistoryFromAPI() {
  try {
    const response = await fetch('http://localhost:9009/face-expression/history');
    if (!response.ok) throw new Error('Không thể tải lịch sử');
    const history = await response.json();
    return history;
  } catch (error) {
    console.error('Lỗi khi tải lịch sử:', error);
    return [];
  }
}

export async function loadStatisticsFromAPI(period = 'all') {
  const response = await fetch(`/face-expression/statistics?period=${period}`);
  if (!response.ok) {
    throw new Error('Không thể lấy dữ liệu thống kê');
  }
  return response.json();
}

// Xóa một mục lịch sử
export async function deleteHistoryItem(timestamp) {
  try {
    const response = await fetch(`http://localhost:9009/face-expression/history/${timestamp}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Không thể xóa mục lịch sử');
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa mục lịch sử:', error);
    throw error;
  }
}

// Xóa toàn bộ lịch sử
export async function clearAllHistory() {
  try {
    const response = await fetch('http://localhost:9009/face-expression/history', {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Không thể xóa toàn bộ lịch sử');
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa toàn bộ lịch sử:', error);
    throw error;
  }
}

export function displayResult(result, skipHistory = false) {
  console.log('Hiển thị kết quả, skipHistory =', skipHistory);
  debugHistoryData(result);

  const resultCopy = JSON.parse(JSON.stringify(result));
  if (!resultCopy.expressions && resultCopy.detections) {
    resultCopy.expressions = resultCopy.detections;
  }

  const hasFaces = resultCopy.expressions && resultCopy.expressions.length > 0;
  if (hasFaces && !skipHistory) {
    console.log('Phát hiện', resultCopy.expressions.length, 'khuôn mặt, đang lưu vào lịch sử');
    addToHistory(resultCopy, resultCopy.image);
  } else if (!hasFaces) {
    console.log('Không phát hiện khuôn mặt nào, bỏ qua việc lưu lịch sử');
    showNotification('Không phát hiện khuôn mặt nào trong ảnh', 'error');
  }

  const resultContainer = document.getElementById('resultContainer');
  resultContainer.classList.remove('hidden');

  if (!resultCopy.expressions || resultCopy.expressions.length === 0) {
    resultContainer.innerHTML = `
      <h2 class="text-xl font-bold mb-4">Kết quả phân tích</h2>
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p class="text-yellow-700">Không phát hiện khuôn mặt nào trong hình ảnh.</p>
      </div>
    `;
    return;
  }

  let resultHTML = `
    <h2 class="text-xl font-bold mb-4">Kết quả phân tích</h2>
    <p class="mb-4">Đã phát hiện ${resultCopy.expressions.length} khuôn mặt trong hình ảnh.</p>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      <div class="lg:col-span-5">
        <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
          <h3 class="bg-gray-50 px-4 py-2 font-semibold">Hình ảnh gốc</h3>
          <div class="p-4 flex justify-center items-center">
            <div id="originalImageContainer" class="relative max-w-full"></div>
          </div>
        </div>
      </div>
      <div class="lg:col-span-7">
        <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
          <h3 class="bg-gray-50 px-4 py-2 font-semibold">Danh sách khuôn mặt</h3>
          <div id="facesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"></div>
        </div>
      </div>
    </div>
  `;
  resultContainer.innerHTML = resultHTML;

  const originalImageContainer = document.getElementById('originalImageContainer');
  if (originalImageContainer && resultCopy.image) {
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${resultCopy.image}`;
    img.className = 'max-w-full';
    img.alt = 'Original image';
    img.onerror = function () {
      console.error('Không thể tải ảnh gốc');
      this.onerror = null;
      this.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEwIDIwdi02aDR2Nmg1di04aDNMMTIgMyAyIDEyaDN2OHoiLz48L3N2Zz4=';
    };
    originalImageContainer.appendChild(img);

    if (resultCopy.expressions) {
      img.onload = function () {
        const imgWidth = this.width; // Kích thước hiển thị của ảnh
        const imgHeight = this.height;
        const naturalWidth = this.naturalWidth; // Kích thước gốc của ảnh
        const naturalHeight = this.naturalHeight;
        const widthRatio = imgWidth / naturalWidth; // Tỷ lệ co giãn theo chiều rộng
        const heightRatio = imgHeight / naturalHeight; // Tỷ lệ co giãn theo chiều cao

        resultCopy.expressions.forEach((face, index) => {
          if (face.bounding_box) {
            const { x, y, width, height } = face.bounding_box;
            const box = document.createElement('div');
            box.className = 'absolute border-2 border-blue-500';

            // Điều chỉnh vị trí và kích thước theo tỷ lệ
            box.style.left = `${x * widthRatio}px`;
            box.style.top = `${y * heightRatio}px`;
            box.style.width = `${width * widthRatio}px`;
            box.style.height = `${height * heightRatio}px`;

            const label = document.createElement('div');
            label.className = 'absolute top-0 left-0 bg-blue-500 text-white text-xs px-1 py-0.5';
            label.textContent = `#${index + 1}`;
            box.appendChild(label);
            originalImageContainer.appendChild(box);
          }
        });
      };
    }
  }

  const facesContainer = document.getElementById('facesContainer');
  if (facesContainer && resultCopy.expressions) {
    console.log('Đang hiển thị', resultCopy.expressions.length, 'khuôn mặt');
    Promise.all(
      resultCopy.expressions.map(async (face, index) => {
        try {
          let croppedImage = null;
          if (resultCopy.image && face.bounding_box) {
            croppedImage = await cropFaceImage(resultCopy.image, face.bounding_box, index);
          }
          return createFaceCard(face, index, croppedImage);
        } catch (error) {
          console.error(`Lỗi xử lý khuôn mặt #${index + 1}:`, error);
          const errorCard = document.createElement('div');
          errorCard.className = 'bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 p-4';
          errorCard.innerHTML = `
            <div class="text-center text-red-500">
              <p>Lỗi hiển thị khuôn mặt #${index + 1}</p>
            </div>
          `;
          return errorCard;
        }
      })
    )
      .then((faceCards) => {
        faceCards.forEach((card) => facesContainer.appendChild(card));
      })
      .catch((error) => {
        console.error('Lỗi khi hiển thị các khuôn mặt:', error);
        facesContainer.innerHTML = `
          <div class="col-span-full bg-red-50 border-l-4 border-red-400 p-4">
            <p class="text-red-700">Đã xảy ra lỗi khi hiển thị khuôn mặt. Vui lòng thử lại.</p>
          </div>
        `;
      });
  }
}

// Các hàm khác (displayHistoryDetail, cropFaceImage, createFaceCard, showNotification) giữ nguyên
export async function displayHistoryDetail(historyItem) {
  console.log('Hiển thị chi tiết lịch sử:', historyItem);

  let modalContainer = document.getElementById('detailModal');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'detailModal';
    modalContainer.className = 'fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex justify-center items-center';
    modalContainer.style.display = 'none';
    document.body.appendChild(modalContainer);
    modalContainer.addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });
  }

  let modalContent = document.createElement('div');
  modalContent.className = 'bg-white rounded-lg max-w-4xl w-full max-h-90vh overflow-auto';
  modalContainer.innerHTML = '';
  modalContainer.appendChild(modalContent);
  modalContainer.style.display = 'flex';

  modalContent.innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Chi tiết nhận diện</h2>
        <button class="text-gray-500 hover:text-gray-700 focus:outline-none" id="closeDetailModal">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p class="mt-2 text-gray-600">Đang tải dữ liệu...</p>
      </div>
    </div>
  `;

  document.getElementById('closeDetailModal').addEventListener('click', () => {
    modalContainer.style.display = 'none';
  });

  try {
    const date = new Date(historyItem.timestamp);
    const formattedDate = `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN')}`;

    const facesPromises = [];
    if (historyItem.expressions && historyItem.expressions.length > 0 && historyItem.image) {
      historyItem.expressions.forEach((face, index) => {
        if (face.bounding_box) {
          facesPromises.push(
            cropFaceImage(historyItem.image, face.bounding_box, index)
              .then((croppedImage) => ({ index, face, croppedImage }))
              .catch((error) => {
                console.error(`Lỗi khi cắt ảnh khuôn mặt #${index + 1}:`, error);
                return { index, face, croppedImage: null, error: error.message };
              })
          );
        } else {
          facesPromises.push(Promise.resolve({ index, face, croppedImage: null }));
        }
      });
    }

    const facesResults = await Promise.all(facesPromises);

    let modalBody = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Chi tiết nhận diện</h2>
          <button class="text-gray-500 hover:text-gray-700 focus:outline-none" id="closeDetailModal">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="text-sm text-gray-500 mb-4">${formattedDate}</div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div class="lg:col-span-5">
            <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <h3 class="bg-gray-50 px-4 py-2 font-semibold">Hình ảnh gốc</h3>
              <div class="p-4 flex justify-center items-center">
                <div id="originalImageContainer" class="relative max-w-full">
                  ${historyItem.image ? `<img src="data:image/jpeg;base64,${historyItem.image}" alt="Original image" class="max-w-full">` : `
                    <div class="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>
          <div class="lg:col-span-7">
            <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <h3 class="bg-gray-50 px-4 py-2 font-semibold">Danh sách khuôn mặt</h3>
              <div id="modalFacesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    modalContent.innerHTML = modalBody;

    const originalImgContainer = modalContent.querySelector('#originalImageContainer');
    const originalImg = originalImgContainer?.querySelector('img');
    if (originalImg && historyItem.expressions) {
      originalImg.onload = function () {
        const imgWidth = this.width; // Kích thước hiển thị của ảnh
        const imgHeight = this.height;
        const naturalWidth = this.naturalWidth; // Kích thước gốc của ảnh
        const naturalHeight = this.naturalHeight;
        const widthRatio = imgWidth / naturalWidth; // Tỷ lệ co giãn theo chiều rộng
        const heightRatio = imgHeight / naturalHeight; // Tỷ lệ co giãn theo chiều cao

        historyItem.expressions.forEach((face, idx) => {
          if (face.bounding_box) {
            const { x, y, width, height } = face.bounding_box;
            const box = document.createElement('div');
            box.className = 'absolute border-2 border-blue-500';

            // Điều chỉnh vị trí và kích thước theo tỷ lệ
            box.style.left = `${x * widthRatio}px`;
            box.style.top = `${y * heightRatio}px`;
            box.style.width = `${width * widthRatio}px`;
            box.style.height = `${height * heightRatio}px`;

            const label = document.createElement('div');
            label.className = 'absolute top-0 left-0 bg-blue-500 text-white text-xs px-1 py-0.5';
            label.textContent = `#${idx + 1}`;
            box.appendChild(label);
            originalImgContainer.appendChild(box);
          }
        });
      };
    }

    const modalFacesContainer = modalContent.querySelector('#modalFacesContainer');
    if (modalFacesContainer && facesResults.length > 0) {
      facesResults.forEach((result) => {
        const faceCard = createFaceCard(result.face, result.index, result.croppedImage);
        modalFacesContainer.appendChild(faceCard);
      });
    } else if (modalFacesContainer) {
      modalFacesContainer.innerHTML = `
        <div class="col-span-full text-center py-4 text-gray-500">
          Không có dữ liệu khuôn mặt
        </div>
      `;
    }

    document.getElementById('closeDetailModal').addEventListener('click', () => {
      modalContainer.style.display = 'none';
    });
  } catch (error) {
    console.error('Lỗi khi hiển thị chi tiết lịch sử:', error);
    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Chi tiết nhận diện</h2>
          <button class="text-gray-500 hover:text-gray-700 focus:outline-none" id="closeDetailModal">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
          <p class="text-red-700">Đã xảy ra lỗi khi hiển thị chi tiết: ${error.message}</p>
        </div>
      </div>
    `;
    document.getElementById('closeDetailModal').addEventListener('click', () => {
      modalContainer.style.display = 'none';
    });
  }
}

function debugHistoryData(data) {
  console.group('Debug dữ liệu lịch sử');
  console.log('Loại dữ liệu:', typeof data);
  console.log('Có phải là null?', data === null);
  if (data) {
    console.log('Các thuộc tính:', Object.keys(data));
    if (data.expressions) {
      console.log('Số lượng biểu cảm:', data.expressions.length);
      if (data.expressions.length > 0) console.log('Biểu cảm đầu tiên:', data.expressions[0]);
    } else {
      console.log('Không có thuộc tính expressions');
    }
    if (data.detections) {
      console.log('Số lượng detections:', data.detections.length);
      if (data.detections.length > 0) console.log('Detection đầu tiên:', data.detections[0]);
    } else {
      console.log('Không có thuộc tính detections');
    }
    if (data.image) {
      console.log('Độ dài ảnh:', data.image.length);
    } else {
      console.log('Không có thuộc tính image');
    }
  }
  console.groupEnd();
}

function cropFaceImage(base64Image, boundingBox, faceIndex) {
  return new Promise((resolve, reject) => {
    if (!base64Image) {
      console.warn(`Face #${faceIndex + 1}: Không có ảnh gốc để cắt`);
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let x, y, width, height;
      if (
        boundingBox &&
        typeof boundingBox.x === 'number' &&
        typeof boundingBox.y === 'number' &&
        typeof boundingBox.width === 'number' &&
        typeof boundingBox.height === 'number' &&
        boundingBox.width > 10 &&
        boundingBox.height > 10
      ) {
        x = Math.round(boundingBox.x);
        y = Math.round(boundingBox.y);
        width = Math.round(boundingBox.width);
        height = Math.round(boundingBox.height);
        console.log(`Face #${faceIndex + 1}: Sử dụng bounding box (${x},${y},${width},${height})`);
      } else {
        width = Math.round(img.width * 0.6);
        height = Math.round(img.height * 0.6);
        x = Math.round((img.width - width) / 2);
        y = Math.round((img.height - height) / 2);
        console.log(`Face #${faceIndex + 1}: Không tìm thấy bounding box hợp lệ, tạo vùng cắt tại trung tâm ảnh (${x},${y},${width},${height})`);
      }

      x = Math.max(0, x);
      y = Math.max(0, y);
      width = Math.min(width, img.width - x);
      height = Math.min(height, img.height - y);

      if (width < 10 || height < 10) {
        console.warn(`Face #${faceIndex + 1}: Vùng cắt quá nhỏ (${width}x${height}), sử dụng ảnh gốc`);
        resolve(base64Image);
        return;
      }

      canvas.width = width;
      canvas.height = height;

      try {
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        const croppedImage = canvas.toDataURL('image/jpeg').split(',')[1];
        console.log(`Face #${faceIndex + 1}: Đã cắt ảnh thành công, độ dài base64: ${croppedImage.length}`);
        resolve(croppedImage);
      } catch (e) {
        console.error(`Face #${faceIndex + 1}: Lỗi khi cắt ảnh:`, e);
        resolve(base64Image);
      }
    };

    img.onerror = function () {
      console.error(`Face #${faceIndex + 1}: Không thể tải ảnh gốc để cắt`);
      resolve(null);
    };

    img.src = `data:image/jpeg;base64,${base64Image}`;
  });
}

function createFaceCard(face, faceIndex, croppedImage) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200';

  let imageHTML = '';
  if (croppedImage) {
    imageHTML = `
      <div class="w-full h-48 overflow-hidden bg-gray-50 p-2">
        <div class="w-full h-full flex items-center justify-center">
          <img
            src="data:image/jpeg;base64,${croppedImage}"
            alt="Face ${faceIndex + 1}"
            class="max-w-full max-h-full object-contain"
            onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEwIDIwdi02aDR2Nmg1di04aDNMMTIgMyAyIDEyaDN2OHoiLz48L3N2Zz4=';"
          >
        </div>
      </div>
    `;
  } else {
    imageHTML = `
      <div class="w-full h-48 flex items-center justify-center bg-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    `;
  }

  let accuracyHTML = '';
  if (face.confidence !== undefined) {
    const accuracyPercentage = Math.round(face.confidence * 100);
    const accuracyColorClass =
      accuracyPercentage >= 90 ? 'text-green-600' : accuracyPercentage >= 70 ? 'text-yellow-600' : 'text-red-600';
    accuracyHTML = `
      <div class="flex items-center justify-between mb-2 text-sm">
        <span>Độ chính xác:</span>
        <span class="font-medium ${accuracyColorClass}">${accuracyPercentage}%</span>
      </div>
    `;
  }

  const contentHTML = `
    <div class="p-4">
      <div class="flex justify-between items-start">
        <h3 class="font-bold text-lg mb-2">${face.expression || 'Không xác định'}</h3>
        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">#${faceIndex + 1}</span>
      </div>
      ${accuracyHTML}
      <div class="space-y-2">
        ${Object.entries(face.probabilities || {})
          .sort((a, b) => b[1] - a[1])
          .map(
            ([emotion, prob]) => `
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>${emotion}</span>
                  <span>${Math.round(prob * 100)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.round(prob * 100)}%"></div>
                </div>
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;

  card.innerHTML = imageHTML + contentHTML;
  return card;
}