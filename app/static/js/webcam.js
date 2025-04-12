import { analyzeImage, displayResult } from './api.js';

export function handleWebcam() {
  const video = document.getElementById('video');

  document.getElementById('startWebcam').addEventListener('click', async () => {
    try {
      document.getElementById('webcamError').classList.add('hidden');
      if (window.currentStream) {
        window.currentStream.getTracks().forEach((track) => track.stop());
      }
      const constraints = { video: true };
      console.log('Đang mở camera mặc định');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      window.currentStream = stream;
      video.srcObject = stream;
      video.classList.remove('hidden');
      document.getElementById('startWebcam').classList.add('hidden');
      document.getElementById('stopWebcam').classList.remove('hidden');
      document.getElementById('captureBtn').classList.remove('hidden');
    } catch (error) {
      showError(`Không thể truy cập webcam: ${error.message}`, 'webcamError');
    }
  });

  document.getElementById('stopWebcam').addEventListener('click', () => {
    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }
    video.classList.add('hidden');
    document.getElementById('stopWebcam').classList.add('hidden');
    document.getElementById('captureBtn').classList.add('hidden');
    document.getElementById('startWebcam').classList.remove('hidden');
    const note = document.getElementById('faceNotification');
    if (note) note.remove();
  });

  document.getElementById('captureBtn').addEventListener('click', async () => {
    const loading = document.getElementById('webcamLoading');
    const resultContainer = document.getElementById('resultContainer');
    const errorMessage = document.getElementById('webcamError');

    resultContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loading.classList.remove('hidden');

    const captureCanvas = document.getElementById('captureCanvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    const imageBase64 = captureCanvas.toDataURL('image/jpeg').split(',')[1];
    window.currentCapturedImage = imageBase64;

    try {
      const result = await analyzeImage(imageBase64, 'webcam');
      displayResult(result);
    } catch (error) {
      console.error('Error during webcam analysis:', error);
      showError(`Không thể phân tích ảnh: ${error.message}`, 'webcamError');
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