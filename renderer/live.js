import { drawDetections, clearOverlay, renderDetections, setStatus } from './ui.js';


export function createLiveController(elements, apiConfig) {
  const captureCanvas = document.createElement('canvas');
  const captureContext = captureCanvas.getContext('2d');

  let mediaStream = null;
  let socket = null;
  let sendTimer = null;
  let waitingForResponse = false;

  async function loadCameras() {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');

    elements.cameraSelect.innerHTML = cameras
      .map((camera, index) => `<option value="${camera.deviceId}">${camera.label || `Camera ${index + 1}`}</option>`)
      .join('');

    const obsCamera = cameras.find((camera) => camera.label.toLowerCase().includes('obs'));
    if (obsCamera) {
      elements.cameraSelect.value = obsCamera.deviceId;
    }

    setStatus(
      elements.liveStatus,
      cameras.length ? 'Pilih source lalu tekan Start.' : 'Tidak ada video source terdeteksi.',
      cameras.length ? '' : 'error',
    );
  }

  async function startStream() {
    stopStream();

    const deviceId = elements.cameraSelect.value;
    if (!deviceId) {
      setStatus(elements.liveStatus, 'Pilih video source terlebih dahulu.', 'error');
      return;
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    elements.livePreview.srcObject = mediaStream;
    socket = new WebSocket(apiConfig.wsUrl);
    socket.binaryType = 'arraybuffer';

    socket.addEventListener('open', () => {
      elements.streamButton.textContent = 'Stop';
      setStatus(elements.liveStatus, 'Streaming inference aktif.', 'success');
      sendTimer = window.setInterval(sendFrame, 120);
    });

    socket.addEventListener('message', (event) => {
      waitingForResponse = false;
      const payload = JSON.parse(event.data);

      if (payload.error) {
        setStatus(elements.liveStatus, `Error: ${payload.error}`, 'error');
        return;
      }

      renderDetections(elements.liveDetections, elements.liveCountBadge, payload.detections, 'Tidak ada objek terdeteksi.');
      drawDetections(elements.livePreview, elements.liveOverlay, payload.detections, payload.image);
    });

    socket.addEventListener('close', () => {
      if (mediaStream) setStatus(elements.liveStatus, 'Koneksi WebSocket terputus.', 'error');
      stopStream();
    });

    socket.addEventListener('error', () => {
      setStatus(elements.liveStatus, 'Tidak bisa terhubung ke WebSocket backend.', 'error');
    });
  }

  function sendFrame() {
    if (!socket || socket.readyState !== WebSocket.OPEN || waitingForResponse || elements.livePreview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const width = elements.livePreview.videoWidth;
    const height = elements.livePreview.videoHeight;
    if (!width || !height) return;

    captureCanvas.width = width;
    captureCanvas.height = height;
    captureContext.drawImage(elements.livePreview, 0, 0, width, height);
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

    elements.livePreview.srcObject = null;
    clearOverlay(elements.liveOverlay);
    elements.streamButton.textContent = 'Start';
  }

  return {
    bindEvents() {
      elements.refreshButton.addEventListener('click', () => {
        loadCameras().catch((error) => setStatus(elements.liveStatus, `Error: ${error.message}`, 'error'));
      });

      elements.streamButton.addEventListener('click', () => {
        if (mediaStream) {
          stopStream();
          setStatus(elements.liveStatus, 'Streaming dihentikan.');
          return;
        }

        startStream().catch((error) => {
          stopStream();
          setStatus(elements.liveStatus, `Error: ${error.message}`, 'error');
        });
      });
    },
    isStreaming() {
      return Boolean(mediaStream);
    },
    loadCameras,
    stopStream,
  };
}
