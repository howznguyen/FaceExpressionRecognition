import { analyzeImage, displayResult } from './api.js';

export function handlePaste() {
  document.addEventListener('paste', (event) => {
    const pasteTab = document.querySelector('.tab[data-tab="paste"]');
    if (pasteTab) pasteTab.click();

    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    let imageFound = false;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (e) => {
          window.pastedImageBase64 = e.target.result.split(',')[1];
          console.log('Pasted image base64 length:', window.pastedImageBase64.length);
          const preview = document.getElementById('pastedImagePreview');
          preview.src = e.target.result;
          preview.classList.remove('hidden');
          document.getElementById('pasteSubmitBtn').classList.remove('hidden');
          document.getElementById('pasteError').classList.add('hidden');
        };
        reader.onerror = () => showError('Không thể đọc ảnh từ clipboard', 'pasteError');
        reader.readAsDataURL(blob);
        imageFound = true;
        break;
      }
    }

    if (!imageFound) showError('Không tìm thấy ảnh trong clipboard', 'pasteError');
  });

  document.getElementById('pasteSubmitBtn').addEventListener('click', async () => {
    if (!window.pastedImageBase64) {
      showError('Vui lòng dán một ảnh trước', 'pasteError');
      return;
    }

    const loading = document.getElementById('pasteLoading');
    const resultContainer = document.getElementById('resultContainer');
    const errorMessage = document.getElementById('pasteError');

    resultContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
      const result = await analyzeImage(window.pastedImageBase64, 'pasted');
      displayResult(result);
      window.pastedImageBase64 = null;
      document.getElementById('pastedImagePreview').classList.add('hidden');
      document.getElementById('pasteSubmitBtn').classList.add('hidden');
    } catch (error) {
      console.error('Error during paste analysis:', error);
      showError(`Không thể phân tích ảnh: ${error.message}`, 'pasteError');
    } finally {
      loading.classList.add('hidden');
    }
  });
}

function showError(message, errorElementId) {
  const errorElement = document.getElementById(errorElementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}