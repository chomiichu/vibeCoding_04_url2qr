/**
 * URL2QR - Core Application Logic
 * Fast, Elegant QR Code Generation & High-Resolution JPG Downloader
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const body = document.body;
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnClearInput = document.getElementById('btnClearInput');
  const btnConfirm = document.getElementById('btnConfirm');
  const qrcodeBox = document.getElementById('qrcodeBox');
  const qrCard = document.getElementById('qrCard');
  const targetUrlText = document.getElementById('targetUrlText');
  const btnExplicitDownload = document.getElementById('btnExplicitDownload');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const btnResetView = document.getElementById('btnResetView');
  const brandLogoLink = document.getElementById('brandLogoLink');
  const quickSamples = document.querySelectorAll('.sample-chip');
  const toastWrapper = document.getElementById('toastWrapper');

  // State Variables
  let currentQrCodeInstance = null;
  let activeUrl = '';

  // 1. URL Formatting Helper
  function normalizeUrl(rawUrl) {
    let trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // If it doesn't start with a protocol or special scheme, default to https://
    if (!/^https?:\/\//i.test(trimmed) && !/^[a-z]+:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  // 2. Extract Clean Domain Name for File Naming
  function getDomainSlug(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      return host.replace(/[^a-zA-Z0-9_-]/g, '_') || 'qrcode';
    } catch {
      return 'qrcode';
    }
  }

  // 3. Toast Notification Helper
  function showToast(message, type = 'success', icon = null) {
    const defaultIcon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon || defaultIcon}</span>
      <span class="toast-text">${message}</span>
    `;

    toastWrapper.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2800);
  }

  // 4. Input Clear Button Toggle
  function updateClearButton() {
    if (urlInput.value.trim().length > 0) {
      btnClearInput.style.display = 'flex';
    } else {
      btnClearInput.style.display = 'none';
    }
  }

  urlInput.addEventListener('input', updateClearButton);
  btnClearInput.addEventListener('click', () => {
    urlInput.value = '';
    updateClearButton();
    urlInput.focus();
  });

  // 5. Generate QR Code Core Logic
  function generateQRCode(rawUrl) {
    const formattedUrl = normalizeUrl(rawUrl);
    if (!formattedUrl) {
      showToast('유효한 웹사이트 주소를 입력해주세요.', 'error', '⚠️');
      urlInput.focus();
      return;
    }

    // Save active URL
    activeUrl = formattedUrl;
    targetUrlText.textContent = formattedUrl;
    targetUrlText.title = formattedUrl;

    // Clear previous QR element
    qrcodeBox.innerHTML = '';

    // Check library availability
    if (typeof QRCode === 'undefined') {
      showToast('QR 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }

    try {
      // Create QRCode instance using qrcodejs
      currentQrCodeInstance = new QRCode(qrcodeBox, {
        text: formattedUrl,
        width: 268,
        height: 268,
        colorDark: '#0B0F19',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H // High error correction
      });

      // Transition to generated state:
      // URL input slides down to bottom, QR Code pops in center
      body.classList.remove('state-initial');
      body.classList.add('state-generated');

      showToast('QR 코드가 생성되었습니다! 클릭하여 다운로드하세요.', 'success', '✨');
    } catch (err) {
      console.error('QR Code generation error:', err);
      showToast('QR 코드 생성 중 오류가 발생했습니다.', 'error');
    }
  }

  // 6. High-Resolution JPG Downloader
  // Ensures pure white background, generous quiet zone (padding), and ultra-sharp pixels
  async function downloadQrAsJpg() {
    if (!activeUrl) {
      showToast('먼저 URL을 입력하여 QR 코드를 생성해주세요.', 'error');
      return;
    }

    // Find rendered canvas or image from qrcodeBox
    const sourceCanvas = qrcodeBox.querySelector('canvas');
    const sourceImg = qrcodeBox.querySelector('img');

    if (!sourceCanvas && (!sourceImg || !sourceImg.src)) {
      showToast('QR 코드 이미지를 찾을 수 없습니다.', 'error');
      return;
    }

    const exportDimension = 1200; // Ultra high resolution 1200x1200px
    const padding = 120; // Margin (Quiet zone)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportDimension;
    exportCanvas.height = exportDimension;
    const ctx = exportCanvas.getContext('2d');

    // Anti-aliasing off for crisp, readable QR pixels
    ctx.imageSmoothingEnabled = false;

    // 1. Fill solid white background (Critical for JPG format!)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportDimension, exportDimension);

    const drawTarget = async () => {
      if (sourceCanvas) {
        ctx.drawImage(sourceCanvas, padding, padding, exportDimension - padding * 2, exportDimension - padding * 2);
      } else if (sourceImg) {
        // Fallback: draw from Image object
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, padding, padding, exportDimension - padding * 2, exportDimension - padding * 2);
            resolve();
          };
          img.onerror = reject;
          img.src = sourceImg.src;
        });
      }
    };

    try {
      await drawTarget();

      // Convert to JPG data URL with maximum quality
      const jpgUrl = exportCanvas.toDataURL('image/jpeg', 0.98);

      // Create download trigger
      const domainSlug = getDomainSlug(activeUrl);
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `qrcode_${domainSlug}_${timestamp}.jpg`;

      const downloadLink = document.createElement('a');
      downloadLink.href = jpgUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Visual click ripple on qrCard
      triggerClickEffect(qrCard);

      showToast(`'${fileName}' JPG 파일로 다운로드되었습니다!`, 'success', '📸');
    } catch (err) {
      console.error('Download export failed:', err);
      showToast('JPG 다운로드 생성 중 오류가 발생했습니다.', 'error');
    }
  }

  // 7. Visual Click Animation Effect
  function triggerClickEffect(element) {
    element.style.transform = 'translate(-50%, -50%) scale(0.96)';
    setTimeout(() => {
      element.style.transform = '';
    }, 180);
  }

  // 8. Event Listeners

  // Form submission: URL input confirm
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode(urlInput.value);
  });

  // Clicking the QR Card directly downloads JPG (Requirement 4)
  qrCard.addEventListener('click', (e) => {
    // Only trigger if not clicking secondary action buttons inside
    if (e.target.closest('#btnCopyLink')) return;
    downloadQrAsJpg();
  });

  // Explicit Download Button inside card
  btnExplicitDownload.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQrAsJpg();
  });

  // Copy Link Button inside card
  btnCopyLink.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!activeUrl) return;

    try {
      await navigator.clipboard.writeText(activeUrl);
      showToast('URL 주소가 클립보드에 복사되었습니다!', 'success', '📋');
    } catch {
      // Fallback
      const tempInput = document.createElement('input');
      tempInput.value = activeUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showToast('URL 주소가 복사되었습니다!', 'success', '📋');
    }
  });

  // Quick Sample Chips
  quickSamples.forEach((chip) => {
    chip.addEventListener('click', () => {
      const sampleUrl = chip.getAttribute('data-url');
      if (sampleUrl) {
        urlInput.value = sampleUrl;
        updateClearButton();
        generateQRCode(sampleUrl);
      }
    });
  });

  // Reset to initial state
  function resetToInitial() {
    body.classList.remove('state-generated');
    body.classList.add('state-initial');
    urlInput.focus();
  }

  btnResetView.addEventListener('click', resetToInitial);
  brandLogoLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitial();
  });

  // 9. Interactive Mouse Cursor Gradient & Dynamic Color Shifting
  const cursorGlowOrb = document.getElementById('cursorGlowOrb');
  let currentMouseX = window.innerWidth / 2;
  let currentMouseY = window.innerHeight / 2;
  let targetMouseX = currentMouseX;
  let targetMouseY = currentMouseY;

  // Track pointer movements
  window.addEventListener('pointermove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  });

  // Smooth animation frame loop for gradient and cursor orb
  function animateGradient() {
    // Smooth Lerp interpolation
    currentMouseX += (targetMouseX - currentMouseX) * 0.08;
    currentMouseY += (targetMouseY - currentMouseY) * 0.08;

    const winW = window.innerWidth || 1920;
    const winH = window.innerHeight || 1080;

    const xRatio = Math.max(0, Math.min(1, currentMouseX / winW));
    const yRatio = Math.max(0, Math.min(1, currentMouseY / winH));

    const xPercent = (xRatio * 100).toFixed(2);
    const yPercent = (yRatio * 100).toFixed(2);

    // Calculate angle from screen center to mouse
    const centerX = winW / 2;
    const centerY = winH / 2;
    const rad = Math.atan2(currentMouseY - centerY, currentMouseX - centerX);
    const deg = Math.round((rad * (180 / Math.PI) + 450) % 360);

    // Dynamic color shifts based on mouse coordinates (Warm Gold, Sunset Peach, Amber Cream)
    const hue1 = Math.round(40 + xRatio * 18);   // 40° to 58° (Warm Amber -> Golden Lemon)
    const sat1 = Math.round(88 + yRatio * 10);   // 88% to 98%
    const light1 = Math.round(92 + (1 - xRatio) * 4); // 92% to 96%

    const hue2 = Math.round(20 + yRatio * 20);   // 20° to 40° (Soft Coral Peach -> Warm Tangerine)
    const sat2 = Math.round(85 + xRatio * 12);
    const light2 = Math.round(91 + xRatio * 4);

    const hue3 = Math.round(48 + ((xRatio + yRatio) / 2) * 14); // Cream Butter
    const hue4 = Math.round(12 + (1 - yRatio) * 16);  // Rose Champagne

    // Apply CSS custom properties
    document.documentElement.style.setProperty('--mouse-x', `${xPercent}%`);
    document.documentElement.style.setProperty('--mouse-y', `${yPercent}%`);
    document.documentElement.style.setProperty('--grad-angle', `${deg}deg`);
    document.documentElement.style.setProperty('--dyn-color-1', `hsl(${hue1}, ${sat1}%, ${light1}%)`);
    document.documentElement.style.setProperty('--dyn-color-2', `hsl(${hue2}, ${sat2}%, ${light2}%)`);
    document.documentElement.style.setProperty('--dyn-color-3', `hsl(${hue3}, 90%, 94%)`);
    document.documentElement.style.setProperty('--dyn-color-4', `hsl(${hue4}, 85%, 96%)`);

    // Move cursor orb smoothly
    if (cursorGlowOrb) {
      cursorGlowOrb.style.transform = `translate3d(${currentMouseX}px, ${currentMouseY}px, 0) translate(-50%, -50%)`;
    }

    requestAnimationFrame(animateGradient);
  }

  // Start gradient animation loop
  requestAnimationFrame(animateGradient);

  // Auto-focus input on initial load
  urlInput.focus();
  updateClearButton();
});
