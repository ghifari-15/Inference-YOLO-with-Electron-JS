const photoTab = document.querySelector('#photoTab');
const liveTab = document.querySelector('#liveTab');
const photoView = document.querySelector('#photoView');
const liveView = document.querySelector('#liveView');

const imageInput = document.querySelector('#imageInput');
const predictButton = document.querySelector('#predictButton');
const photoStatus = document.querySelector('#photoStatus');
const photoPreview = document.querySelector('#photoPreview');
const photoOverlay = document.querySelector('#photoOverlay');
const photoDetections = document.querySelector('#photoDetections');
const photoCountBadge = document.querySelector('#photoCountBadge');

const cameraSelect = document.querySelector('#cameraSelect');
const refreshButton = document.querySelector('#refreshButton');
const streamButton = document.querySelector('#streamButton');
const liveStatus = document.querySelector('#liveStatus');
const livePreview = document.querySelector('#livePreview');
const liveOverlay = document.querySelector('#liveOverlay');
const liveDetections = document.querySelector('#liveDetections');
const liveCountBadge = document.querySelector('#liveCountBadge');

const captureCanvas = document.createElement('canvas');
const captureContext = captureCanvas.getContext('2d');
const apiConfig = window.apiConfig ?? {
  baseUrl: 'http://127.0.0.1:8000',
  wsUrl: 'ws://127.0.0.1:8000/ws/inference',
};

let selectedFile = null;
let previewUrl = null;
let mediaStream = null;
let socket = null;
let sendTimer = null;
let waitingForResponse = false;

function setStatus(element, message, type = '') {
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

function setView(viewName) {
  const isPhoto = viewName === 'photo';

  photoView.classList.toggle('hidden', !isPhoto);
  liveView.classList.toggle('hidden', isPhoto);
  photoTab.classList.toggle('active', isPhoto);
  liveTab.classList.toggle('active', !isPhoto);

  if (isPhoto && mediaStream) {
    stopStream();
    setStatus(liveStatus, 'Streaming dihentikan karena pindah ke Detect by Photo.');
  }
}

function renderDetections(container, badge, detections, emptyMessage) {
  badge.textContent = `${detections.length} objek`;

  if (detections.length === 0) {
    container.className = 'detections empty';
    container.textContent = emptyMessage;
    return;
  }

  container.className = 'detections';
  container.innerHTML = detections
    .map(
      (detection) => `
        <article class="detection-card">
          <strong>${detection.class_name}</strong>
          <span>${(detection.confidence * 100).toFixed(2)}%</span>
        </article>
      `,
    )
    .join('');
}

function drawDetections(target, overlay, detections, imageSize) {
  const context = overlay.getContext('2d');
  const rect = target.getBoundingClientRect();

  overlay.width = rect.width;
  overlay.height = rect.height;
  context.clearRect(0, 0, overlay.width, overlay.height);

  if (!imageSize.width || !imageSize.height) return;

  const scale = Math.min(rect.width / imageSize.width, rect.height / imageSize.height);
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;

  detections.forEach((detection) => {
    const { x1, y1, x2, y2 } = detection.box;
    const x = offsetX + x1 * scale;
    const y = offsetY + y1 * scale;
    const width = (x2 - x1) * scale;
    const height = (y2 - y1) * scale;
    const label = `${detection.class_name} ${(detection.confidence * 100).toFixed(1)}%`;

    context.strokeStyle = '#ff6464';
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);

    context.font = '12px Arial';
    const labelWidth = context.measureText(label).width + 10;
    context.fillStyle = '#ffffff';
    context.fillRect(x, Math.max(0, y - 22), labelWidth, 20);
    context.fillStyle = '#000000';
    context.fillText(label, x + 5, Math.max(14, y - 8));
  });
}

function clearOverlay(overlay) {
  overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
}

imageInput.addEventListener('change', () => {
  selectedFile = imageInput.files[0] ?? null;
  predictButton.disabled = !selectedFile;
  renderDetections(photoDetections, photoCountBadge, [], 'Belum ada hasil.');
  clearOverlay(photoOverlay);

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  if (!selectedFile) {
    photoPreview.removeAttribute('src');
    setStatus(photoStatus, 'Pilih foto terlebih dahulu.');
    return;
  }

  previewUrl = URL.createObjectURL(selectedFile);
  photoPreview.src = previewUrl;
  setStatus(photoStatus, `Siap detect: ${selectedFile.name}`);
});

predictButton.addEventListener('click', async () => {
  if (!selectedFile) return;

  predictButton.disabled = true;
  setStatus(photoStatus, 'Mengirim foto ke FastAPI...', 'loading');

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch(`${apiConfig.baseUrl}/predict`, {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || 'Detect photo gagal');
    }

    renderDetections(photoDetections, photoCountBadge, payload.detections, 'Tidak ada objek terdeteksi.');
    drawDetections(photoPreview, photoOverlay, payload.detections, payload.image);
    setStatus(photoStatus, 'Detect photo selesai.', 'success');
  } catch (error) {
    setStatus(photoStatus, `Error: ${error.message}`, 'error');
  } finally {
    predictButton.disabled = false;
  }
});

async function loadCameras() {
  await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });

  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === 'videoinput');

  cameraSelect.innerHTML = cameras
    .map((camera, index) => `<option value="${camera.deviceId}">${camera.label || `Camera ${index + 1}`}</option>`)
    .join('');

  const obsCamera = cameras.find((camera) => camera.label.toLowerCase().includes('obs'));
  if (obsCamera) {
    cameraSelect.value = obsCamera.deviceId;
  }

  setStatus(liveStatus, cameras.length ? 'Pilih source lalu tekan Start.' : 'Tidak ada video source terdeteksi.', cameras.length ? '' : 'error');
}

async function startStream() {
  stopStream();

  const deviceId = cameraSelect.value;
  if (!deviceId) {
    setStatus(liveStatus, 'Pilih video source terlebih dahulu.', 'error');
    return;
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  livePreview.srcObject = mediaStream;
  socket = new WebSocket(apiConfig.wsUrl);
  socket.binaryType = 'arraybuffer';

  socket.addEventListener('open', () => {
    streamButton.textContent = 'Stop';
    setStatus(liveStatus, 'Streaming inference aktif.', 'success');
    sendTimer = window.setInterval(sendFrame, 120);
  });

  socket.addEventListener('message', (event) => {
    waitingForResponse = false;
    const payload = JSON.parse(event.data);

    if (payload.error) {
      setStatus(liveStatus, `Error: ${payload.error}`, 'error');
      return;
    }

    renderDetections(liveDetections, liveCountBadge, payload.detections, 'Tidak ada objek terdeteksi.');
    drawDetections(livePreview, liveOverlay, payload.detections, payload.image);
  });

  socket.addEventListener('close', () => {
    if (mediaStream) setStatus(liveStatus, 'Koneksi WebSocket terputus.', 'error');
    stopStream();
  });

  socket.addEventListener('error', () => {
    setStatus(liveStatus, 'Tidak bisa terhubung ke WebSocket backend.', 'error');
  });
}

function sendFrame() {
  if (!socket || socket.readyState !== WebSocket.OPEN || waitingForResponse || livePreview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const width = livePreview.videoWidth;
  const height = livePreview.videoHeight;
  if (!width || !height) return;

  captureCanvas.width = width;
  captureCanvas.height = height;
  captureContext.drawImage(livePreview, 0, 0, width, height);
  waitingForResponse = true;

  captureCanvas.toBlob((blob) => {
    if (blob && socket?.readyState === WebSocket.OPEN) {
      socket.send(blob);
    } else {
      waitingForResponse = false;
    }
  }, 'image/jpeg', 0.72);
}

function stopStream() {
  window.clearInterval(sendTimer);
  sendTimer = null;
  waitingForResponse = false;

  if (socket) {
    socket.close();
    socket = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  livePreview.srcObject = null;
  clearOverlay(liveOverlay);
  streamButton.textContent = 'Start';
}

photoTab.addEventListener('click', () => setView('photo'));
liveTab.addEventListener('click', () => setView('live'));

refreshButton.addEventListener('click', () => {
  loadCameras().catch((error) => setStatus(liveStatus, `Error: ${error.message}`, 'error'));
});

streamButton.addEventListener('click', () => {
  if (mediaStream) {
    stopStream();
    setStatus(liveStatus, 'Streaming dihentikan.');
    return;
  }

  startStream().catch((error) => {
    stopStream();
    setStatus(liveStatus, `Error: ${error.message}`, 'error');
  });
});

window.addEventListener('resize', () => {
  photoOverlay.width = photoPreview.clientWidth;
  photoOverlay.height = photoPreview.clientHeight;
  liveOverlay.width = livePreview.clientWidth;
  liveOverlay.height = livePreview.clientHeight;
});

loadCameras().catch((error) => setStatus(liveStatus, `Error: ${error.message}`, 'error'));
