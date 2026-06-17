import { drawDetections, clearOverlay, renderDetections, setStatus } from './ui.js';


export function createPhotoController(elements, apiConfig) {
  let selectedFile = null;
  let previewUrl = null;

  function handleImageChange() {
    selectedFile = elements.imageInput.files[0] ?? null;
    elements.predictButton.disabled = !selectedFile;
    renderDetections(elements.photoDetections, elements.photoCountBadge, [], 'Belum ada hasil.');
    clearOverlay(elements.photoOverlay);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!selectedFile) {
      elements.photoPreview.removeAttribute('src');
      setStatus(elements.photoStatus, 'Pilih foto terlebih dahulu.');
      return;
    }

    previewUrl = URL.createObjectURL(selectedFile);
    elements.photoPreview.src = previewUrl;
    setStatus(elements.photoStatus, `Siap detect: ${selectedFile.name}`);
  }

  async function predictPhoto() {
    if (!selectedFile) return;

    elements.predictButton.disabled = true;
    setStatus(elements.photoStatus, 'Mengirim foto ke FastAPI...', 'loading');

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

      renderDetections(elements.photoDetections, elements.photoCountBadge, payload.detections, 'Tidak ada objek terdeteksi.');
      drawDetections(elements.photoPreview, elements.photoOverlay, payload.detections, payload.image);
      setStatus(elements.photoStatus, 'Detect photo selesai.', 'success');
    } catch (error) {
      setStatus(elements.photoStatus, `Error: ${error.message}`, 'error');
    } finally {
      elements.predictButton.disabled = false;
    }
  }

  return {
    bindEvents() {
      elements.imageInput.addEventListener('change', handleImageChange);
      elements.predictButton.addEventListener('click', predictPhoto);
    },
  };
}
