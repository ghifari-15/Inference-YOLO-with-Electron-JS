import { elements } from './renderer/dom.js';
import { createLiveController } from './renderer/live.js';
import { createPhotoController } from './renderer/photo.js';
import { setStatus } from './renderer/ui.js';


const apiConfig = window.apiConfig ?? {
  baseUrl: 'http://127.0.0.1:8000',
  wsUrl: 'ws://127.0.0.1:8000/ws/inference',
};

const photoController = createPhotoController(elements, apiConfig);
const liveController = createLiveController(elements, apiConfig);

function setView(viewName) {
  const isPhoto = viewName === 'photo';

  elements.photoView.classList.toggle('hidden', !isPhoto);
  elements.liveView.classList.toggle('hidden', isPhoto);
  elements.photoTab.classList.toggle('active', isPhoto);
  elements.liveTab.classList.toggle('active', !isPhoto);

  if (isPhoto && liveController.isStreaming()) {
    liveController.stopStream();
    setStatus(elements.liveStatus, 'Streaming dihentikan karena pindah ke Detect by Photo.');
  }
}

photoController.bindEvents();
liveController.bindEvents();

elements.photoTab.addEventListener('click', () => setView('photo'));
elements.liveTab.addEventListener('click', () => setView('live'));

window.addEventListener('resize', () => {
  elements.photoOverlay.width = elements.photoPreview.clientWidth;
  elements.photoOverlay.height = elements.photoPreview.clientHeight;
  elements.liveOverlay.width = elements.livePreview.clientWidth;
  elements.liveOverlay.height = elements.livePreview.clientHeight;
});

liveController.loadCameras().catch((error) => setStatus(elements.liveStatus, `Error: ${error.message}`, 'error'));
