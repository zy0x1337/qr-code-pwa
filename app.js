// QR Pro - Modern QR Code Generator & Scanner PWA
class QRProApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.currentSlide = 0;
    this.userTier = 'free'; // 'free', 'premium', 'trial'
    this.trialDaysLeft = 14;
    this.dailyQRCount = 0;
    this.dailyLimit = 10;
    this.qrHistory = [];
    this.scanHistory = [];
    this.settings = {
      theme: 'auto',
      notifications: true,
      autoSave: true
    };
    this.isScanning = false;
    this.currentStream = null;
    this.html5QrCode = null;
    this.previewTimeout = null;
    
    this.init();
  }

  async init() {
    this.showLoadingScreen();
    this.setupEventListeners();
    this.initializeData();
    await this.waitForLibraries();
    this.registerServiceWorker();
  }

  // Warten bis Bibliotheken geladen sind
async waitForLibraries() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 Sekunden warten

      const checkLibraries = () => {
        attempts++;
        if (typeof QRCode !== 'undefined') {
          console.log('QRCode library loaded successfully');
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.error('QRCode library failed to load');
          resolve(false);
        } else {
          setTimeout(checkLibraries, 100);
        }
      };
      
      checkLibraries();
    });
  }

  async registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Korrekter Pfad für GitHub Pages mit Repository-Name
      const registration = await navigator.serviceWorker.register('/qr-code-pwa/sw.js', {
        scope: '/qr-code-pwa/'
      });
      console.log('Service Worker registered successfully:', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateAvailable();
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

  showUpdateAvailable() {
    this.showToast('Update verfügbar! Seite neu laden?', 'info', 5000, [
      { text: 'Laden', action: () => window.location.reload() },
      { text: 'Später', action: () => {} }
    ]);
  }

  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const progress = document.querySelector('.loading-progress');
    
    let width = 0;
    const interval = setInterval(() => {
      width += Math.random() * 15;
      if (width >= 100) {
        width = 100;
        clearInterval(interval);
        setTimeout(() => {
          loadingScreen.style.opacity = '0';
          setTimeout(() => {
            loadingScreen.style.display = 'none';
            this.checkFirstTime();
          }, 300);
        }, 500);
      }
      progress.style.width = width + '%';
    }, 100);
  }

  checkFirstTime() {
    const hasSeenOnboarding = localStorage.getItem('qr-pro-onboarding');
    if (!hasSeenOnboarding) {
      this.showOnboarding();
    } else {
      this.showMainApp();
    }
  }

  showOnboarding() {
    document.getElementById('onboarding').classList.remove('hidden');
  }

  showMainApp() {
    document.getElementById('main-app').classList.remove('hidden');
    this.updateDashboard();
  }

  initializeData() {
    // Load data from localStorage
    const savedHistory = localStorage.getItem('qr-pro-history');
    const savedScanHistory = localStorage.getItem('qr-pro-scan-history');
    const savedSettings = localStorage.getItem('qr-pro-settings');
    const savedDailyCount = localStorage.getItem('qr-pro-daily-count');
    const savedDate = localStorage.getItem('qr-pro-last-date');
    
    if (savedHistory) {
      this.qrHistory = JSON.parse(savedHistory);
    }
    
    if (savedScanHistory) {
      this.scanHistory = JSON.parse(savedScanHistory);
    }
    
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
    
    // Reset daily count if it's a new day
    const today = new Date().toDateString();
    if (savedDate !== today) {
      this.dailyQRCount = 0;
      localStorage.setItem('qr-pro-daily-count', '0');
      localStorage.setItem('qr-pro-last-date', today);
    } else if (savedDailyCount) {
      this.dailyQRCount = parseInt(savedDailyCount);
    }
    
    this.applyTheme();
  }

  setupEventListeners() {
  // Onboarding Event Listeners
  const nextBtn = document.getElementById('next-onboarding');
  const skipBtn = document.getElementById('skip-onboarding');
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => this.nextSlide());
  }
  
  if (skipBtn) {
    skipBtn.addEventListener('click', () => this.skipOnboarding());
  }
  
  // Onboarding Dots Navigation
  document.querySelectorAll('.dot').forEach((dot, index) => {
    dot.addEventListener('click', () => this.goToSlide(index));
  });

  // Bottom Navigation Event Listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      this.navigateToPage(page);
    });
  });

  // QR Code Generator Event Listeners
  const generateBtn = document.getElementById('generate-btn');
  const qrContent = document.getElementById('qr-content');
  const qrType = document.getElementById('qr-type');
  const qrColor = document.getElementById('qr-color');
  const qrBgColor = document.getElementById('qr-bg-color');
  const downloadBtn = document.getElementById('download-btn');
  
  if (generateBtn) {
    generateBtn.addEventListener('click', () => this.generateQRCode());
  }
  
  if (qrContent) {
    qrContent.addEventListener('input', () => this.updatePreview());
    // Enter-Taste für schnelle Generierung
    qrContent.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        this.generateQRCode();
      }
    });
  }
  
  if (qrType) {
    qrType.addEventListener('change', () => {
      this.updateContentPlaceholder();
      this.updatePreview();
    });
  }
  
  if (qrColor) {
    qrColor.addEventListener('change', () => this.updatePreview());
  }
  
  if (qrBgColor) {
    qrBgColor.addEventListener('change', () => this.updatePreview());
  }
  
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => this.downloadQRCode());
  }

  // QR Code Scanner Event Listeners
  const startScanner = document.getElementById('start-scanner');
  const stopScanner = document.getElementById('stop-scanner');
  const copyResult = document.getElementById('copy-result');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  
  if (startScanner) {
    startScanner.addEventListener('click', () => this.startScanner());
  }
  
  if (stopScanner) {
    stopScanner.addEventListener('click', () => this.stopScanner());
  }
  
  if (copyResult) {
    copyResult.addEventListener('click', () => this.copyResult());
  }
  
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.click();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.scanFromFile(e.target.files[0]);
      }
    });
  }

  // History/Verlauf Event Listeners
  const searchHistory = document.getElementById('search-history');
  const clearHistory = document.getElementById('clear-history');
  const exportHistory = document.getElementById('export-history');
  const importHistory = document.getElementById('import-history');
  const importFile = document.getElementById('import-file');
  
  if (searchHistory) {
    searchHistory.addEventListener('input', (e) => {
      this.filterHistory(e.target.value);
    });
    
    // Suchfeld leeren mit Escape
    searchHistory.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        this.filterHistory('');
      }
    });
  }
  
  if (clearHistory) {
    clearHistory.addEventListener('click', () => {
      if (confirm('Möchten Sie den gesamten Verlauf löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        this.clearHistory();
      }
    });
  }
  
  if (exportHistory) {
    exportHistory.addEventListener('click', () => this.exportHistory());
  }
  
  if (importHistory) {
    importHistory.addEventListener('click', () => {
      const fileInput = document.getElementById('import-file');
      if (fileInput) fileInput.click();
    });
  }
  
  if (importFile) {
    importFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.importHistory(e.target.files[0]);
      }
    });
  }

  // Dashboard Quick Actions
  document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      this.handleQuickAction(action);
    });
    
    // Keyboard Navigation für Accessibility
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const action = card.dataset.action;
        this.handleQuickAction(action);
      }
    });
  });

  // Settings Event Listeners
  const themeSelector = document.getElementById('theme-selector');
  const notificationsToggle = document.getElementById('notifications-toggle');
  const autoSaveToggle = document.getElementById('auto-save-toggle');
  const resetSettings = document.getElementById('reset-settings');
  
  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      this.changeTheme(e.target.value);
    });
  }
  
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', (e) => {
      this.settings.notifications = e.target.checked;
      this.saveSettings();
    });
  }
  
  if (autoSaveToggle) {
    autoSaveToggle.addEventListener('change', (e) => {
      this.settings.autoSave = e.target.checked;
      this.saveSettings();
    });
  }
  
  if (resetSettings) {
    resetSettings.addEventListener('click', () => {
      if (confirm('Möchten Sie alle Einstellungen zurücksetzen?')) {
        this.resetSettings();
      }
    });
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + G = Generator öffnen
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      this.navigateToPage('generator');
    }
    
    // Ctrl/Cmd + S = Scanner öffnen
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.navigateToPage('scanner');
    }
    
    // Ctrl/Cmd + H = History/Verlauf öffnen
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      this.navigateToPage('history');
    }
    
    // Ctrl/Cmd + D = Dashboard öffnen
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      this.navigateToPage('dashboard');
    }
    
    // Escape = Scanner stoppen (falls aktiv)
    if (e.key === 'Escape' && this.isScanning) {
      this.stopScanner();
    }
  });

  // Touch/Swipe Events für Mobile Navigation
  let touchStartX = 0;
  let touchEndX = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    this.handleSwipeGesture();
  });

  // PWA Installation Event Listeners
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    this.deferredPrompt = e;
    this.showInstallPrompt();
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    this.showToast('App erfolgreich installiert!', 'success');
  });

  // Online/Offline Status
  window.addEventListener('online', () => {
    this.showToast('Verbindung wiederhergestellt', 'success');
    this.isOnline = true;
  });
  
  window.addEventListener('offline', () => {
    this.showToast('Offline-Modus aktiv', 'info');
    this.isOnline = false;
  });

  // Visibility Change (Tab wechseln)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab ist nicht mehr sichtbar - Scanner pausieren falls aktiv
      if (this.isScanning) {
        this.pauseScanner();
      }
    } else {
      // Tab ist wieder sichtbar - Scanner fortsetzen falls pausiert
      if (this.scannerPaused) {
        this.resumeScanner();
      }
    }
  });

  // Dynamic History Event Listeners (für später hinzugefügte Elemente)
  document.addEventListener('click', (e) => {
    // History Item Actions
    if (e.target.classList.contains('history-copy-btn')) {
      const content = e.target.dataset.content;
      this.copyToClipboard(content);
    }
    
    if (e.target.classList.contains('history-regenerate-btn')) {
      const content = e.target.dataset.content;
      this.regenerateQRCode(content);
    }
    
    if (e.target.classList.contains('history-delete-btn')) {
      const id = e.target.dataset.id;
      if (confirm('Diesen Eintrag löschen?')) {
        this.deleteHistoryItem(id);
      }
    }
    
    if (e.target.classList.contains('history-share-btn')) {
      const content = e.target.dataset.content;
      this.shareContent(content);
    }
  });

  // Resize Event für responsive Anpassungen
  window.addEventListener('resize', () => {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.handleResize();
    }, 250);
  });

  // Paste Event für schnelles QR Code generieren
  document.addEventListener('paste', (e) => {
    if (this.currentPage === 'generator') {
      const qrContent = document.getElementById('qr-content');
      if (qrContent && document.activeElement !== qrContent) {
        const pastedData = e.clipboardData.getData('text');
        if (pastedData && pastedData.trim()) {
          qrContent.value = pastedData.trim();
          this.updatePreview();
          qrContent.focus();
        }
      }
    }
  });
}

// Swipe Gesture Handler
handleSwipeGesture() {
  const threshold = 50;
  const swipeDistance = touchEndX - touchStartX;
  
  if (Math.abs(swipeDistance) > threshold) {
    const pages = ['dashboard', 'generator', 'scanner', 'history'];
    const currentIndex = pages.indexOf(this.currentPage);
    
    if (swipeDistance > 0 && currentIndex > 0) {
      // Swipe right - previous page
      this.navigateToPage(pages[currentIndex - 1]);
    } else if (swipeDistance < 0 && currentIndex < pages.length - 1) {
      // Swipe left - next page
      this.navigateToPage(pages[currentIndex + 1]);
    }
  }
}

// Resize Handler
handleResize() {
  // Scanner Größe anpassen
  if (this.isScanning && this.html5QrCode) {
    this.html5QrCode.getRunningTrackSettings().then(settings => {
      // Scanner neu dimensionieren
    }).catch(console.error);
  }
  
  // QR Code Preview Größe anpassen
  this.updatePreview();
}

// Settings speichern
saveSettings() {
  localStorage.setItem('qr-pro-settings', JSON.stringify(this.settings));
}

  updatePreview() {
    const content = document.getElementById('qr-content')?.value.trim();
    if (content && content.length > 0) {
      // Debounce für bessere Performance
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => {
        this.generateQRCodePreview();
      }, 500);
    } else {
      // Preview leeren wenn kein Content
      const preview = document.getElementById('qr-preview');
      if (preview) {
        preview.innerHTML = `
          <div class="preview-placeholder">
            <div class="placeholder-icon">📱</div>
            <div class="placeholder-text">QR Code wird hier angezeigt</div>
          </div>
        `;
      }
    }
  }

  // Separate Preview-Funktion
  async generateQRCodePreview() {
    const content = document.getElementById('qr-content')?.value.trim();
    if (!content) return;

    // Prüfen ob QRCode verfügbar ist
    if (typeof QRCode === 'undefined') {
      console.log('QRCode library not loaded yet');
      return;
    }

    const preview = document.getElementById('qr-preview');
    if (!preview) return;

    try {
      const options = {
        width: 250,
        height: 250,
        margin: 1,
        color: {
          dark: document.getElementById('qr-color')?.value || '#000000',
          light: document.getElementById('qr-bg-color')?.value || '#ffffff'
        }
      };

      // Canvas für Preview erstellen
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, content, options);
      canvas.className = 'qr-code-preview';

      preview.innerHTML = '';
      preview.appendChild(canvas);

    } catch (error) {
      console.error('Preview Error:', error);
      preview.innerHTML = `
        <div class="preview-error">
          <div class="error-icon">⚠️</div>
          <div class="error-text">Vorschau konnte nicht geladen werden</div>
        </div>
      `;
    }
  }

  // QR Code Generation
  // Korrigierte generateQRCode Methode
  async generateQRCode() {
    const content = document.getElementById('qr-content')?.value.trim();
    const type = document.getElementById('qr-type')?.value;
    
    if (!content) {
      this.showToast('Bitte geben Sie Inhalt für den QR Code ein', 'error');
      return;
    }

    // Warten bis QRCode verfügbar ist
    if (typeof QRCode === 'undefined') {
      this.showToast('QR Code Bibliothek wird geladen...', 'info');
      setTimeout(() => this.generateQRCode(), 1000);
      return;
    }

    // Daily limit prüfen
    if (this.userTier === 'free' && this.dailyQRCount >= this.dailyLimit) {
      this.showPremiumPrompt();
      return;
    }

    const preview = document.getElementById('qr-preview');
    const downloadBtn = document.getElementById('download-btn');
    
    try {
      const options = {
        width: 400,
        height: 400,
        margin: 2,
        color: {
          dark: document.getElementById('qr-color')?.value || '#000000',
          light: document.getElementById('qr-bg-color')?.value || '#ffffff'
        }
      };
      
      // QR Code generieren
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, content, options);
      canvas.className = 'qr-code-final';
      
      if (preview) {
        preview.innerHTML = '';
        preview.appendChild(canvas);
      }
      
      if (downloadBtn) downloadBtn.style.display = 'block';
      
      // Zu History hinzufügen
      this.addToHistory({
        type: 'generated',
        content: content,
        qrType: type,
        timestamp: Date.now()
      });
      
      // Daily count erhöhen
      this.dailyQRCount++;
      localStorage.setItem('qr-pro-daily-count', this.dailyQRCount.toString());
      
      this.showToast('QR Code erfolgreich generiert!', 'success');
      this.updateDashboard();
      
    } catch (error) {
      console.error('QR Generation Error:', error);
      this.showToast('Fehler beim Generieren des QR Codes: ' + error.message, 'error');
    }
  }

// Download-Funktion hinzufügen
downloadQRCode() {
    const canvas = document.querySelector('#qr-preview canvas');
    if (!canvas) {
      this.showToast('Kein QR Code zum Herunterladen verfügbar', 'error');
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = `qr-code-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      this.showToast('QR Code heruntergeladen!', 'success');
    } catch (error) {
      console.error('Download Error:', error);
      this.showToast('Fehler beim Download', 'error');
    }
  }

  // QR Code Scanner
  async startScanner() {
    try {
      const scannerContainer = document.getElementById('scanner-container');
      const startBtn = document.getElementById('start-scanner');
      const stopBtn = document.getElementById('stop-scanner');
      
      // Initialize scanner
      this.html5QrCode = new Html5Qrcode("scanner-container");
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.777778
      };
      
      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          this.handleScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          // Handle scan failure silently
        }
      );
      
      this.isScanning = true;
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      
    } catch (error) {
      console.error('Scanner Error:', error);
      this.showToast('Kamera konnte nicht gestartet werden', 'error');
    }
  }

  async stopScanner() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
        
        const startBtn = document.getElementById('start-scanner');
        const stopBtn = document.getElementById('stop-scanner');
        
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        this.isScanning = false;
        
      } catch (error) {
        console.error('Stop Scanner Error:', error);
      }
    }
  }

  handleScanSuccess(decodedText, decodedResult) {
    // Stop scanner
    this.stopScanner();
    
    // Show result
    const resultDiv = document.getElementById('scan-result');
    const resultText = document.getElementById('result-text');
    
    resultText.textContent = decodedText;
    resultDiv.style.display = 'block';
    
    // Add to scan history
    this.addToScanHistory({
      type: 'scanned',
      content: decodedText,
      timestamp: Date.now()
    });
    
    this.showToast('QR Code erfolgreich gescannt!', 'success');
    this.updateDashboard();
  }

  // Data Management
  addToHistory(entry) {
    this.qrHistory.unshift(entry);
    if (this.qrHistory.length > 100) {
      this.qrHistory = this.qrHistory.slice(0, 100);
    }
    localStorage.setItem('qr-pro-history', JSON.stringify(this.qrHistory));
  }

  addToScanHistory(entry) {
    this.scanHistory.unshift(entry);
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(0, 100);
    }
    localStorage.setItem('qr-pro-scan-history', JSON.stringify(this.scanHistory));
  }

  // UI Updates
  updateDashboard() {
    document.getElementById('total-created').textContent = this.qrHistory.length;
    document.getElementById('total-scanned').textContent = this.scanHistory.length;
    document.getElementById('daily-limit').textContent = `${this.dailyQRCount}/${this.dailyLimit}`;
    
    this.updateRecentActivity();
  }

  updateRecentActivity() {
    const recentItems = document.getElementById('recent-items');
    const allActivity = [...this.qrHistory, ...this.scanHistory]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    if (allActivity.length === 0) {
      recentItems.innerHTML = '<div class="empty-state">Noch keine QR Codes erstellt</div>';
      return;
    }
    
    recentItems.innerHTML = allActivity.map(item => `
      <div class="activity-item">
        <div class="activity-icon ${item.type === 'generated' ? 'primary' : 'success'}">
          ${item.type === 'generated' ? '📱' : '🔍'}
        </div>
        <div class="activity-content">
          <div class="activity-title">${item.type === 'generated' ? 'QR Code generiert' : 'QR Code gescannt'}</div>
          <div class="activity-text">${item.content.length > 40 ? item.content.substring(0, 40) + '...' : item.content}</div>
        </div>
        <div class="activity-time">${this.formatTime(item.timestamp)}</div>
      </div>
    `).join('');
  }

  // Utility Functions
  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes}m`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${days}d`;
  }

  showToast(message, type = 'info', duration = 3000, actions = []) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let actionsHtml = '';
    if (actions.length > 0) {
      actionsHtml = actions.map(action => 
        `<button onclick="(${action.action})()">${action.text}</button>`
      ).join('');
    }
    
    toast.innerHTML = `
      <div class="toast-content">
        <span>${message}</span>
        ${actionsHtml}
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
  }

  changeTheme(theme) {
    this.settings.theme = theme;
    localStorage.setItem('qr-pro-settings', JSON.stringify(this.settings));
    this.applyTheme();
  }

  applyTheme() {
    const { theme } = this.settings;
    const html = document.documentElement;
    
    if (theme === 'dark') {
      html.setAttribute('data-color-scheme', 'dark');
    } else if (theme === 'light') {
      html.setAttribute('data-color-scheme', 'light');
    } else {
      html.removeAttribute('data-color-scheme');
    }
  }

  // Navigation
  navigateToPage(page) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`)?.classList.add('active');
    
    this.currentPage = page;
    
    if (page === 'dashboard') {
      this.updateDashboard();
    }
  }

  handleQuickAction(action) {
    switch(action) {
      case 'generate-url':
        this.navigateToPage('generator');
        document.getElementById('qr-type').value = 'url';
        this.updateContentPlaceholder();
        break;
      case 'scan':
        this.navigateToPage('scanner');
        break;
    }
  }

  updateContentPlaceholder() {
    const type = document.getElementById('qr-type').value;
    const content = document.getElementById('qr-content');
    
    const placeholders = {
      'url': 'https://example.com',
      'text': 'Ihr Text hier...',
      'email': 'mail@example.com',
      'phone': '+49 123 456789',
      'sms': '+49 123 456789',
      'wifi': 'SSID:Passwort'
    };
    
    content.placeholder = placeholders[type] || 'Inhalt eingeben...';
  }

  // Onboarding
  nextSlide() {
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('next-onboarding');
    
    if (this.currentSlide < slides.length - 1) {
      slides[this.currentSlide].classList.remove('active');
      dots[this.currentSlide].classList.remove('active');
      this.currentSlide++;
      slides[this.currentSlide].classList.add('active');
      dots[this.currentSlide].classList.add('active');
      
      if (this.currentSlide === slides.length - 1) {
        nextBtn.textContent = 'Los geht\'s!';
      }
    } else {
      this.skipOnboarding();
    }
  }

  skipOnboarding() {
    localStorage.setItem('qr-pro-onboarding', 'true');
    document.getElementById('onboarding').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('onboarding').classList.add('hidden');
      this.showMainApp();
    }, 300);
  }

  showPremiumPrompt() {
    this.showToast('Premium Feature - Upgrade für unbegrenzte QR Codes!', 'warning', 5000);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.qrApp = new QRProApp();
});

// Additional CSS for toast notifications
const style = document.createElement('style');
style.textContent = `
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    max-width: 400px;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }
  
  .toast.show {
    transform: translateX(0);
  }
  
  .toast.success { background: var(--color-success); }
  .toast.error { background: var(--color-error); }
  .toast.warning { background: var(--color-warning); }
  .toast.info { background: var(--color-info); }
  
  .toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .toast button {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
`;
document.head.appendChild(style);
