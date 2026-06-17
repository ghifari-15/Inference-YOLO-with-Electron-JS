export function setStatus(element, message, type = '') {
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

export function renderDetections(container, badge, detections, emptyMessage) {
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

export function drawDetections(target, overlay, detections, imageSize) {
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

export function clearOverlay(overlay) {
  overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
}
