import { analyzeImage, displayResult } from './api.js';

export function handleUpload() {
  document.getElementById('submitBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    if (!file) {
      showError('Vui lòng chọn một hình ảnh', 'uploadError');
      return;
    }

    const loading = document.getElementById('uploadLoading');
    const resultContainer = document.getElementById('resultContainer');
    const errorMessage = document.getElementById('uploadError');

    resultContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loading.classList.remove('hidden');

    const fileReader = new FileReader();
    fileReader.onload = async function (event) {
      const base64Image = event.target.result.split(',')[1];
      window.currentCapturedImage = base64Image;
      console.log('Đã đọc file upload thành base64, độ dài:', base64Image.length);
      try {
        const result = await analyzeImage(base64Image, 'upload');
        displayResult(result);
      } catch (error) {
        console.error('Error during upload analysis:', error);
        showError(`Không thể phân tích ảnh: ${error.message}`, 'uploadError');
      } finally {
        loading.classList.add('hidden');
      }
    };
    fileReader.onerror = () => {
      showError('Không thể đọc file hình ảnh', 'uploadError');
      loading.classList.add('hidden');
    };
    fileReader.readAsDataURL(file);
  });
}

function showError(message, errorElementId) {
  const errorElement = document.getElementById(errorElementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}