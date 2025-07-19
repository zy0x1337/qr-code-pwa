// Sofortige Debug-Konsole für Android
if (/Android/i.test(navigator.userAgent)) {
  // Debug-Button erstellen
  const debugBtn = document.createElement('div');
  debugBtn.innerHTML = '🐛';
  debugBtn.style.cssText = `
    position: fixed; top: 10px; right: 10px; z-index: 99999;
    background: red; color: white; width: 50px; height: 50px;
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; cursor: pointer; font-size: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
  `;
  
  // Debug-Panel
  const debugPanel = document.createElement('div');
  debugPanel.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0; height: 300px;
    background: rgba(0,0,0,0.95); color: lime; font-family: monospace;
    font-size: 12px; padding: 10px; z-index: 99998; overflow-y: auto;
    border-top: 2px solid lime; display: none;
  `;
  
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(debugBtn);
    document.body.appendChild(debugPanel);
  });
  
  // Toggle-Funktion
  debugBtn.onclick = () => {
    debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
  };
  
  // Console hijacking
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    debugPanel.innerHTML += `[${new Date().toLocaleTimeString()}] ${args.join(' ')}<br>`;
    debugPanel.scrollTop = debugPanel.scrollHeight;
  };
}

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

    // Touch-Gesten Variablen
    this.touchStartX = 0;
  this.touchEndX = 0;
  this.resizeTimeout = null;
  this.deferredPrompt = null;
  this.scannerPaused = false;
  this.librariesLoaded = false;
  this.isOnline = navigator.onLine;
    
    this.init();
  }

  async init() {
    this.showLoadingScreen();
    this.setupEventListeners();
    this.initializeData();
    await this.waitForLibraries();
    this.registerServiceWorker();
  }

  async registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      let registration;
      
      // Verschiedene Pfade für verschiedene Umgebungen
      const isGitHubPages = window.location.hostname === 'zy0x1337.github.io';
      const swPath = isGitHubPages ? '/qr-code-pwa/sw.js' : './sw.js';
      const swScope = isGitHubPages ? '/qr-code-pwa/' : './';
      
      registration = await navigator.serviceWorker.register(swPath, {
        scope: swScope
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

  // TEMPORÄRER TEST-BUTTON
  const scannerPage = document.getElementById('scanner-page');
  if (scannerPage) {
    const testBtn = document.createElement('button');
    testBtn.textContent = '🧪 Test Scan';
    testBtn.className = 'btn btn--outline';
    testBtn.onclick = () => this.testQRRecognition();
    testBtn.style.margin = '1rem';
    scannerPage.appendChild(testBtn);
    }

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

// Fügen Sie diese Methode zu Ihrer QRProApp Klasse hinzu (temporär für Testing)
testQRRecognition() {
  console.log('🧪 Teste QR-Erkennung...');
  
  // Simuliere erfolgreichen QR-Scan
  setTimeout(() => {
    this.onScanSuccess('https://www.google.com', null);
  }, 2000);
  
  this.showToast('🧪 Test-Scan in 2 Sekunden...', 'info');
}

goToSlide(index) {
  const slides = document.querySelectorAll('.onboarding-slide');
  const dots = document.querySelectorAll('.dot');
  const nextBtn = document.getElementById('next-onboarding');
  
  // Aktuellen Slide deaktivieren
  if (slides[this.currentSlide]) {
    slides[this.currentSlide].classList.remove('active');
    dots[this.currentSlide].classList.remove('active');
  }
  
  // Neuen Slide aktivieren
  this.currentSlide = index;
  if (slides[this.currentSlide]) {
    slides[this.currentSlide].classList.add('active');
    dots[this.currentSlide].classList.add('active');
  }
  
  // Button-Text anpassen
  if (nextBtn) {
    nextBtn.textContent = (index === slides.length - 1) ? 'Los geht\'s!' : 'Weiter';
  }
}

copyResult() {
  const resultText = document.getElementById('result-text');
  if (resultText && resultText.textContent) {
    this.copyToClipboard(resultText.textContent);
  }
}

scanFromFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    this.showToast('Bitte wählen Sie eine Bilddatei aus', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // Hier würden Sie normalerweise eine QR-Decode-Bibliothek verwenden
    // Für Demo-Zwecke simulieren wir das Scannen
    setTimeout(() => {
      const demoResult = 'Demo: QR Code aus Datei gescannt';
      this.handleScanSuccess(demoResult, null);
    }, 1000);
  };
  
  reader.readAsDataURL(file);
  this.showToast('Bild wird analysiert...', 'info');
}

pauseScanner() {
  if (this.html5QrCode && this.isScanning) {
    this.scannerPaused = true;
    // Scanner pausieren (vereinfacht)
    console.log('Scanner pausiert');
  }
}

resumeScanner() {
  if (this.html5QrCode && this.scannerPaused) {
    this.scannerPaused = false;
    // Scanner fortsetzen (vereinfacht)
    console.log('Scanner fortgesetzt');
  }
}

filterHistory(searchTerm) {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  const allHistory = [...this.qrHistory, ...this.scanHistory];
  const filtered = allHistory.filter(item => 
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  this.displayHistory(filtered);
}

displayHistory(historyItems) {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  if (historyItems.length === 0) {
    historyList.innerHTML = '<div class="empty-state">Keine Einträge gefunden</div>';
    return;
  }
  
  historyList.innerHTML = historyItems.map(item => `
    <div class="history-item">
      <div class="history-header">
        <span class="history-type">${item.type === 'generated' ? 'Generiert' : 'Gescannt'}</span>
        <span class="history-date">${this.formatTime(item.timestamp)}</span>
      </div>
      <div class="history-content">${item.content}</div>
      <div class="history-actions">
        <button class="history-copy-btn" data-content="${item.content}">Kopieren</button>
        ${item.type === 'generated' ? 
          `<button class="history-regenerate-btn" data-content="${item.content}">Erneut</button>` : 
          ''
        }
        <button class="history-delete-btn" data-id="${item.id || item.timestamp}">Löschen</button>
      </div>
    </div>
  `).join('');
}

clearHistory() {
  this.qrHistory = [];
  this.scanHistory = [];
  localStorage.removeItem('qr-pro-history');
  localStorage.removeItem('qr-pro-scan-history');
  this.displayHistory([]);
  this.updateDashboard();
  this.showToast('Verlauf gelöscht', 'success');
}

exportHistory() {
  const data = {
    qrHistory: this.qrHistory,
    scanHistory: this.scanHistory,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `qr-pro-export-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  this.showToast('Verlauf exportiert', 'success');
}

importHistory(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.qrHistory && data.scanHistory) {
        this.qrHistory = data.qrHistory;
        this.scanHistory = data.scanHistory;
        
        localStorage.setItem('qr-pro-history', JSON.stringify(this.qrHistory));
        localStorage.setItem('qr-pro-scan-history', JSON.stringify(this.scanHistory));
        
        this.updateDashboard();
        this.displayHistory([...this.qrHistory, ...this.scanHistory]);
        this.showToast('Verlauf importiert', 'success');
      } else {
        throw new Error('Ungültiges Datenformat');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showToast('Fehler beim Importieren', 'error');
    }
  };
  
  reader.readAsText(file);
}

deleteHistoryItem(id) {
  this.qrHistory = this.qrHistory.filter(item => (item.id || item.timestamp) != id);
  this.scanHistory = this.scanHistory.filter(item => (item.id || item.timestamp) != id);
  
  localStorage.setItem('qr-pro-history', JSON.stringify(this.qrHistory));
  localStorage.setItem('qr-pro-scan-history', JSON.stringify(this.scanHistory));
  
  this.updateDashboard();
  this.filterHistory(''); // Refresh display
  this.showToast('Eintrag gelöscht', 'success');
}

regenerateQRCode(content) {
  this.navigateToPage('generator');
  const qrContent = document.getElementById('qr-content');
  if (qrContent) {
    qrContent.value = content;
    this.updatePreview();
  }
}

async copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback für ältere Browser
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    this.showToast('In Zwischenablage kopiert', 'success');
  } catch (error) {
    console.error('Copy failed:', error);
    this.showToast('Kopieren fehlgeschlagen', 'error');
  }
}

shareContent(content) {
  if (navigator.share) {
    navigator.share({
      title: 'QR Pro - Geteilter Inhalt',
      text: content
    }).catch(console.error);
  } else {
    this.copyToClipboard(content);
  }
}

showInstallPrompt() {
  if (this.deferredPrompt) {
    const installBtn = document.createElement('button');
    installBtn.textContent = 'App installieren';
    installBtn.className = 'install-prompt';
    installBtn.onclick = () => {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        this.deferredPrompt = null;
        installBtn.remove();
      });
    };
    
    document.body.appendChild(installBtn);
    
    setTimeout(() => {
      if (installBtn.parentNode) {
        installBtn.remove();
      }
    }, 10000);
  }
}

resetSettings() {
  this.settings = {
    theme: 'auto',
    notifications: true,
    autoSave: true
  };
  localStorage.removeItem('qr-pro-settings');
  this.applyTheme();
  this.showToast('Einstellungen zurückgesetzt', 'success');
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
  console.log('🔍 === STARTE QR-SCANNER (VOLLSTÄNDIGE VERSION) ===');
  
  // === SCHRITT 1: Element-Validierung ===
  const scannerContainer = document.getElementById('scanner-container');
  const startBtn = document.getElementById('start-scanner');
  const stopBtn = document.getElementById('stop-scanner');
  const scannerPlaceholder = document.getElementById('scanner-placeholder');
  const scannerOverlay = document.getElementById('scanner-overlay');
  const scannerTips = document.getElementById('scanner-tips');
  
  console.log('📋 Element-Check:', {
    scannerContainer: !!scannerContainer,
    startBtn: !!startBtn,
    stopBtn: !!stopBtn,
    placeholder: !!scannerPlaceholder,
    overlay: !!scannerOverlay
  });
  
  if (!scannerContainer) {
    console.error('❌ Scanner-Container Element nicht gefunden!');
    this.showToast('Scanner-Container fehlt in HTML', 'error');
    return;
  }
  
  if (!startBtn || !stopBtn) {
    console.error('❌ Scanner-Buttons nicht gefunden!');
    this.showToast('Scanner-Buttons fehlen in HTML', 'error');
    return;
  }
  
  console.log('✅ Alle HTML-Elemente gefunden');
  
  try {
    // === SCHRITT 2: Umgebungsprüfung ===
    console.log('🌐 Umgebung:', {
      protocol: location.protocol,
      isSecure: window.isSecureContext,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    // HTTPS-Prüfung
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      throw new Error('HTTPS-Verbindung erforderlich für Kamera-Zugriff');
    }
    
    // === SCHRITT 3: MediaDevices API prüfen ===
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API nicht unterstützt. Browser aktualisieren.');
    }
    
    // === SCHRITT 4: Html5Qrcode Bibliothek prüfen ===
    console.log('🔧 Html5Qrcode Check:', typeof Html5Qrcode !== 'undefined');
    
    if (typeof Html5Qrcode === 'undefined') {
      console.log('⏳ Warte auf Html5Qrcode Bibliothek...');
      await this.waitForHtml5Qrcode();
    }
    
    console.log('✅ Html5Qrcode verfügbar');
    
    // === SCHRITT 5: Verfügbare Kameras auflisten ===
    console.log('🔍 Suche verfügbare Kameras...');
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log(`📹 ${videoDevices.length} Kameras gefunden:`);
    videoDevices.forEach((device, index) => {
      console.log(`  📹 Kamera ${index + 1}: ${device.label || 'Unbekannt'}`);
    });
    
    if (videoDevices.length === 0) {
      throw new Error('Keine Kameras gefunden');
    }
    
    // === SCHRITT 6: Berechtigungen prüfen ===
    console.log('🔐 Prüfe Kamera-Berechtigung...');
    const permissionStatus = await navigator.permissions.query({ name: 'camera' }).catch(() => null);
    if (permissionStatus) {
      console.log('🔐 Berechtigung-Status:', permissionStatus.state);
    }
    
    // === SCHRITT 7: UI für Scanner-Start vorbereiten ===
    this.showToast('📷 Initialisiere Scanner...', 'info', 2000);
    
    // Placeholder ausblenden
    if (scannerPlaceholder) {
      scannerPlaceholder.style.display = 'none';
    }
    
    // Container leeren für Html5Qrcode
    scannerContainer.innerHTML = '';
    
    // === SCHRITT 8: Html5Qrcode Scanner initialisieren ===
    console.log('🔧 Erstelle Html5Qrcode Scanner...');
    this.html5QrCode = new Html5Qrcode("scanner-container");
    console.log('✅ Html5Qrcode Scanner erstellt');
    
    // === SCHRITT 9: Scanner-Konfiguration ===
    const config = {
      fps: 10,
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        // Dynamische Größe: 70% des verfügbaren Platzes, mindestens 250px
        const minEdgePercentage = 0.7;
        const qrboxSize = Math.min(viewfinderWidth, viewfinderHeight) * minEdgePercentage;
        const finalSize = Math.max(qrboxSize, 250);
        
        console.log(`📏 QR-Box Größe: ${Math.round(finalSize)}px (Viewport: ${viewfinderWidth}x${viewfinderHeight})`);
        
        return {
          width: finalSize,
          height: finalSize
        };
      },
      aspectRatio: 1.0,
      disableFlip: false,
      // Erweiterte Konfiguration für bessere Erkennung
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };
    
    console.log('🔧 Scanner-Konfiguration:', config);
    
    // === SCHRITT 10: Kamera-Constraints für hohe Qualität ===
    const cameraConfig = {
      facingMode: "environment", // Rückkamera bevorzugen
      width: { ideal: 1920, min: 1280 }, // Hohe Auflösung für bessere Erkennung
      height: { ideal: 1080, min: 720 }
    };
    
    console.log('📹 Kamera-Konfiguration:', cameraConfig);
    console.log('🚀 Starte Scanner...');
    
    // === SCHRITT 11: Scanner starten ===
    await this.html5QrCode.start(
      cameraConfig,
      config,
      // SUCCESS Callback
      (decodedText, decodedResult) => {
        console.log('🎉 QR-CODE ERFOLGREICH GESCANNT:', decodedText);
        this.onScanSuccess(decodedText, decodedResult);
      },
      // ERROR Callback (wird häufig aufgerufen - das ist normal!)
      (errorMessage) => {
        // Nur echte Fehler loggen, nicht "kein QR gefunden"
        if (!errorMessage.includes('NotFoundException') && 
            !errorMessage.includes('No QR code found') &&
            !errorMessage.includes('QR code parse error')) {
          console.warn('⚠️ Scanner Warnung:', errorMessage);
        }
      }
    );
    
    console.log('✅ Scanner erfolgreich gestartet!');
    
    // === SCHRITT 12: UI nach erfolgreichem Start aktualisieren ===
    this.isScanning = true;
    
    // Buttons umschalten
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) {
      stopBtn.style.display = 'block';
      stopBtn.classList.remove('hidden');
    }
    
    // Overlay einblenden
    if (scannerOverlay) {
      scannerOverlay.classList.remove('hidden');
      // Overlay über das Video legen
      setTimeout(() => {
        const videoElement = scannerContainer.querySelector('video');
        if (videoElement && scannerOverlay.parentNode !== scannerContainer) {
          scannerContainer.appendChild(scannerOverlay);
        }
      }, 1000);
    }
    
    // Tips ausblenden
    if (scannerTips) {
      scannerTips.style.display = 'none';
    }
    
    this.showToast('📷 Scanner aktiv - QR Code in grünen Rahmen positionieren!', 'success', 5000);
    
    // === SCHRITT 13: Scanner-Status loggen ===
    setTimeout(() => {
      console.log('📊 Scanner-Status nach 2 Sekunden:', {
        isScanning: this.isScanning,
        hasVideo: !!scannerContainer.querySelector('video'),
        videoSize: this.getVideoSize(),
        overlayVisible: scannerOverlay ? !scannerOverlay.classList.contains('hidden') : false
      });
    }, 2000);
    
  } catch (error) {
    console.error('💥 SCANNER-FEHLER:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 200) + '...'
    });
    
    // UI zurücksetzen bei Fehler
    this.resetScannerUI();
    
    // Spezifische Fehlerbehandlung
    if (error.message.includes('Permission denied') || error.name === 'NotAllowedError') {
      this.showCameraPermissionHelp();
      this.showToast('Kamera-Berechtigung verweigert', 'error', 8000);
    } else if (error.message.includes('NotFoundError') || error.name === 'NotFoundError') {
      this.showToast('Keine Kamera gefunden - andere Apps schließen?', 'error', 8000);
    } else if (error.message.includes('HTTPS')) {
      this.showToast('HTTPS-Verbindung erforderlich', 'error', 8000);
    } else {
      this.showToast(`Scanner-Fehler: ${error.message}`, 'error', 8000);
    }
  }
}

// === HILFSMETHODEN ===

// Warten auf Html5Qrcode Bibliothek
waitForHtml5Qrcode() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 Sekunden
    
    const checkLibrary = () => {
      attempts++;
      if (typeof Html5Qrcode !== 'undefined') {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('Html5Qrcode Bibliothek konnte nicht geladen werden'));
      } else {
        setTimeout(checkLibrary, 100);
      }
    };
    
    checkLibrary();
  });
}

// Video-Größe ermitteln
getVideoSize() {
  const video = document.querySelector('#scanner-container video');
  if (video) {
    return `${video.videoWidth}x${video.videoHeight}`;
  }
  return 'nicht verfügbar';
}

// Scanner-UI zurücksetzen
resetScannerUI() {
  const scannerContainer = document.getElementById('scanner-container');
  const startBtn = document.getElementById('start-scanner');
  const stopBtn = document.getElementById('stop-scanner');
  const scannerPlaceholder = document.getElementById('scanner-placeholder');
  const scannerOverlay = document.getElementById('scanner-overlay');
  const scannerTips = document.getElementById('scanner-tips');
  
  // Container leeren und Placeholder wieder anzeigen
  if (scannerContainer) {
    scannerContainer.innerHTML = '';
  }
  
  if (scannerPlaceholder) {
    scannerPlaceholder.style.display = 'block';
    if (scannerContainer) {
      scannerContainer.appendChild(scannerPlaceholder);
    }
  }
  
  // Buttons zurücksetzen
  if (startBtn) startBtn.style.display = 'block';
  if (stopBtn) {
    stopBtn.style.display = 'none';
    stopBtn.classList.add('hidden');
  }
  
  // Overlay verstecken
  if (scannerOverlay) {
    scannerOverlay.classList.add('hidden');
  }
  
  // Tips wieder einblenden
  if (scannerTips) {
    scannerTips.style.display = 'block';
  }
  
  this.isScanning = false;
}

// Erfolgreiche Scan-Behandlung
onScanSuccess(decodedText, decodedResult) {
  console.log('📱 Scan erfolgreich verarbeitet:', decodedText);
  
  // Scanner sofort stoppen
  this.stopScanner();
  
  // Ergebnis-UI anzeigen
  const resultDiv = document.getElementById('scan-result');
  const resultText = document.getElementById('result-text');
  const openBtn = document.getElementById('open-result');
  const scanActions = document.getElementById('scan-actions');
  
  if (resultText) {
    resultText.textContent = decodedText;
  }
  
  if (resultDiv) {
    resultDiv.classList.remove('hidden');
    resultDiv.style.display = 'block';
  }
  
  // URL-Erkennung und entsprechende Aktionen
  if (this.isValidURL(decodedText)) {
    console.log('🌐 URL erkannt:', decodedText);
    if (openBtn) {
      openBtn.classList.remove('hidden');
      openBtn.onclick = () => window.open(decodedText, '_blank');
    }
    this.addURLActions(decodedText, scanActions);
  } else {
    console.log('📝 Text erkannt:', decodedText);
    this.addTextActions(decodedText, scanActions);
  }
  
  // "Erneut scannen" Button anzeigen
  const scanAgainBtn = document.getElementById('scan-again');
  if (scanAgainBtn) {
    scanAgainBtn.classList.remove('hidden');
    scanAgainBtn.onclick = () => {
      this.hideScanResult();
      this.startScanner();
    };
  }
  
  // Zu History hinzufügen
  this.addToScanHistory({
    type: 'scanned',
    content: decodedText,
    timestamp: Date.now()
  });
  
  this.showToast('✅ QR Code erfolgreich gescannt!', 'success');
  this.updateDashboard();
}

// URL-Validierung
isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return /^https?:\/\/.+\..+/.test(string);
  }
}

// URL-spezifische Aktionen hinzufügen
addURLActions(url, container) {
  if (!container) return;
  
  const actionsHTML = `
    <div class="extra-actions">
      <button onclick="navigator.clipboard.writeText('${url}')" class="btn btn--sm btn--outline">
        📋 Link kopieren
      </button>
      <button onclick="navigator.share({url: '${url}'})" class="btn btn--sm btn--outline">
        📤 Teilen
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', actionsHTML);
}

// Text-spezifische Aktionen hinzufügen
addTextActions(text, container) {
  if (!container) return;
  
  const actionsHTML = `
    <div class="extra-actions">
      <button onclick="navigator.clipboard.writeText('${text}')" class="btn btn--sm btn--outline">
        📋 Text kopieren
      </button>
      <button onclick="navigator.share({text: '${text}'})" class="btn btn--sm btn--outline">
        📤 Teilen
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', actionsHTML);
}

// Scan-Ergebnis ausblenden
hideScanResult() {
  const resultDiv = document.getElementById('scan-result');
  const scanAgainBtn = document.getElementById('scan-again');
  
  if (resultDiv) {
    resultDiv.classList.add('hidden');
    resultDiv.style.display = 'none';
  }
  
  if (scanAgainBtn) {
    scanAgainBtn.classList.add('hidden');
  }
}

// Kamera-Berechtigung Hilfe anzeigen
showCameraPermissionHelp() {
  const helpDiv = document.createElement('div');
  helpDiv.className = 'permission-help';
  helpDiv.innerHTML = `
    <div class="help-overlay">
      <div class="help-content">
        <h3>📷 Kamera-Berechtigung erforderlich</h3>
        <p><strong>So aktivieren Sie die Kamera-Berechtigung:</strong></p>
        <ol>
          <li>Klicken Sie auf das <strong>🔒 Schloss-Symbol</strong> in der Adressleiste</li>
          <li>Wählen Sie <strong>"Kamera"</strong></li>
          <li>Setzen Sie auf <strong>"Zulassen"</strong></li>
          <li>Laden Sie die Seite neu</li>
        </ol>
        <div class="help-actions">
          <button onclick="location.reload()" class="btn btn--primary">🔄 Seite neu laden</button>
          <button onclick="document.body.removeChild(this.closest('.permission-help'))" class="btn btn--outline">Schließen</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(helpDiv);
  
  // Automatisch nach 15 Sekunden entfernen
  setTimeout(() => {
    if (helpDiv.parentNode) {
      helpDiv.parentNode.removeChild(helpDiv);
    }
  }, 15000);
}

// Hilfsmethode: Warten auf Html5Qrcode
waitForHtml5Qrcode() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 Sekunden
    
    const checkLibrary = () => {
      attempts++;
      if (typeof Html5Qrcode !== 'undefined') {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('Html5Qrcode Bibliothek konnte nicht geladen werden'));
      } else {
        setTimeout(checkLibrary, 100);
      }
    };
    
    checkLibrary();
  });
}

// Vereinfachte Erfolg-Behandlung
onScanSuccess(decodedText, decodedResult) {
  console.log('📱 Scan erfolgreich:', decodedText);
  
  // Scanner stoppen
  this.stopScanner();
  
  // Ergebnis anzeigen
  const resultDiv = document.getElementById('scan-result');
  const resultText = document.getElementById('result-text');
  
  if (resultText) {
    resultText.textContent = decodedText;
  }
  
  if (resultDiv) {
    resultDiv.classList.remove('hidden');
    resultDiv.style.display = 'block';
  }
  
  // URL automatisch öffnen
  if (this.isValidURL(decodedText)) {
    console.log('🌐 URL erkannt, zeige Öffnen-Option');
    this.showURLActions(decodedText);
  }
  
  // Zu History hinzufügen
  this.addToScanHistory({
    type: 'scanned',
    content: decodedText,
    timestamp: Date.now()
  });
  
  this.showToast('✅ QR Code gescannt!', 'success');
  this.updateDashboard();
}

// URL-Erkennung
isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return /^https?:\/\/.+\..+/.test(string);
  }
}

// URL-Aktionen anzeigen
showURLActions(url) {
  const resultDiv = document.getElementById('scan-result');
  if (resultDiv) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'scan-actions';
    actionsDiv.innerHTML = `
      <h4>🌐 Website gefunden</h4>
      <div class="action-buttons">
        <button onclick="window.open('${url}', '_blank')" class="btn btn--primary">
          Website öffnen
        </button>
        <button onclick="navigator.clipboard.writeText('${url}')" class="btn btn--secondary">
          Link kopieren
        </button>
      </div>
    `;
    resultDiv.appendChild(actionsDiv);
  }
}

// Kamera-Berechtigung Hilfe
showCameraPermissionHelp() {
  const helpDiv = document.createElement('div');
  helpDiv.className = 'permission-help';
  helpDiv.innerHTML = `
    <div class="help-content">
      <h3>📷 Kamera-Berechtigung erforderlich</h3>
      <ol>
        <li>Klicken Sie auf das <strong>Schloss-Symbol</strong> in der Adressleiste</li>
        <li>Wählen Sie <strong>"Kamera"</strong></li>
        <li>Setzen Sie auf <strong>"Zulassen"</strong></li>
        <li>Laden Sie die Seite neu</li>
      </ol>
      <button onclick="location.reload()" class="btn btn--primary">🔄 Seite neu laden</button>
    </div>
  `;
  
  document.body.appendChild(helpDiv);
  
  // Nach 10 Sekunden automatisch entfernen
  setTimeout(() => {
    if (helpDiv.parentNode) {
      helpDiv.parentNode.removeChild(helpDiv);
    }
  }, 10000);
}

// Vereinfachte stopScanner Methode
async stopScanner() {
  console.log('🛑 === STOPPE QR-SCANNER ===');
  
  if (this.html5QrCode && this.isScanning) {
    try {
      console.log('🔄 Stoppe Html5Qrcode...');
      await this.html5QrCode.stop();
      await this.html5QrCode.clear();
      console.log('✅ Scanner erfolgreich gestoppt');
    } catch (error) {
      console.warn('⚠️ Warnung beim Scanner stoppen:', error);
    }
  }
  
  // UI zurücksetzen
  this.resetScannerUI();
  
  this.showToast('📷 Scanner gestoppt', 'info');
}

handleScanSuccess(decodedText, decodedResult) {
  console.log('📱 QR-Code Rohdaten:', decodedText);
  
  // Scanner stoppen
  this.stopScanner();
  
  // Validierung ob es wirklich ein QR-Code ist
  if (!decodedText || decodedText.length < 3) {
    console.log('❌ Ungültige QR-Code Daten, ignoriere...');
    this.restartScanner(); // Scanner wieder starten
    return;
  }
  
  // UI aktualisieren
  const resultDiv = document.getElementById('scan-result');
  const resultText = document.getElementById('result-text');
  
  if (resultText) {
    resultText.textContent = decodedText;
  }
  
  if (resultDiv) {
    resultDiv.style.display = 'block';
  }
  
  // Gescannte Daten analysieren und entsprechende Aktion ausführen
  this.handleScannedData(decodedText);
  
  // Zu Scan-History hinzufügen
  this.addToScanHistory({
    type: 'scanned',
    content: decodedText,
    timestamp: Date.now()
  });
  
  this.showToast('QR Code erfolgreich gescannt!', 'success');
  this.updateDashboard();
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
  console.log('📱 QR-Code Rohdaten:', decodedText);
  
  // Scanner stoppen
  this.stopScanner();
  
  // Validierung ob es wirklich ein QR-Code ist
  if (!decodedText || decodedText.length < 3) {
    console.log('❌ Ungültige QR-Code Daten, ignoriere...');
    this.restartScanner(); // Scanner wieder starten
    return;
  }
  
  // UI aktualisieren
  const resultDiv = document.getElementById('scan-result');
  const resultText = document.getElementById('result-text');
  
  if (resultText) {
    resultText.textContent = decodedText;
  }
  
  if (resultDiv) {
    resultDiv.style.display = 'block';
  }
  
  // Gescannte Daten analysieren und entsprechende Aktion ausführen
  this.handleScannedData(decodedText);
  
  // Zu Scan-History hinzufügen
  this.addToScanHistory({
    type: 'scanned',
    content: decodedText,
    timestamp: Date.now()
  });
  
  this.showToast('QR Code erfolgreich gescannt!', 'success');
  this.updateDashboard();
}

// Neue Methode für Datenbehandlung
handleScannedData(data) {
  console.log('🔍 Analysiere gescannte Daten:', data);
  
  // URL-Erkennung
  if (this.isValidURL(data)) {
    console.log('🌐 URL erkannt:', data);
    this.showURLAction(data);
  }
  // E-Mail Erkennung  
  else if (this.isValidEmail(data)) {
    console.log('📧 E-Mail erkannt:', data);
    this.showEmailAction(data);
  }
  // Telefonnummer Erkennung
  else if (this.isValidPhone(data)) {
    console.log('📞 Telefon erkannt:', data);
    this.showPhoneAction(data);
  }
  // Einfacher Text
  else {
    console.log('📝 Text erkannt:', data);
    this.showTextAction(data);
  }
}

// URL-Validierung
isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return string.match(/^https?:\/\/.+\..+/i) !== null;
  }
}

// E-Mail Validierung
isValidEmail(string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string);
}

// Telefon Validierung
isValidPhone(string) {
  return /^[\+]?[0-9\s\-\(\)]{10,}$/.test(string);
}

// URL-Aktion anzeigen
showURLAction(url) {
  const actionDiv = this.createActionDiv();
  actionDiv.innerHTML = `
    <div class="scan-action-content">
      <h4>🌐 Website gefunden</h4>
      <p class="scan-url">${url}</p>
      <div class="scan-actions">
        <button class="btn btn--primary" onclick="window.open('${url}', '_blank')">
          Website öffnen
        </button>
        <button class="btn btn--secondary" onclick="navigator.clipboard.writeText('${url}')">
          Link kopieren
        </button>
      </div>
    </div>
  `;
}

// E-Mail-Aktion anzeigen
showEmailAction(email) {
  const actionDiv = this.createActionDiv();
  actionDiv.innerHTML = `
    <div class="scan-action-content">
      <h4>📧 E-Mail-Adresse gefunden</h4>
      <p class="scan-email">${email}</p>
      <div class="scan-actions">
        <button class="btn btn--primary" onclick="window.open('mailto:${email}')">
          E-Mail senden
        </button>
        <button class="btn btn--secondary" onclick="navigator.clipboard.writeText('${email}')">
          Adresse kopieren
        </button>
      </div>
    </div>
  `;
}

// Telefon-Aktion anzeigen
showPhoneAction(phone) {
  const actionDiv = this.createActionDiv();
  actionDiv.innerHTML = `
    <div class="scan-action-content">
      <h4>📞 Telefonnummer gefunden</h4>
      <p class="scan-phone">${phone}</p>
      <div class="scan-actions">
        <button class="btn btn--primary" onclick="window.open('tel:${phone}')">
          Anrufen
        </button>
        <button class="btn btn--secondary" onclick="navigator.clipboard.writeText('${phone}')">
          Nummer kopieren
        </button>
      </div>
    </div>
  `;
}

// Text-Aktion anzeigen
showTextAction(text) {
  const actionDiv = this.createActionDiv();
  actionDiv.innerHTML = `
    <div class="scan-action-content">
      <h4>📝 Text gefunden</h4>
      <p class="scan-text">${text.length > 100 ? text.substring(0, 100) + '...' : text}</p>
      <div class="scan-actions">
        <button class="btn btn--primary" onclick="navigator.clipboard.writeText('${text}')">
          Text kopieren
        </button>
        <button class="btn btn--secondary" onclick="navigator.share({text: '${text}'}).catch(() => {})">
          Teilen
        </button>
      </div>
    </div>
  `;
}

// Action-Div erstellen
createActionDiv() {
  let actionDiv = document.getElementById('scan-action-div');
  if (!actionDiv) {
    actionDiv = document.createElement('div');
    actionDiv.id = 'scan-action-div';
    actionDiv.className = 'scan-action-container';
    
    const resultDiv = document.getElementById('scan-result');
    if (resultDiv) {
      resultDiv.appendChild(actionDiv);
    }
  }
  return actionDiv;
}

// Scanner neu starten (bei Fehlerkennungen)
restartScanner() {
  setTimeout(() => {
    if (!this.isScanning) {
      this.startScanner();
    }
  }, 1000);
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
