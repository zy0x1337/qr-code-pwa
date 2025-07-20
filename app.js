// QR Pro - Modern QR Code Generator & Scanner PWA
class QRProApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.currentSlide = 0;
    this.userTier = 'premium'; // 'free', 'premium', 'trial'
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
    await this.loadLibraries();
    this.registerServiceWorker();
    this.setupQRTypeHandler();
    this.setupDashboardActions();
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

    // QR Code Scanner Event Listeners - KORRIGIERT
    const startScanner = document.getElementById('start-scanner');
    const stopScanner = document.getElementById('stop-scanner');
    const copyResult = document.getElementById('copy-result');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (startScanner) {
        // Alle alten Event-Listener entfernen
        startScanner.replaceWith(startScanner.cloneNode(true));
        
        // Neuen Event-Listener setzen
        document.getElementById('start-scanner').addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.isScanning) {
                this.startScanner();
            }
        });
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

// (temporär für Testing)
testQRRecognition() {
  console.log('🧪 Teste QR-Erkennung...');
  
  // Simuliere erfolgreichen QR-Scan
  setTimeout(() => {
    this.onScanSuccess('https://www.google.com', null);
  }, 2000);
  
  this.showToast('🧪 Test-Scan in 2 Sekunden...', 'info');
}

// Stat Cards mit echten Daten aktualisieren
updateStatsCards() {
    const stats = {
        qrGenerated: this.getGeneratedCount(),
        qrScanned: this.getScannedCount(),
        todayActive: this.getTodayActivity(),
        templatesCount: this.getTemplatesCount()
    };

    // Karten aktualisieren
    this.updateStatCard('qr-generated', stats.qrGenerated);
    this.updateStatCard('qr-scanned', stats.qrScanned);
    this.updateStatCard('today-active', stats.todayActive);
    this.updateStatCard('templates-count', stats.templatesCount);
}

updateStatCard(cardId, value) {
    const card = document.querySelector(`[data-stat="${cardId}"]`);
    if (card) {
        const numberEl = card.querySelector('.stat-number');
        if (numberEl) {
            this.animateNumber(numberEl, value);
        }
    }
}

animateNumber(element, targetValue) {
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
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

  // QR Code Generation
  async generateQRCode() {
    const content = document.getElementById('qr-content')?.value.trim();
    
    if (!content) {
        this.showToast('Bitte geben Sie Inhalt ein', 'warning');
        return;
    }

    // Sicherstellen, dass QRCode verfügbar ist
    if (!window.QRCode) {
        console.log('QRCode not available, attempting to load...');
        this.showToast('QR-Bibliothek wird geladen...', 'info');
        
        try {
            await this.loadLibraries();
        } catch (error) {
            console.error('Failed to load QRCode library:', error);
            this.showToast('QR-Bibliothek konnte nicht geladen werden', 'error');
            return;
        }
    }

    if (!window.QRCode) {
        console.error('QRCode still not available after loading attempt');
        this.showToast('QR-Generierung nicht verfügbar', 'error');
        return;
    }

    try {
        console.log('🔄 Generating QR Code...');
        const preview = document.querySelector('.qr-preview');
        
        // Vorherigen QR Code löschen
        preview.innerHTML = '';
        
        // Neuen QR Code generieren (qrcodejs API)
        const qr = new QRCode(preview, {
            text: content,
            width: 300,
            height: 300,
            colorDark: document.getElementById('qr-color')?.value || '#000000',
            colorLight: document.getElementById('qr-bg-color')?.value || '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.H
        });

        console.log('✅ QR Code generated successfully');
        this.showToast('QR Code erfolgreich generiert', 'success');
        
    } catch (error) {
        console.error('❌ QR Generation error:', error);
        this.showToast('QR Code Generierung fehlgeschlagen', 'error');
    }
}

generateQRCodePreview() {
    const content = document.getElementById('qr-content')?.value.trim();
    const preview = document.querySelector('.qr-preview');
    
    if (!preview) {
        console.warn('QR Preview Container nicht gefunden');
        return;
    }

    // Leeren Inhalt behandeln
    if (!content) {
        preview.innerHTML = `
            <div class="preview-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <path d="M14 14h7v7h-7z"></path>
                </svg>
                <p>QR Code Vorschau</p>
                <small>Geben Sie Inhalt ein um die Vorschau zu sehen</small>
            </div>
        `;
        return;
    }

    // Prüfen ob QRCode Library verfügbar ist
    if (!window.QRCode) {
        preview.innerHTML = `
            <div class="preview-error">
                <p>⚠️ QR Library wird geladen...</p>
            </div>
        `;
        
        // Versuchen Library zu laden
        this.loadLibraries().then(() => {
            // Nach dem Laden erneut versuchen
            setTimeout(() => this.generateQRCodePreview(), 500);
        });
        return;
    }

    try {
        console.log('🔄 Generiere QR Preview für:', content.substring(0, 50) + '...');
        
        // Loading-Zustand anzeigen
        preview.innerHTML = `
            <div class="preview-loading">
                <div class="loading-spinner"></div>
                <p>Generiere Vorschau...</p>
            </div>
        `;

        // Alten QR Code löschen
        preview.innerHTML = '';
        
        // Container für QR Code erstellen
        const qrContainer = document.createElement('div');
        qrContainer.className = 'qr-preview-container';
        qrContainer.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
            background: white;
            border-radius: 8px;
            padding: 20px;
        `;
        
        preview.appendChild(qrContainer);

        // QR Code Optionen
        const options = {
            text: content,
            width: 200,
            height: 200,
            colorDark: document.getElementById('qr-color')?.value || '#000000',
            colorLight: document.getElementById('qr-bg-color')?.value || '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.M,
            quietZone: 10,
            quietZoneColor: document.getElementById('qr-bg-color')?.value || '#FFFFFF'
        };

        // QR Code erstellen (qrcodejs API)
        const qr = new QRCode(qrContainer, options);

        console.log('✅ QR Preview erfolgreich generiert');
        
        // Content-Info hinzufügen
        const infoDiv = document.createElement('div');
        infoDiv.className = 'preview-info';
        infoDiv.innerHTML = `
            <small>
                <strong>Typ:</strong> ${this.detectContentType(content)} • 
                <strong>Länge:</strong> ${content.length} Zeichen
            </small>
        `;
        infoDiv.style.cssText = `
            text-align: center;
            margin-top: 10px;
            color: #666;
            font-size: 12px;
        `;
        preview.appendChild(infoDiv);

    } catch (error) {
        console.error('❌ QR Preview Fehler:', error);
        preview.innerHTML = `
            <div class="preview-error">
                <p>⚠️ Vorschau fehlgeschlagen</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

detectContentType(content) {
    if (!content) return 'Leer';
    
    // URL Detection
    if (content.startsWith('http://') || content.startsWith('https://')) {
        return 'Website';
    }
    
    // E-Mail Detection
    if (content.startsWith('mailto:') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) {
        return 'E-Mail';
    }
    
    // Telefon Detection
    if (content.startsWith('tel:') || /^[\+\d\s\-\(\)]{10,}$/.test(content)) {
        return 'Telefon';
    }
    
    // WiFi Detection
    if (content.startsWith('WIFI:')) {
        return 'WiFi';
    }
    
    // SMS Detection  
    if (content.startsWith('sms:') || content.startsWith('SMSTO:')) {
        return 'SMS';
    }
    
    // vCard Detection
    if (content.startsWith('BEGIN:VCARD')) {
        return 'Kontakt';
    }
    
    // Geo Location
    if (content.startsWith('geo:') || /^-?\d+\.\d+,-?\d+\.\d+/.test(content)) {
        return 'Standort';
    }
    
    return 'Text';
}

updatePreview() {
    // Preview-Timeout clearen um Performance zu verbessern
    if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
    }
    
    // Verzögerung für bessere Performance bei schnellem Tippen
    this.previewTimeout = setTimeout(() => {
        this.generateQRCodePreview();
    }, 300);
}

  async loadLibraries() {
    try {
        // Verhindere mehrfaches Laden
        if (window.QRCode && this.librariesLoaded) {
            console.log('✅ Libraries already loaded');
            return;
        }

        console.log('📚 Loading QRCode library...');
        
        // QRCode.js für Generierung laden - KORREKTE URL
        if (!window.QRCode) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
        }
        
        // Html5Qrcode für Scanning (bereits verfügbar)
        if (!window.Html5Qrcode) {
            await this.loadScript('https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js');
        }
        
        // Prüfen ob QRCode verfügbar ist
        if (typeof window.QRCode !== 'undefined') {
            console.log('✅ QRCode library loaded successfully');
            console.log('QRCode methods:', Object.keys(window.QRCode));
            this.librariesLoaded = true;
        } else {
            throw new Error('QRCode library not available after loading');
        }
        
    } catch (error) {
        console.error('❌ Failed to load libraries:', error);
        this.showToast('QR-Bibliotheken konnten nicht geladen werden', 'error');
    }
}

loadScript(src) {
    return new Promise((resolve, reject) => {
        // Prüfen ob Script bereits existiert (exakte URL)
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            console.log(`Script already exists: ${src}`);
            resolve();
            return;
        }
        
        // Prüfen ob Library bereits global verfügbar ist
        if (src.includes('qrcode') && window.QRCode) {
            console.log('QRCode already available globally');
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`✅ Loaded: ${src}`);
            resolve();
        };
        script.onerror = (error) => {
            console.error(`❌ Failed to load: ${src}`, error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

// Download-Funktion
async downloadQRCode(format = 'png') {
    const qrCanvas = document.querySelector('.qr-preview canvas');
    if (!qrCanvas) {
        this.showDownloadError('Kein QR Code zum Herunterladen verfügbar');
        return Promise.reject('No QR code available');
    }
    
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const baseFilename = this.downloadFilename || 'qr-code';
        const filename = `${baseFilename}-${timestamp}`;
        let dataUrl;
        
        switch (format.toLowerCase()) {
            case 'png':
                dataUrl = qrCanvas.toDataURL('image/png');
                this.triggerDownload(dataUrl, `${filename}.png`);
                break;
                
            case 'jpg':
            case 'jpeg':
                // JPG mit weißem Hintergrund
                const tempCanvas = this.createTempCanvas(qrCanvas);
                dataUrl = tempCanvas.toDataURL('image/jpeg', (this.downloadQuality || 95) / 100);
                this.triggerDownload(dataUrl, `${filename}.jpg`);
                break;
                
            case 'svg':
                dataUrl = await this.generateSVG();
                this.triggerDownload(dataUrl, `${filename}.svg`);
                break;
                
            case 'pdf':
                await this.generatePDF(`${filename}.pdf`);
                break;
                
            case 'eps':
                await this.generateEPS(`${filename}.eps`);
                break;
                
            default:
                dataUrl = qrCanvas.toDataURL('image/png');
                this.triggerDownload(dataUrl, `${filename}.png`);
        }
        
        // Erfolgs-Toast
        if (window.qrApp && typeof window.qrApp.showToast === 'function') {
            window.qrApp.showToast(
                `QR Code als ${format.toUpperCase()} heruntergeladen!`, 
                'success', 
                3000
            );
        }
        
        // Download-Statistiken aktualisieren
        this.trackDownload(format, filename);
        
        return Promise.resolve();
        
    } catch (error) {
        console.error('Download-Fehler:', error);
        this.showDownloadError(`Fehler beim Herunterladen als ${format.toUpperCase()}`);
        return Promise.reject(error);
    }
}

// Hilfsmethode: Temporäres Canvas mit weißem Hintergrund
createTempCanvas(sourceCanvas) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
    
    // Weißer Hintergrund für JPG
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // QR Code drauf zeichnen
    tempCtx.drawImage(sourceCanvas, 0, 0);
    
    return tempCanvas;
}

  // QR Code Scanner
  async startScanner() {
    try {
        console.log('📷 Starte QR Scanner...');
        
        // SOFORTIGE UI-Aktualisierung
        this.isScanning = true;
        this.updateScannerUI();
        
        // Prüfen ob bereits ein Scanner läuft
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                await this.html5QrCode.clear();
            } catch (e) {
                console.log('Alter Scanner cleanup:', e);
            }
        }
        
        // Prüfen ob Html5Qrcode verfügbar ist
        if (!window.Html5Qrcode) {
            throw new Error('Html5Qrcode Library nicht verfügbar');
        }

        // Scanner-Container prüfen
        const scannerContainer = document.getElementById('scanner-container');
        if (!scannerContainer) {
            throw new Error('Scanner-Container nicht gefunden');
        }

        // Container leeren und Placeholder verstecken
        const placeholder = scannerContainer.querySelector('.scanner-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Neue Html5QrCode Instanz
        this.html5QrCode = new Html5Qrcode("scanner-container");

        // Scanner-Konfiguration
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        // Scanner starten
        await this.html5QrCode.start(
            { facingMode: "environment" },
            config,
            // SUCCESS CALLBACK
            (decodedText, decodedResult) => {
                console.log('✅ QR Code erkannt:', decodedText);
                this.onScanSuccess(decodedText, decodedResult);
            },
            // ERROR CALLBACK - KORRIGIERT
            (errorMessage) => {
                // Normale Scan-Fehler ignorieren
                if (errorMessage && !errorMessage.includes('No MultiFormat Readers')) {
                    console.log('Scanner Fehler:', errorMessage);
                }
            }
        );

        console.log('✅ Scanner erfolgreich gestartet');
        this.showToast('Scanner aktiv - QR Code vor die Kamera halten', 'success');

    } catch (error) {
        console.error('❌ Scanner-Start fehlgeschlagen:', error);
        
        // UI zurücksetzen bei Fehler
        this.isScanning = false;
        this.updateScannerUI();
        
        this.showToast(`Scanner-Fehler: ${error.message}`, 'error');
        this.handleScannerError(error);
    }
}

handleScannerError(error) {
    console.error('Scanner Error:', error);
    
    // Sichere String-Konvertierung
    const errorMsg = error?.message || error?.name || String(error);
    
    // Kamera-Berechtigung verweigert
    if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
        this.showCameraPermissionHelp();
        return;
    }
    
    // Keine Kamera gefunden
    if (errorMsg.includes('NotFoundError') || errorMsg.includes('No camera found')) {
        this.showToast('Keine Kamera gefunden', 'error');
        return;
    }
    
    // Kamera bereits in Verwendung
    if (errorMsg.includes('NotReadableError') || errorMsg.includes('already in use')) {
        this.showToast('Kamera wird bereits verwendet', 'error');
        return;
    }
    
    // Allgemeiner Fehler
    this.showToast('Scanner konnte nicht gestartet werden', 'error');
}

updateScannerUI() {
    const startBtn = document.getElementById('start-scanner');
    const stopBtn = document.getElementById('stop-scanner');
    const placeholder = document.querySelector('.scanner-placeholder');
    
    if (this.isScanning) {
        // Scanner läuft
        if (startBtn) {
            startBtn.textContent = 'Scanner läuft...';
            startBtn.disabled = true;
            startBtn.style.display = 'none';
        }
        if (stopBtn) {
            stopBtn.style.display = 'inline-block';
            stopBtn.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    } else {
        // Scanner gestoppt
        if (startBtn) {
            startBtn.textContent = 'Scanner starten';
            startBtn.disabled = false;
            startBtn.style.display = 'inline-block';
        }
        if (stopBtn) {
            stopBtn.style.display = 'none';
            stopBtn.classList.add('hidden');
        }
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
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

async stopScanner() {
    console.log('🛑 Stoppe Scanner...');
    
    try {
        if (this.html5QrCode && this.isScanning) {
            await this.html5QrCode.stop();
            await this.html5QrCode.clear();
        }
    } catch (error) {
        console.warn('Scanner-Stop Warnung:', error);
    } finally {
        // UI immer zurücksetzen
        this.isScanning = false;
        this.html5QrCode = null;
        this.updateScannerUI();
    }
    
    console.log('✅ Scanner gestoppt');
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
    const qrContent = document.getElementById('qr-content');
    const qrType = document.getElementById('qr-type');
    
    if (!qrContent || !qrType) return;
    
    const placeholders = {
        'text': 'Geben Sie Ihren Text ein...',
        'url': 'https://www.beispiel.de',
        'email': 'mailto:name@beispiel.de',
        'phone': 'tel:+49123456789',
        'sms': 'sms:+49123456789:Ihre Nachricht',
        'wifi': 'WIFI:T:WPA;S:NetzwerkName;P:Passwort;;',
        'vcard': 'BEGIN:VCARD\nVERSION:3.0\nFN:Max Mustermann\nEND:VCARD'
    };
    
    qrContent.placeholder = placeholders[qrType.value] || placeholders.text;
    
    // Automatische Vorschau-Aktualisierung
    this.updatePreview();
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

  // NEUE METHODE: QR-Type Change Handler (in Ihre Haupt-App-Klasse einfügen)
setupQRTypeHandler() {
    const qrTypeSelect = document.getElementById('qr-type');
    const qrContentTextarea = document.getElementById('qr-content');
    
    if (!qrTypeSelect || !qrContentTextarea) return;
    
    qrTypeSelect.addEventListener('change', (e) => {
        this.handleQRTypeChange(e.target.value);
    });
}

handleQRTypeChange(qrType) {
    const qrContentTextarea = document.getElementById('qr-content');
    const contentSuggestions = document.getElementById('content-suggestions');
    
    // Platzhalter und Vorschläge je nach Typ anpassen
    switch (qrType) {
        case 'url':
            qrContentTextarea.placeholder = 'https://example.com';
            this.showContentSuggestions([
                'https://www.google.com',
                'https://www.wikipedia.org',
                'https://www.youtube.com'
            ]);
            break;
            
        case 'text':
            qrContentTextarea.placeholder = 'Ihr Text hier eingeben...';
            this.showContentSuggestions([
                'Hallo Welt!',
                'Kontaktieren Sie uns!',
                'Vielen Dank!'
            ]);
            break;
            
        case 'email':
            qrContentTextarea.placeholder = 'mailto:beispiel@email.com?subject=Betreff&body=Nachricht';
            this.showContentSuggestions([
                'mailto:info@firma.de',
                'mailto:kontakt@beispiel.com?subject=Anfrage',
                'mailto:support@service.de?subject=Hilfe&body=Hallo'
            ]);
            break;
            
        case 'phone':
            qrContentTextarea.placeholder = 'tel:+49123456789';
            this.showContentSuggestions([
                'tel:+49123456789',
                'tel:+4930123456',
                'tel:+491701234567'
            ]);
            break;
            
        case 'sms':
            qrContentTextarea.placeholder = 'sms:+49123456789?body=Ihre Nachricht';
            this.showContentSuggestions([
                'sms:+49123456789?body=Hallo',
                'sms:+49123456789?body=Danke für Ihren Besuch!',
                'sms:+49123456789?body=Kontaktanfrage'
            ]);
            break;
            
        case 'wifi':
            qrContentTextarea.placeholder = 'WIFI:T:WPA;S:NetzwerkName;P:Passwort;H:false;;';
            this.showContentSuggestions([
                'WIFI:T:WPA;S:MeinWLAN;P:123456789;H:false;;',
                'WIFI:T:WEP;S:GastWLAN;P:gast123;H:false;;',
                'WIFI:T:nopass;S:FreiesWLAN;P:;H:false;;'
            ]);
            break;
            
        case 'vcard':
            const vcardTemplate = `BEGIN:VCARD
VERSION:3.0
FN:Max Mustermann
ORG:Muster GmbH
TEL:+49123456789
EMAIL:max@beispiel.de
URL:https://www.beispiel.de
END:VCARD`;
            qrContentTextarea.placeholder = vcardTemplate;
            this.showContentSuggestions([vcardTemplate]);
            break;
            
        default:
            qrContentTextarea.placeholder = 'Geben Sie den Inhalt für Ihren QR Code ein...';
            this.clearContentSuggestions();
    }
    
    // QR Code automatisch aktualisieren wenn Inhalt vorhanden
    if (qrContentTextarea.value.trim()) {
        this.updatePreview();
    }
}

// Hilfsmethode: Content-Vorschläge anzeigen
showContentSuggestions(suggestions) {
    const contentSuggestions = document.getElementById('content-suggestions');
    if (!contentSuggestions) return;
    
    contentSuggestions.innerHTML = suggestions.map(suggestion => `
        <button type="button" class="suggestion-btn" data-suggestion="${suggestion}">
            ${suggestion.length > 50 ? suggestion.substring(0, 50) + '...' : suggestion}
        </button>
    `).join('');
    
    // Event Listeners für Vorschläge
    contentSuggestions.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('qr-content').value = btn.dataset.suggestion;
            this.updatePreview();
        });
    });
    
    contentSuggestions.style.display = 'block';
}

// Hilfsmethode: Vorschläge ausblenden
clearContentSuggestions() {
    const contentSuggestions = document.getElementById('content-suggestions');
    if (contentSuggestions) {
        contentSuggestions.style.display = 'none';
        contentSuggestions.innerHTML = '';
    }
}

// Dashboard Schnellaktionen Setup
setupDashboardActions() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const action = card.dataset.action;
            this.handleDashboardAction(action);
        });
    });
}

// Dashboard Aktionen Handler
handleDashboardAction(action) {
    switch (action) {
        case 'open-generator':
            this.openGenerator();
            break;
        case 'start-scanner':
            this.startScanner();
            break;
        case 'show-templates':
            this.showTemplates();
            break;
        case 'show-history':
            this.showHistory();
            break;
        default:
            console.log('Unbekannte Aktion:', action);
    }
}

// Seiten-Navigation Methode
showPage(pageId) {
    // Alle Seiten ausblenden
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Gewünschte Seite anzeigen
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Navigation-Items aktualisieren
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
    
    // URL aktualisieren
    window.location.hash = pageId;
}

// QR Generator öffnen
openGenerator() {
    // Zur Generator-Seite wechseln
    this.showPage('generator');
    
    // Focus auf Inhalt-Textarea setzen
    setTimeout(() => {
        const contentInput = document.getElementById('qr-content');
        if (contentInput) {
            contentInput.focus();
        }
    }, 300);
    
    // Toast-Feedback
    if (typeof this.showToast === 'function') {
        this.showToast('QR Generator geöffnet', 'info', 2000);
    }
}

// QR Scanner starten
async startScanner() {
    try {
        console.log('📷 Starte QR Scanner...');
        
        // SOFORTIGE UI-Aktualisierung
        this.isScanning = true;
        this.updateScannerUI();
        
        // Prüfen ob bereits ein Scanner läuft
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                await this.html5QrCode.clear();
            } catch (e) {
                console.log('Alter Scanner cleanup:', e);
            }
        }
        
        // Prüfen ob Html5Qrcode verfügbar ist
        if (!window.Html5Qrcode) {
            throw new Error('Html5Qrcode Library nicht verfügbar');
        }

        // Scanner-Container prüfen
        const scannerContainer = document.getElementById('scanner-container');
        if (!scannerContainer) {
            throw new Error('Scanner-Container nicht gefunden');
        }

        // Container leeren
        const placeholder = scannerContainer.querySelector('.scanner-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Neue Html5QrCode Instanz
        this.html5QrCode = new Html5Qrcode("scanner-container");

        // Scanner-Konfiguration
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        // Scanner starten
        await this.html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                console.log('✅ QR Code erkannt:', decodedText);
                this.onScanSuccess(decodedText, decodedResult);
            },
            (errorMessage) => {
                // Normale Scan-Fehler ignorieren
                if (errorMessage && !errorMessage.includes('No MultiFormat Readers')) {
                    console.log('Scanner Fehler:', errorMessage);
                }
            }
        );

        console.log('✅ Scanner erfolgreich gestartet');
        this.showToast('Scanner aktiv - QR Code vor die Kamera halten', 'success');

    } catch (error) {
        console.error('❌ Scanner-Start fehlgeschlagen:', error);
        
        // UI zurücksetzen bei Fehler
        this.isScanning = false;
        this.updateScannerUI();
        
        this.showToast(`Scanner-Fehler: ${error.message}`, 'error');
        this.handleScannerError(error);
    }
}

// Templates anzeigen
showTemplates() {
    // Template-Modal oder Generator mit Template-Auswahl öffnen
    this.showPage('generator');
    
    // Template-Button in erweiterten Features aktivieren
    setTimeout(() => {
        const templateBtn = document.querySelector('[data-feature="templates"]');
        if (templateBtn) {
            templateBtn.click();
        }
    }, 300);
    
    // Template-Modal erstellen
    this.createTemplateModal();
    
    // Toast-Feedback
    if (typeof this.showToast === 'function') {
        this.showToast('Templates werden geladen...', 'info', 2000);
    }
}

// Verlauf anzeigen
showHistory() {
    // Zur History-Seite wechseln
    this.showPage('history');
    
    // History aktualisieren
    this.refreshHistory();
    
    // Toast-Feedback
    if (typeof this.showToast === 'function') {
        this.showToast('Verlauf geöffnet', 'info', 2000);
    }
}

// Template-Modal erstellen
createTemplateModal() {
    // Prüfen ob Modal bereits existiert
    if (document.getElementById('template-modal')) return;
    
    const templateModal = document.createElement('div');
    templateModal.id = 'template-modal';
    templateModal.className = 'modal';
    templateModal.innerHTML = `
        <div class="modal-content template-modal-content">
            <div class="modal-header">
                <h2>QR Code Templates</h2>
                <button class="modal-close" id="close-template-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="template-categories">
                    <button class="template-category active" data-category="business">
                        <span class="category-icon">💼</span>
                        Business
                    </button>
                    <button class="template-category" data-category="social">
                        <span class="category-icon">📱</span>
                        Social Media
                    </button>
                    <button class="template-category" data-category="personal">
                        <span class="category-icon">👤</span>
                        Persönlich
                    </button>
                    <button class="template-category" data-category="event">
                        <span class="category-icon">🎉</span>
                        Events
                    </button>
                </div>
                
                <div class="template-grid" id="template-grid">
                    ${this.generateTemplateItems('business')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(templateModal);
    
    // Event Listeners für Template-Modal
    this.setupTemplateModalEvents();
    
    // Modal anzeigen
    templateModal.style.display = 'flex';
}

// Template-Items generieren
generateTemplateItems(category) {
    const templates = {
        business: [
            {
                name: 'Visitenkarte',
                description: 'Komplette Kontaktdaten',
                icon: '👤',
                type: 'vcard',
                content: `BEGIN:VCARD
VERSION:3.0
FN:Max Mustermann
ORG:Muster GmbH
TEL:+49123456789
EMAIL:max@beispiel.de
URL:https://www.beispiel.de
END:VCARD`
            },
            {
                name: 'Website',
                description: 'Firmen-Homepage',
                icon: '🌐',
                type: 'url',
                content: 'https://www.ihr-unternehmen.de'
            },
            {
                name: 'E-Mail Kontakt',
                description: 'Direkte E-Mail',
                icon: '📧',
                type: 'email',
                content: 'mailto:kontakt@firma.de?subject=Anfrage'
            },
            {
                name: 'WiFi Zugang',
                description: 'WLAN-Zugangsdaten',
                icon: '📶',
                type: 'wifi',
                content: 'WIFI:T:WPA;S:Firma-WLAN;P:passwort123;H:false;;'
            }
        ],
        social: [
            {
                name: 'Instagram Profil',
                description: 'Instagram Account',
                icon: '📷',
                type: 'url',
                content: 'https://instagram.com/ihr_account'
            },
            {
                name: 'LinkedIn Profil',
                description: 'Berufliches Netzwerk',
                icon: '💼',
                type: 'url',
                content: 'https://linkedin.com/in/ihr-profil'
            },
            {
                name: 'WhatsApp Chat',
                description: 'Direkte Nachricht',
                icon: '💬',
                type: 'url',
                content: 'https://wa.me/49123456789?text=Hallo'
            },
            {
                name: 'YouTube Kanal',
                description: 'Video-Content',
                icon: '📺',
                type: 'url',
                content: 'https://youtube.com/c/ihr-kanal'
            }
        ],
        personal: [
            {
                name: 'Persönliche Kontakte',
                description: 'Private Visitenkarte',
                icon: '👨‍👩‍👧‍👦',
                type: 'vcard',
                content: `BEGIN:VCARD
VERSION:3.0
FN:Max Mustermann
TEL:+49123456789
EMAIL:max@private.de
END:VCARD`
            },
            {
                name: 'SMS Nachricht',
                description: 'Vordefinierte SMS',
                icon: '💌',
                type: 'sms',
                content: 'sms:+49123456789?body=Hallo, hier ist meine Nachricht!'
            }
        ],
        event: [
            {
                name: 'Event-Einladung',
                description: 'Veranstaltungslink',
                icon: '🎉',
                type: 'url',
                content: 'https://eventbrite.com/e/ihr-event'
            },
            {
                name: 'Kalender-Termin',
                description: 'Termin hinzufügen',
                icon: '📅',
                type: 'text',
                content: 'Termin: Workshop am 15.12.2024 um 14:00 Uhr'
            }
        ]
    };
    
    const categoryTemplates = templates[category] || templates.business;
    
    return categoryTemplates.map(template => `
        <div class="template-item" data-template='${JSON.stringify(template)}'>
            <div class="template-icon">${template.icon}</div>
            <div class="template-info">
                <h4>${template.name}</h4>
                <p>${template.description}</p>
            </div>
            <button class="btn btn--sm btn--primary use-template-btn">
                Verwenden
            </button>
        </div>
    `).join('');
}

// Template-Modal Events Setup
setupTemplateModalEvents() {
    const templateModal = document.getElementById('template-modal');
    
    // Modal schließen
    const closeBtn = document.getElementById('close-template-modal');
    closeBtn.addEventListener('click', () => {
        templateModal.style.display = 'none';
    });
    
    // Outside-Click zum Schließen
    templateModal.addEventListener('click', (e) => {
        if (e.target === templateModal) {
            templateModal.style.display = 'none';
        }
    });
    
    // Kategorie-Wechsel
    const categoryBtns = document.querySelectorAll('.template-category');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Aktive Kategorie wechseln
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Template-Grid aktualisieren
            const category = btn.dataset.category;
            const templateGrid = document.getElementById('template-grid');
            templateGrid.innerHTML = this.generateTemplateItems(category);
            
            // Event Listeners für neue Template-Items
            this.setupTemplateItemEvents();
        });
    });
    
    // Template-Item Events
    this.setupTemplateItemEvents();
}

// Template-Item Events Setup
setupTemplateItemEvents() {
    const templateItems = document.querySelectorAll('.template-item');
    
    templateItems.forEach(item => {
        const useBtn = item.querySelector('.use-template-btn');
        useBtn.addEventListener('click', () => {
            const templateData = JSON.parse(item.dataset.template);
            this.useTemplate(templateData);
        });
    });
}

// Template verwenden
useTemplate(templateData) {
    // Modal schließen
    const templateModal = document.getElementById('template-modal');
    templateModal.style.display = 'none';
    
    // Zur Generator-Seite wechseln falls nicht bereits dort
    this.showPage('generator');
    
    // Template-Daten in Generator einfügen
    setTimeout(() => {
        const qrTypeSelect = document.getElementById('qr-type');
        const qrContentTextarea = document.getElementById('qr-content');
        
        if (qrTypeSelect) {
            qrTypeSelect.value = templateData.type;
            
            // QR-Type Change Event triggern
            const changeEvent = new Event('change', { bubbles: true });
            qrTypeSelect.dispatchEvent(changeEvent);
        }
        
        if (qrContentTextarea) {
            qrContentTextarea.value = templateData.content;
            
            // Content Change Event triggern für Live-Preview
            const inputEvent = new Event('input', { bubbles: true });
            qrContentTextarea.dispatchEvent(inputEvent);
        }
        
        // QR Code generieren
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            generateBtn.click();
        }
        
        // Erfolg-Toast
        if (typeof this.showToast === 'function') {
            this.showToast(`Template "${templateData.name}" wurde angewendet!`, 'success', 3000);
        }
    }, 300);
}

// History aktualisieren
refreshHistory() {
    // History-Daten aus localStorage laden
    const historyItems = JSON.parse(localStorage.getItem('qr-history') || '[]');
    const historyList = document.getElementById('history-list');
    
    if (!historyList) return;
    
    if (historyItems.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Keine QR Codes im Verlauf</p>
            </div>
        `;
        return;
    }
    
    // History-Items rendern
    historyList.innerHTML = historyItems.map(item => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-icon">
                ${this.getTypeIcon(item.type)}
            </div>
            <div class="history-content">
                <div class="history-title">${item.title || item.type}</div>
                <div class="history-preview">${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}</div>
                <div class="history-date">${new Date(item.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="history-actions">
                <button class="btn btn--sm btn--outline" onclick="app.regenerateFromHistory('${item.id}')">
                    Erneut verwenden
                </button>
            </div>
        </div>
    `).join('');
}

// Type-Icon ermitteln
getTypeIcon(type) {
    const icons = {
        url: '🌐',
        text: '📝',
        email: '📧',
        phone: '📞',
        sms: '💬',
        wifi: '📶',
        vcard: '👤'
    };
    return icons[type] || '📄';
}

// Aus History regenerieren
regenerateFromHistory(itemId) {
    const historyItems = JSON.parse(localStorage.getItem('qr-history') || '[]');
    const item = historyItems.find(h => h.id === itemId);
    
    if (!item) return;
    
    // Template-ähnliche Struktur erstellen
    const templateData = {
        name: item.title || item.type,
        type: item.type,
        content: item.content
    };
    
    this.useTemplate(templateData);
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

// PWA Install Funktionalität
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        window.addEventListener('appinstalled', () => {
            this.hideInstallPrompt();
            this.showInstallSuccess();
        });

        this.setupEventListeners();
    }

    showInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        const floatingBtn = document.getElementById('floating-install');
        const navbarBtn = document.getElementById('navbar-install');
        
        if (prompt) prompt.classList.add('show');
        if (floatingBtn) floatingBtn.classList.add('show');
        if (navbarBtn) navbarBtn.style.display = 'flex';
    }

    hideInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        const floatingBtn = document.getElementById('floating-install');
        const navbarBtn = document.getElementById('navbar-install');
        
        if (prompt) prompt.classList.remove('show');
        if (floatingBtn) floatingBtn.classList.remove('show');
        if (navbarBtn) navbarBtn.style.display = 'none';
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        this.deferredPrompt = null;
        this.hideInstallPrompt();
    }

    showInstallSuccess() {
        const success = document.getElementById('install-success');
        if (success) {
            success.classList.add('show');
            setTimeout(() => {
                success.classList.remove('show');
            }, 3000);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('#install-app, #floating-install, #navbar-install').forEach(btn => {
            btn.addEventListener('click', () => this.installApp());
        });

        document.getElementById('dismiss-install')?.addEventListener('click', () => {
            this.hideInstallPrompt();
        });

        document.getElementById('maybe-later')?.addEventListener('click', () => {
            this.hideInstallPrompt();
        });
    }
}

// PWA Installer initialisieren (ganz am Ende der app.js)
document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller();
});

// QR Code Farben & Größe Funktionalität
class QRCustomization {
    constructor() {
        this.qrColor = '#000000';
        this.qrBgColor = '#ffffff';
        this.qrSize = '300';

    // NEUE Logo-Eigenschaften
    this.logoFile = null;
    this.logoSize = 20; // Prozent der QR-Code-Größe
    this.logoPosition = 'center';
    this.logoShape = 'square';
    this.logoPadding = 10;
    this.logoEnabled = false;
        
        // 2025 Moderne Farbpaletten
        this.colorPresets = {
            classic: [
                { color: '#000000', name: 'Schwarz' },
                { color: '#6366f1', name: 'Indigo' },
                { color: '#ef4444', name: 'Rot' },
                { color: '#10b981', name: 'Grün' }
            ],
            modern: [
                { color: '#1e293b', name: 'Slate Dark' },
                { color: '#7c3aed', name: 'Violet' },
                { color: '#0ea5e9', name: 'Sky Blue' },
                { color: '#f59e0b', name: 'Amber' }
            ],
            premium: [
                { color: '#0f172a', name: 'Dark Navy' },
                { color: '#be123c', name: 'Rose' },
                { color: '#059669', name: 'Emerald' },
                { color: '#dc2626', name: 'Red' }
            ]
        };

        this.bgColorPresets = {
            neutral: [
                { color: '#ffffff', name: 'Weiß' },
                { color: '#f8fafc', name: 'Slate 50' },
                { color: '#f1f5f9', name: 'Slate 100' },
                { color: '#e2e8f0', name: 'Slate 200' }
            ],
            warm: [
                { color: '#fefce8', name: 'Yellow 50' },
                { color: '#fef3c7', name: 'Amber 100' },
                { color: '#fed7aa', name: 'Orange 200' },
                { color: '#fecaca', name: 'Red 200' }
            ],
            cool: [
                { color: '#eff6ff', name: 'Blue 50' },
                { color: '#dbeafe', name: 'Blue 100' },
                { color: '#e0f2fe', name: 'Sky 100' },
                { color: '#ecfdf5', name: 'Green 50' }
            ],
            elegant: [
                { color: '#fafafa', name: 'Neutral 50' },
                { color: '#f4f4f5', name: 'Zinc 100' },
                { color: '#e4e4e7', name: 'Zinc 200' },
                { color: '#a1a1aa', name: 'Zinc 400' }
            ]
        };

        this.currentColorCategory = 'classic';
        this.currentBgCategory = 'neutral';
        
        this.init();
    }

    init() {
        this.setupColorPresets();
        this.setupBgColorPresets();
        this.setupSizeSelector();
        this.setupColorPickers();
        this.setupCategorySelectors();
        this.setupLogoFunctionality();
        // Download Event Listeners initialisieren
    setTimeout(() => {
        this.attachDownloadEventListeners();
    }, 100);
    }

    // Erweiterte Farbenvorauswahl Setup
    setupColorPresets() {
        const colorPresetsContainer = document.querySelector('.color-presets');
        if (!colorPresetsContainer) return;

        this.renderColorPresets();
        
        // Event Listeners für Farbpresets
        colorPresetsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-preset')) {
                const color = e.target.dataset.color;
                this.selectColorPreset(e.target, color);
            }
        });

        const qrColorInput = document.getElementById('qr-color');
        if (qrColorInput) {
            qrColorInput.addEventListener('input', () => {
                this.updateColorFromInput();
            });
        }
    }

    // NEUE FUNKTION: Hintergrundfarben-Presets Setup
    setupBgColorPresets() {
        // Container für Hintergrundfarbe-Presets erstellen falls nicht vorhanden
        const bgColorGroup = document.querySelector('.form-group:has(#qr-bg-color)') ||
                           document.querySelector('label[for="qr-bg-color"]')?.parentElement;
        
        if (!bgColorGroup) return;

        // Hintergrundfarbe-Presets Container hinzufügen
        const bgPresetsContainer = document.createElement('div');
        bgPresetsContainer.className = 'bg-color-presets-wrapper';
        bgPresetsContainer.innerHTML = `
            <div class="bg-category-selector">
                <label class="category-label">Hintergrund-Stil:</label>
                <select class="bg-category-select form-control">
                    <option value="neutral">Neutral</option>
                    <option value="warm">Warm</option>
                    <option value="cool">Cool</option>
                    <option value="premium">Elegant</option>
                    <option value="custom">Eigene Farbe</option>
                </select>
            </div>
            <div class="bg-color-presets"></div>
        `;

        bgColorGroup.appendChild(bgPresetsContainer);
        
        this.renderBgColorPresets();
        
        // Event Listeners für Hintergrund-Presets
        const bgPresetsElement = bgPresetsContainer.querySelector('.bg-color-presets');
        bgPresetsElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('bg-color-preset')) {
                const color = e.target.dataset.color;
                this.selectBgColorPreset(e.target, color);
            }
        });

        // Category Selector für Hintergrundfarben
        const bgCategorySelect = bgPresetsContainer.querySelector('.bg-category-select');
        bgCategorySelect.addEventListener('change', (e) => {
            this.currentBgCategory = e.target.value;
            this.renderBgColorPresets();
        });

        const qrBgColorInput = document.getElementById('qr-bg-color');
        if (qrBgColorInput) {
            qrBgColorInput.addEventListener('input', () => {
                this.updateBgColorFromInput();
            });
        }
    }

    // Kategorie-Selektoren Setup
    setupCategorySelectors() {
        // Kategorie-Selektor für Hauptfarben hinzufügen
        const colorGroup = document.querySelector('.form-group:has(#qr-color)') ||
                          document.querySelector('label[for="qr-color"]')?.parentElement;
        
        if (colorGroup && !colorGroup.querySelector('.color-category-select')) {
            const categorySelector = document.createElement('div');
            categorySelector.className = 'color-category-selector';
            categorySelector.innerHTML = `
                <label class="category-label">Farb-Stil:</label>
                <select class="color-category-select form-control">
                    <option value="classic">Klassisch</option>
                    <option value="modern">Modern</option>
                    <option value="premium">Premium</option>
                </select>
            `;
            
            const colorPicker = colorGroup.querySelector('.color-picker');
            if (colorPicker) {
                colorPicker.insertBefore(categorySelector, colorPicker.firstChild);
            }

            // Event Listener für Kategorie-Wechsel
            const colorCategorySelect = categorySelector.querySelector('.color-category-select');
            colorCategorySelect.addEventListener('change', (e) => {
                this.currentColorCategory = e.target.value;
                this.renderColorPresets();
            });
        }
    }

    // Farb-Presets rendern
    renderColorPresets() {
        const colorPresetsContainer = document.querySelector('.color-presets');
        if (!colorPresetsContainer) return;

        const presets = this.colorPresets[this.currentColorCategory] || this.colorPresets.classic;
        
        colorPresetsContainer.innerHTML = presets.map(preset => `
            <button class="color-preset advanced-preset" 
                    data-color="${preset.color}" 
                    style="background: ${preset.color}" 
                    title="${preset.name}"
                    type="button">
            </button>
        `).join('');

        // Standard-Preset aktivieren
        const defaultPreset = colorPresetsContainer.querySelector(`[data-color="${this.qrColor}"]`);
        if (defaultPreset) {
            defaultPreset.classList.add('active');
        }
    }

    // Hintergrundfarb-Presets rendern
renderBgColorPresets() {
    const bgPresetsContainer = document.querySelector('.bg-color-presets');
    if (!bgPresetsContainer) return;

    // Spezielle Behandlung für "Eigene Farbe"
    if (this.currentBgCategory === 'custom') {
        bgPresetsContainer.innerHTML = `
            <div class="custom-color-section">
                <div class="custom-color-picker">
                    <label for="custom-bg-input" class="custom-color-label">
                        <span class="custom-icon">🎨</span>
                        Wähle deine individuelle Hintergrundfarbe:
                    </label>
                    <div class="custom-picker-wrapper">
                        <input type="color" 
                               id="custom-bg-input" 
                               value="${this.qrBgColor}" 
                               class="custom-color-input"
                               aria-label="Eigene Hintergrundfarbe auswählen">
                        <span class="color-value">${this.qrBgColor}</span>
                    </div>
                </div>
                <div class="color-suggestions">
                    <span class="suggestions-label">Beliebte Farbtöne:</span>
                    <div class="quick-suggestions">
                        ${this.generateQuickSuggestions()}
                    </div>
                </div>
            </div>
        `;

        // Event Listener für Custom Color Input
        const customInput = bgPresetsContainer.querySelector('#custom-bg-input');
        const colorValueSpan = bgPresetsContainer.querySelector('.color-value');
        
        customInput.addEventListener('input', (e) => {
            this.setBgColor(e.target.value);
            colorValueSpan.textContent = e.target.value.toUpperCase();
            this.showCustomColorFeedback(e.target.value);
        });

        // Event Listeners für Quick Suggestions
        bgPresetsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-color')) {
                const color = e.target.dataset.color;
                this.setBgColor(color);
                customInput.value = color;
                colorValueSpan.textContent = color.toUpperCase();
                this.showCustomColorFeedback(color);
            }
        });

        return;
    }

    // Standard-Preset-Rendering für andere Kategorien
    const presets = this.bgColorPresets[this.currentBgCategory] || this.bgColorPresets.neutral;
    
    bgPresetsContainer.innerHTML = presets.map(preset => `
        <button class="bg-color-preset advanced-preset" 
                data-color="${preset.color}" 
                style="background: ${preset.color}; border: 2px solid #e2e8f0;" 
                title="${preset.name}"
                type="button">
        </button>
    `).join('');

    // Standard-Preset aktivieren
    const defaultBgPreset = bgPresetsContainer.querySelector(`[data-color="${this.qrBgColor}"]`);
    if (defaultBgPreset) {
        defaultBgPreset.classList.add('active');
    }
}

// Quick Suggestions für beliebte Farben generieren
generateQuickSuggestions() {
    const suggestions = [
        { color: '#f8f9fa', name: 'Hellgrau' },
        { color: '#e9ecef', name: 'Silber' },
        { color: '#fff3cd', name: 'Cremeweiß' },
        { color: '#d1ecf1', name: 'Hellblau' },
        { color: '#d4edda', name: 'Mintgrün' },
        { color: '#f8d7da', name: 'Rosé' },
        { color: '#e2e3e5', name: 'Steingrau' },
        { color: '#ffeeba', name: 'Vanille' }
    ];

    return suggestions.map(suggestion => `
        <button class="suggestion-color" 
                data-color="${suggestion.color}"
                style="background: ${suggestion.color};"
                title="${suggestion.name}"
                type="button">
        </button>
    `).join('');
}

// Feedback für Custom Color Auswahl
showCustomColorFeedback(color) {
    if (window.qrApp && typeof window.qrApp.showToast === 'function') {
        window.qrApp.showToast(`Eigene Farbe: ${color.toUpperCase()}`, 'success', 1500);
    }
    
    // Kontrast-Prüfung aktivieren
    this.checkColorContrast();
}

    // Farbpreset auswählen
    selectColorPreset(element, color) {
        // Alle anderen Presets deaktivieren
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.remove('active');
        });
        
        // Aktuellen Preset aktivieren
        element.classList.add('active', 'selected-animation');
        
        // Farbe setzen
        this.qrColor = color;
        const qrColorInput = document.getElementById('qr-color');
        if (qrColorInput) {
            qrColorInput.value = color;
        }
        
        this.updatePreview();
        
        // Animation nach kurzer Zeit entfernen
        setTimeout(() => {
            element.classList.remove('selected-animation');
        }, 300);
    }

    // NEUE FUNKTION: Hintergrundfarb-Preset auswählen
    selectBgColorPreset(element, color) {
        // Alle anderen Hintergrund-Presets deaktivieren
        document.querySelectorAll('.bg-color-preset').forEach(preset => {
            preset.classList.remove('active');
        });
        
        // Aktuellen Preset aktivieren
        element.classList.add('active', 'selected-animation');
        
        // Hintergrundfarbe setzen
        this.qrBgColor = color;
        const qrBgColorInput = document.getElementById('qr-bg-color');
        if (qrBgColorInput) {
            qrBgColorInput.value = color;
        }
        
        this.updatePreview();
        this.showBgColorToast(color);
        
        // Animation nach kurzer Zeit entfernen
        setTimeout(() => {
            element.classList.remove('selected-animation');
        }, 300);
    }

    // Color Picker Event Listeners (bestehend, erweitert)
    setupColorPickers() {
        const qrColorInput = document.getElementById('qr-color');
        const qrBgColorInput = document.getElementById('qr-bg-color');

        if (qrColorInput) {
            qrColorInput.addEventListener('change', (e) => {
                this.qrColor = e.target.value;
                this.syncPresetSelection('color');
                this.updatePreview();
            });
        }

        if (qrBgColorInput) {
            qrBgColorInput.addEventListener('change', (e) => {
                this.qrBgColor = e.target.value;
                this.syncPresetSelection('bgColor');
                this.updatePreview();
            });
        }
    }

    // Preset-Auswahl synchronisieren
    syncPresetSelection(type) {
        if (type === 'color') {
            document.querySelectorAll('.color-preset').forEach(preset => {
                preset.classList.toggle('active', preset.dataset.color === this.qrColor);
            });
        } else if (type === 'bgColor') {
            document.querySelectorAll('.bg-color-preset').forEach(preset => {
                preset.classList.toggle('active', preset.dataset.color === this.qrBgColor);
            });
        }
    }

    // Größenauswahl Setup
    setupSizeSelector() {
    const sizeSelector = document.getElementById('qr-size');
    
    if (sizeSelector) {
        sizeSelector.addEventListener('change', (e) => {
            const selectedSize = e.target.value;
            this.qrSize = selectedSize;
            this.updatePreview();
            this.showSizeToast(selectedSize);
        });
    }
}

// Preview-Aktualisierung mit Logo-Support
updatePreview() {
    const content = document.getElementById('qr-content')?.value.trim();
    if (!content || !window.QRCode) return;

    const preview = document.querySelector('.qr-preview');
    if (!preview) return;

    try {
        preview.innerHTML = '';

        const qr = new QRCode(preview, {
            text: content,
            width: parseInt(this.qrSize),
            height: parseInt(this.qrSize),
            colorDark: this.qrColor,
            colorLight: this.qrBgColor,
            correctLevel: QRCode.CorrectLevel.H
        });

        // Logo hinzufügen wenn aktiviert
        if (this.logoEnabled && this.logoFile) {
            setTimeout(() => {
                this.addLogoToQR(preview);
            }, 100);
        }

        this.checkColorContrast();
        
        // Download-Info aktualisieren
        const downloadBtn = document.getElementById('download-btn');
if (downloadBtn) {
  downloadBtn.classList.remove('premium-locked');
  downloadBtn.addEventListener('click', () => this.downloadQRCode());
  if (document.querySelector('.download-section')) {
        requestAnimationFrame(() => {
            this.updateDownloadInfo();
        });
        }
}

    } catch (error) {
        console.error('Fehler beim QR Preview Update:', error);
    }
}

// Logo zum QR Code hinzufügen
addLogoToQR(preview) {
    const qrCanvas = preview.querySelector('canvas');
    if (!qrCanvas || !this.logoFile) return;
    
    const ctx = qrCanvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
        const qrSize = parseInt(this.qrSize);
        const logoSize = (qrSize * this.logoSize) / 100;
        
        // Position berechnen
        const positions = {
            'center': { x: (qrSize - logoSize) / 2, y: (qrSize - logoSize) / 2 },
            'top-left': { x: this.logoPadding, y: this.logoPadding },
            'top-right': { x: qrSize - logoSize - this.logoPadding, y: this.logoPadding },
            'bottom-left': { x: this.logoPadding, y: qrSize - logoSize - this.logoPadding },
            'bottom-right': { x: qrSize - logoSize - this.logoPadding, y: qrSize - logoSize - this.logoPadding }
        };
        
        const pos = positions[this.logoPosition] || positions.center;
        
        // Hintergrund für Logo erstellen
        ctx.save();
        
        if (this.logoShape === 'circle') {
            ctx.beginPath();
            ctx.arc(pos.x + logoSize/2, pos.y + logoSize/2, logoSize/2 + 2, 0, 2 * Math.PI);
            ctx.fillStyle = this.qrBgColor;
            ctx.fill();
            ctx.clip();
        } else if (this.logoShape === 'rounded') {
            this.roundRect(ctx, pos.x - 2, pos.y - 2, logoSize + 4, logoSize + 4, 8);
            ctx.fillStyle = this.qrBgColor;
            ctx.fill();
            ctx.clip();
        } else {
            ctx.fillStyle = this.qrBgColor;
            ctx.fillRect(pos.x - 2, pos.y - 2, logoSize + 4, logoSize + 4);
        }
        
        // Logo zeichnen
        ctx.drawImage(img, pos.x, pos.y, logoSize, logoSize);
        ctx.restore();
    };
    
    img.src = this.logoFile;
}

// Hilfsfunktion für abgerundete Rechtecke
roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

    // Kontrast-Prüfung
    checkColorContrast() {
        const contrast = this.calculateContrast(this.qrColor, this.qrBgColor);
        const warningElement = document.querySelector('.contrast-warning');
        
        if (contrast < 4.5) {
            if (!warningElement) {
                const warning = document.createElement('div');
                warning.className = 'contrast-warning';
                warning.innerHTML = `
                    <span class="warning-icon">⚠️</span>
                    <span>Geringer Kontrast - QR Code könnte schwer lesbar sein</span>
                `;
                document.querySelector('.preview-container').appendChild(warning);
            }
        } else if (warningElement) {
            warningElement.remove();
        }
    }

    // Kontrast berechnen
    calculateContrast(color1, color2) {
        const getLuminance = (color) => {
            const rgb = parseInt(color.slice(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;
            
            const [rs, gs, bs] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }

    // Toast-Nachrichten
    showBgColorToast(color) {
        const colorName = this.getColorName(color, 'bg');
        if (window.qrApp && typeof window.qrApp.showToast === 'function') {
            window.qrApp.showToast(`Hintergrundfarbe: ${colorName}`, 'info', 2000);
        }
    }

    showSizeToast(size) {
        const sizeNames = {
            '200': 'Klein',
            '300': 'Mittel', 
            '500': 'Groß',
            '800': 'Sehr groß'
        };

        if (window.qrApp && typeof window.qrApp.showToast === 'function') {
            window.qrApp.showToast(`QR Code Größe: ${sizeNames[size]} (${size}px)`, 'info', 2000);
        }
    }

    // Farbnamen ermitteln
    getColorName(color, type = 'color') {
        const presets = type === 'bg' ? this.bgColorPresets : this.colorPresets;
        
        for (const category of Object.values(presets)) {
            const found = category.find(preset => preset.color === color);
            if (found) return found.name;
        }
        
        return color;
    }

    // Öffentliche API
    setColor(color) {
        this.qrColor = color;
        const qrColorInput = document.getElementById('qr-color');
        if (qrColorInput) qrColorInput.value = color;
        this.syncPresetSelection('color');
        this.updatePreview();
    }

    setBgColor(color) {
    this.qrBgColor = color;
    const qrBgColorInput = document.getElementById('qr-bg-color');
    if (qrBgColorInput) qrBgColorInput.value = color;
    
    // Nur bei Standard-Presets synchronisieren
    if (this.currentBgCategory !== 'custom') {
        this.syncPresetSelection('bgColor');
    }
    
    this.updatePreview();
}

    setSize(size) {
        this.qrSize = size;
        const sizeSelector = document.getElementById('qr-size');
        if (sizeSelector) sizeSelector.value = size;
        this.updatePreview();
    }

    getSettings() {
        return {
            color: this.qrColor,
            bgColor: this.qrBgColor,
            size: this.qrSize,
            colorCategory: this.currentColorCategory,
            bgColorCategory: this.currentBgCategory
        };
    }

    // Erweiterte Preset-Verwaltung
    addCustomPreset(type, color, name, category = 'custom') {
        if (type === 'color') {
            if (!this.colorPresets[category]) {
                this.colorPresets[category] = [];
            }
            this.colorPresets[category].push({ color, name });
        } else if (type === 'bg') {
            if (!this.bgColorPresets[category]) {
                this.bgColorPresets[category] = [];
            }
            this.bgColorPresets[category].push({ color, name });
        }
    }

    // Integration mit der Hauptklasse sicherstellen
    integrateWithMainApp(qrApp) {
        this.mainApp = qrApp;
        
        // QR Preview Update Funktion der Hauptklasse überschreiben
        if (qrApp.updatePreview) {
            const originalUpdatePreview = qrApp.updatePreview.bind(qrApp);
            qrApp.updatePreview = () => {
                this.updatePreview();
            };
        }
    }

    // Logo-Funktionalität einrichten
setupLogoFunctionality() {
    this.logoEnabled = true;
    const logoSection = this.createLogoSection();
    const customizationContainer = document.querySelector('.qr-customization') || 
                                 document.querySelector('.color-presets-wrapper')?.parentElement;
    
    if (customizationContainer) {
        customizationContainer.appendChild(logoSection);
        this.attachLogoEventListeners();
    }
}

// Logo-Sektion HTML erstellen
createLogoSection() {
    const logoSection = document.createElement('div');
    logoSection.className = 'logo-section';
    logoSection.innerHTML = `
        <div class="logo-header">
            <h3 class="logo-title">
                <span class="logo-icon">📷</span>
                Logo hinzufügen
            </h3>
            <div class="logo-toggle-wrapper">
                <label class="logo-toggle">
                    <input type="checkbox" id="logo-enabled" ${this.logoEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">Logo aktivieren</span>
            </div>
        </div>
        
        <div class="logo-controls ${this.logoEnabled ? 'active' : 'inactive'}">
            <!-- Logo Upload -->
            <div class="logo-upload-area">
                <input type="file" id="logo-upload" accept="image/*" style="display: none;">
                <div class="upload-zone" id="upload-zone">
                    <div class="upload-content">
                        <span class="upload-icon">📁</span>
                        <span class="upload-text">Logo-Datei auswählen</span>
                        <span class="upload-hint">PNG, JPG, SVG (max. 2MB)</span>
                    </div>
                </div>
                <div class="logo-preview" id="logo-preview" style="display: none;">
                    <img id="logo-preview-img" alt="Logo Vorschau">
                    <button type="button" class="remove-logo" id="remove-logo">×</button>
                </div>
            </div>
            
            <!-- Logo-Einstellungen -->
            <div class="logo-settings">
                <div class="setting-group">
                    <label for="logo-size" class="setting-label">
                        <span>Größe</span>
                        <span class="setting-value" id="logo-size-value">${this.logoSize}%</span>
                    </label>
                    <input type="range" id="logo-size" min="10" max="40" value="${this.logoSize}" class="range-slider">
                </div>
                
                <div class="setting-group">
                    <label for="logo-position" class="setting-label">Position</label>
                    <select id="logo-position" class="form-control">
                        <option value="center" ${this.logoPosition === 'center' ? 'selected' : ''}>Zentrum</option>
                        <option value="top-left" ${this.logoPosition === 'top-left' ? 'selected' : ''}>Oben Links</option>
                        <option value="top-right" ${this.logoPosition === 'top-right' ? 'selected' : ''}>Oben Rechts</option>
                        <option value="bottom-left" ${this.logoPosition === 'bottom-left' ? 'selected' : ''}>Unten Links</option>
                        <option value="bottom-right" ${this.logoPosition === 'bottom-right' ? 'selected' : ''}>Unten Rechts</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label for="logo-shape" class="setting-label">Form</label>
                    <div class="shape-options">
                        <button type="button" class="shape-btn ${this.logoShape === 'square' ? 'active' : ''}" data-shape="square">
                            <span class="shape-icon">⬜</span>
                            Quadrat
                        </button>
                        <button type="button" class="shape-btn ${this.logoShape === 'circle' ? 'active' : ''}" data-shape="circle">
                            <span class="shape-icon">⭕</span>
                            Kreis
                        </button>
                        <button type="button" class="shape-btn ${this.logoShape === 'rounded' ? 'active' : ''}" data-shape="rounded">
                            <span class="shape-icon">▢</span>
                            Abgerundet
                        </button>
                    </div>
                </div>
                
                <div class="setting-group">
                    <label for="logo-padding" class="setting-label">
                        <span>Abstand</span>
                        <span class="setting-value" id="logo-padding-value">${this.logoPadding}px</span>
                    </label>
                    <input type="range" id="logo-padding" min="0" max="20" value="${this.logoPadding}" class="range-slider">
                </div>
            </div>
            
            <!-- Logo-Presets -->
            <div class="logo-presets">
                <label class="presets-label">Schnell-Vorlagen:</label>
                <div class="preset-buttons">
                    <button type="button" class="preset-btn" data-preset="small-corner">
                        <span class="preset-icon">📍</span>
                        Klein & Ecke
                    </button>
                    <button type="button" class="preset-btn" data-preset="medium-center">
                        <span class="preset-icon">🎯</span>
                        Mittel & Zentrum
                    </button>
                    <button type="button" class="preset-btn" data-preset="large-center">
                        <span class="preset-icon">⭐</span>
                        Groß & Zentrum
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return logoSection;
}

// Logo Event Listeners einrichten
attachLogoEventListeners() {
    // Logo Toggle
    const logoToggle = document.getElementById('logo-enabled');
    logoToggle.addEventListener('change', (e) => {
        this.logoEnabled = e.target.checked;
        this.toggleLogoControls();
        this.updatePreview();
    });
    
    // File Upload
    const logoUpload = document.getElementById('logo-upload');
    const uploadZone = document.getElementById('upload-zone');
    
    uploadZone.addEventListener('click', () => logoUpload.click());
    
    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleLogoUpload(files[0]);
        }
    });
    
    logoUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            this.handleLogoUpload(e.target.files[0]);
        }
    });
    
    // Logo entfernen
    document.getElementById('remove-logo').addEventListener('click', () => {
        this.removeLogo();
    });
    
    // Logo-Größe
    const logoSizeSlider = document.getElementById('logo-size');
    logoSizeSlider.addEventListener('input', (e) => {
        this.logoSize = parseInt(e.target.value);
        document.getElementById('logo-size-value').textContent = `${this.logoSize}%`;
        this.updatePreview();
    });
    
    // Logo-Position
    document.getElementById('logo-position').addEventListener('change', (e) => {
        this.logoPosition = e.target.value;
        this.updatePreview();
    });
    
    // Logo-Form
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.logoShape = btn.dataset.shape;
            this.updatePreview();
        });
    });
    
    // Logo-Abstand
    const logoPaddingSlider = document.getElementById('logo-padding');
    logoPaddingSlider.addEventListener('input', (e) => {
        this.logoPadding = parseInt(e.target.value);
        document.getElementById('logo-padding-value').textContent = `${this.logoPadding}px`;
        this.updatePreview();
    });
    
    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this.applyLogoPreset(btn.dataset.preset);
        });
    });
}

// Logo-Upload verarbeiten
handleLogoUpload(file) {
    // Dateigröße prüfen (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        this.showLogoError('Datei zu groß. Maximum: 2MB');
        return;
    }
    
    // Dateityp prüfen
    if (!file.type.startsWith('image/')) {
        this.showLogoError('Nur Bilddateien erlaubt (PNG, JPG, SVG)');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        this.logoFile = e.target.result;
        this.showLogoPreview(e.target.result);
        this.updatePreview();
        
        if (window.qrApp && typeof window.qrApp.showToast === 'function') {
            window.qrApp.showToast('Logo erfolgreich hinzugefügt!', 'success', 2000);
        }
    };
    
    reader.readAsDataURL(file);
}

// Logo-Vorschau anzeigen
showLogoPreview(imageSrc) {
    const uploadZone = document.getElementById('upload-zone');
    const logoPreview = document.getElementById('logo-preview');
    const previewImg = document.getElementById('logo-preview-img');
    
    uploadZone.style.display = 'none';
    logoPreview.style.display = 'block';
    previewImg.src = imageSrc;
}

// Logo entfernen
removeLogo() {
    this.logoFile = null;
    document.getElementById('upload-zone').style.display = 'block';
    document.getElementById('logo-preview').style.display = 'none';
    document.getElementById('logo-upload').value = '';
    this.updatePreview();
    
    if (window.qrApp && typeof window.qrApp.showToast === 'function') {
        window.qrApp.showToast('Logo entfernt', 'info', 1500);
    }
}

// Logo-Controls ein-/ausblenden
toggleLogoControls() {
    const logoControls = document.querySelector('.logo-controls');
    if (this.logoEnabled) {
        logoControls.classList.add('active');
        logoControls.classList.remove('inactive');
    } else {
        logoControls.classList.remove('active');
        logoControls.classList.add('inactive');
    }
}

// Logo-Presets anwenden
applyLogoPreset(preset) {
    const presets = {
        'small-corner': { size: 15, position: 'bottom-right', shape: 'circle', padding: 5 },
        'medium-center': { size: 25, position: 'center', shape: 'rounded', padding: 10 },
        'large-center': { size: 35, position: 'center', shape: 'square', padding: 15 }
    };
    
    const config = presets[preset];
    if (config) {
        this.logoSize = config.size;
        this.logoPosition = config.position;
        this.logoShape = config.shape;
        this.logoPadding = config.padding;
        
        // UI aktualisieren
        document.getElementById('logo-size').value = this.logoSize;
        document.getElementById('logo-size-value').textContent = `${this.logoSize}%`;
        document.getElementById('logo-position').value = this.logoPosition;
        document.getElementById('logo-padding').value = this.logoPadding;
        document.getElementById('logo-padding-value').textContent = `${this.logoPadding}px`;
        
        // Form-Buttons aktualisieren
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === this.logoShape);
        });
        
        this.updatePreview();
        
        if (window.qrApp && typeof window.qrApp.showToast === 'function') {
            window.qrApp.showToast(`Preset "${preset}" angewendet`, 'success', 1500);
        }
    }
}

// Download-Sektion HTML erstellen
createDownloadSection() {
    const downloadSection = document.createElement('div');
    downloadSection.className = 'download-section';
    downloadSection.innerHTML = `
        <div class="download-header">
            <h3 class="download-title">
                <span class="download-icon">💾</span>
                QR Code herunterladen
            </h3>
        </div>
        
        <div class="download-options">
            <div class="format-selection">
                <label class="format-label">Format:</label>
                <div class="format-buttons">
                    <button type="button" class="format-btn active" data-format="png">
                        <span class="format-icon">🖼️</span>
                        PNG
                        <span class="format-desc">Beste Qualität</span>
                    </button>
                    <button type="button" class="format-btn" data-format="jpg">
                        <span class="format-icon">📷</span>
                        JPG
                        <span class="format-desc">Kleinere Datei</span>
                    </button>
                    <button type="button" class="format-btn" data-format="svg">
                        <span class="format-icon">⚡</span>
                        SVG
                        <span class="format-desc">Skalierbar</span>
                    </button>
                </div>
            </div>
            
            <div class="download-settings">
                <div class="quality-setting">
                    <label for="download-quality">
                        <span>Qualität</span>
                        <span class="quality-value" id="quality-value">95%</span>
                    </label>
                    <input type="range" id="download-quality" min="70" max="100" value="95" class="quality-slider">
                </div>
                
                <div class="filename-setting">
                    <label for="download-filename">Dateiname:</label>
                    <input type="text" id="download-filename" value="qr-code" class="filename-input" placeholder="qr-code">
                </div>
            </div>
            
            <div class="download-actions">
                <button type="button" id="download-btn" class="download-btn primary">
                    <span class="btn-icon">⬇️</span>
                    <span class="btn-text">Herunterladen</span>
                    <span class="btn-size" id="download-size">~50KB</span>
                </button>
                
                <button type="button" id="preview-download" class="download-btn secondary">
                    <span class="btn-icon">👁️</span>
                    Vorschau
                </button>
            </div>
        </div>
        
        <div class="download-info">
            <div class="info-item">
                <span class="info-icon">📏</span>
                <span>Größe: <span id="info-dimensions">${this.qrSize}x${this.qrSize}px</span></span>
            </div>
            <div class="info-item">
                <span class="info-icon">🎨</span>
                <span>Farben: <span id="info-colors">Vordergrund & Hintergrund</span></span>
            </div>
            <div class="info-item" id="logo-info" style="display: none;">
                <span class="info-icon">📷</span>
                <span>Mit Logo</span>
            </div>
        </div>
    `;
    
    return downloadSection;
}

// Download Event Listeners
attachDownloadEventListeners() {
    // Format-Auswahl Handler
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Alle Format-Buttons deaktivieren
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            
            // Aktuellen Button aktivieren
            btn.classList.add('active');
            
            // Ausgewähltes Format speichern
            this.selectedFormat = btn.dataset.format;
            this.selectedFormatName = btn.dataset.name;
            
            // Hauptbutton aktualisieren
            this.updateMainDownloadButton();
            
            // Download-Info aktualisieren
            this.updateDownloadInfo();
            
            // Toast-Feedback für Formatwechsel
            if (window.qrApp && typeof window.qrApp.showToast === 'function') {
                window.qrApp.showToast(`Format gewechselt zu ${this.selectedFormatName}`, 'info', 1500);
            }
        });
    });
    
    // Qualitäts-Slider Handler
    const qualitySlider = document.getElementById('download-quality');
    if (qualitySlider) {
        qualitySlider.addEventListener('input', (e) => {
            this.downloadQuality = parseInt(e.target.value);
            const qualityValueElement = document.getElementById('quality-value');
            if (qualityValueElement) {
                qualityValueElement.textContent = `${this.downloadQuality}%`;
            }
            this.updateDownloadInfo();
        });
        
        // Qualitäts-Slider Change Event für finalen Wert
        qualitySlider.addEventListener('change', (e) => {
            if (window.qrApp && typeof window.qrApp.showToast === 'function') {
                window.qrApp.showToast(`Qualität auf ${this.downloadQuality}% gesetzt`, 'info', 1000);
            }
        });
    }
    
    // Dateiname-Input Handler
    const filenameInput = document.getElementById('download-filename');
    if (filenameInput) {
        filenameInput.addEventListener('input', (e) => {
            // Dateiname validieren und bereinigen
            let filename = e.target.value.replace(/[<>:"/\\|?*]/g, '');
            if (filename !== e.target.value) {
                e.target.value = filename;
            }
            this.downloadFilename = filename || 'qr-code';
        });
        
        // Focus/Blur Events für bessere UX
        filenameInput.addEventListener('focus', () => {
            filenameInput.select();
        });
        
        filenameInput.addEventListener('blur', () => {
            if (!filenameInput.value.trim()) {
                filenameInput.value = 'qr-code';
                this.downloadFilename = 'qr-code';
            }
        });
    }
    
    // Hauptdownload-Button Handler
    const mainDownloadBtn = document.getElementById('main-download-btn');
    if (mainDownloadBtn) {
        mainDownloadBtn.addEventListener('click', () => {
            // Loading-State für Button
            mainDownloadBtn.classList.add('loading');
            mainDownloadBtn.disabled = true;
            
            // Download mit aktuellem Format
            this.downloadQRCode(this.selectedFormat || 'png')
                .finally(() => {
                    // Loading-State entfernen
                    setTimeout(() => {
                        mainDownloadBtn.classList.remove('loading');
                        mainDownloadBtn.disabled = false;
                    }, 300);
                });
        });
    }
    
    // Keyboard Shortcuts für Download
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (mainDownloadBtn && !mainDownloadBtn.disabled) {
                mainDownloadBtn.click();
            }
        }
    });
    
    // Initialisierung der Standard-Eigenschaften
    this.selectedFormat = this.selectedFormat || 'png';
    this.selectedFormatName = this.selectedFormatName || 'PNG';
    this.downloadQuality = this.downloadQuality || 95;
    this.downloadFilename = this.downloadFilename || 'qr-code';
    
    // Initial Updates
    this.updateMainDownloadButton();
    this.updateDownloadInfo();
    
    // Standard PNG Format als aktiv markieren
    const defaultFormatBtn = document.querySelector('.format-btn[data-format="png"]');
    if (defaultFormatBtn) {
        defaultFormatBtn.classList.add('active');
    }
}

// Hauptbutton dynamisch aktualisieren
updateMainDownloadButton() {
    const downloadText = document.querySelector('.download-text');
    const formatName = this.selectedFormatName || 'PNG';
    
    if (downloadText) {
        downloadText.textContent = `Als ${formatName} herunterladen`;
    }
    
    // Icon je nach Format anpassen
    this.updateDownloadIcon();
}

// Download-Icon je nach Format anpassen
updateDownloadIcon() {
    const mainBtn = document.getElementById('main-download-btn');
    const iconSvg = mainBtn?.querySelector('svg');
    
    if (!iconSvg) return;
    
    // Format-spezifische Icons
    const formatIcons = {
        png: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>`,
        jpg: `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14,2 14,8 20,8"/>`,
        svg: `<polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
              <line x1="12" y1="8" x2="12" y2="16"/>`,
        pdf: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>`,
        eps: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>`
    };
    
    const iconPath = formatIcons[this.selectedFormat] || formatIcons.png;
    iconSvg.innerHTML = iconPath;
}

// QR Code herunterladen
downloadQRCode(format = 'png') {
    const qrCanvas = document.querySelector('.qr-preview canvas');
    if (!qrCanvas) {
        this.showDownloadError('Kein QR Code zum Herunterladen verfügbar');
        return;
    }
    
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `${this.downloadFilename || 'qr-code'}-${timestamp}`;
        let dataUrl;
        
        switch (format.toLowerCase()) {
            case 'png':
                dataUrl = qrCanvas.toDataURL('image/png');
                this.triggerDownload(dataUrl, `${filename}.png`);
                break;
                
            case 'jpg':
            case 'jpeg':
                // Weißer Hintergrund für JPG
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = qrCanvas.width;
                tempCanvas.height = qrCanvas.height;
                
                tempCtx.fillStyle = '#FFFFFF';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(qrCanvas, 0, 0);
                
                dataUrl = tempCanvas.toDataURL('image/jpeg', (this.downloadQuality || 95) / 100);
                this.triggerDownload(dataUrl, `${filename}.jpg`);
                break;
                
            case 'svg':
                dataUrl = this.generateSVG();
                this.triggerDownload(dataUrl, `${filename}.svg`);
                break;
                
            case 'pdf':
                this.generatePDF(`${filename}.pdf`);
                break;
                
            case 'eps':
                this.generateEPS(`${filename}.eps`);
                break;
                
            default:
                dataUrl = qrCanvas.toDataURL('image/png');
                this.triggerDownload(dataUrl, `${filename}.png`);
        }
        
        // Erfolgs-Toast anzeigen
        if (window.qrApp && typeof window.qrApp.showToast === 'function') {
            window.qrApp.showToast(`QR Code als ${format.toUpperCase()} heruntergeladen!`, 'success', 3000);
        }
        
        // Download-Statistiken aktualisieren
        this.trackDownload(format, filename);
        
    } catch (error) {
        console.error('Download-Fehler:', error);
        this.showDownloadError(`Fehler beim Herunterladen als ${format.toUpperCase()}`);
    }
}

// Download auslösen
triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup nach kurzer Zeit
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);
}

// SVG generieren
async generateSVG() {
    const size = parseInt(this.qrSize || 300);
    const content = document.getElementById('qr-content')?.value.trim() || '';
    
    // Basis SVG-Template
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" 
             xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${this.qrBgColor || '#ffffff'}"/>
            <rect x="10" y="10" width="30" height="30" fill="${this.qrColor || '#000000'}"/>
            <rect x="${size-40}" y="10" width="30" height="30" fill="${this.qrColor || '#000000'}"/>
            <rect x="10" y="${size-40}" width="30" height="30" fill="${this.qrColor || '#000000'}"/>
            <!-- Vereinfachte QR-Struktur -->
        </svg>`;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// PDF-Generierung
async generatePDF(filename) {
    const qrCanvas = document.querySelector('.qr-preview canvas');
    if (!qrCanvas) return;
    
    // Fallback: PNG in PDF-Container
    const dataUrl = qrCanvas.toDataURL('image/png');
    this.triggerDownload(dataUrl, filename.replace('.pdf', '.png'));
}

// EPS-Generierung
generateEPS(filename) {
    const qrCanvas = document.querySelector('.qr-preview canvas');
    if (!qrCanvas) return;
    
    // Fallback: PNG Download
    const dataUrl = qrCanvas.toDataURL('image/png');
    this.triggerDownload(dataUrl, filename.replace('.eps', '.png'));
}

// Download-Vorschau
previewDownload() {
    const qrCanvas = document.querySelector('.qr-preview canvas');
    if (!qrCanvas) return;
    
    // Neues Fenster mit Vorschau öffnen
    const dataUrl = qrCanvas.toDataURL('image/png');
    const previewWindow = window.open('', '_blank');
    
    previewWindow.document.write(`
        <html>
            <head>
                <title>QR Code Vorschau</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        background: #f5f5f5;
                        font-family: Arial, sans-serif;
                        text-align: center;
                    }
                    .preview-container {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        display: inline-block;
                        margin: 20px;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    .info {
                        margin-top: 15px;
                        font-size: 14px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="preview-container">
                    <h2>QR Code Vorschau</h2>
                    <img src="${dataUrl}" alt="QR Code Preview">
                    <div class="info">
                        Größe: ${this.qrSize}x${this.qrSize}px<br>
                        Format: ${this.selectedFormat.toUpperCase()}<br>
                        Qualität: ${this.downloadQuality}%
                    </div>
                </div>
            </body>
        </html>
    `);
    
    previewWindow.document.close();
}

// Download-Info aktualisieren
updateDownloadInfo() {
    const sizeElement = document.getElementById('download-size');
    if (!sizeElement) return;
    
    const baseSize = parseInt(this.qrSize || 300);
    let estimatedSize;
    
    // Größenschätzung je nach Format
    switch (this.selectedFormat) {
        case 'png':
            // PNG: ~4 bytes per pixel + Header
            estimatedSize = Math.round((baseSize * baseSize * 4) / 1024) + 2;
            break;
            
        case 'jpg':
            // JPG: Abhängig von Qualität
            const quality = this.downloadQuality || 95;
            estimatedSize = Math.round((baseSize * baseSize * (quality / 100)) / 8);
            break;
            
        case 'svg':
            // SVG: Sehr klein, nur Text-basiert
            estimatedSize = Math.round((baseSize / 50) + 3);
            break;
            
        case 'pdf':
            // PDF: Overhead + eingebettetes Bild
            estimatedSize = Math.round((baseSize * baseSize * 2) / 1024) + 10;
            break;
            
        case 'eps':
            // EPS: Ähnlich PDF aber größer
            estimatedSize = Math.round((baseSize * baseSize * 3) / 1024) + 5;
            break;
            
        default:
            estimatedSize = Math.round((baseSize * baseSize * 4) / 1024);
    }
    
    // Größe formatieren
    const sizeText = estimatedSize > 1024 ? 
        `~${(estimatedSize / 1024).toFixed(1)}MB` : 
        `~${estimatedSize}KB`;
    
    sizeElement.textContent = sizeText;
    
    // Warnung bei sehr großen Dateien
    if (estimatedSize > 5120) { // > 5MB
        sizeElement.style.color = 'var(--color-warning)';
        sizeElement.title = 'Große Datei - Download kann länger dauern';
    } else {
        sizeElement.style.color = '';
        sizeElement.title = '';
        }
    
    document.getElementById('download-size').textContent = sizeText;
    document.getElementById('info-dimensions').textContent = `${this.qrSize}x${this.qrSize}px`;
    
    // Logo-Info anzeigen
    const logoInfo = document.getElementById('logo-info');
    if (this.logoEnabled && this.logoFile) {
        logoInfo.style.display = 'flex';
    } else {
        logoInfo.style.display = 'none';
    }
}

// Download-Fehler anzeigen
showDownloadError(message) {
    if (window.qrApp && typeof window.qrApp.showToast === 'function') {
        window.qrApp.showToast(message, 'error', 4000);
    } else {
        alert(message);
    }
}

// Download-Tracking
trackDownload(format, filename) {
    const downloadData = {
        format,
        filename,
        size: this.qrSize,
        quality: this.downloadQuality,
        timestamp: new Date().toISOString(),
        hasLogo: this.logoEnabled && this.logoFile ? true : false
    };
    
    // In localStorage für Statistiken speichern
    try {
        const downloads = JSON.parse(localStorage.getItem('qr-downloads') || '[]');
        downloads.push(downloadData);
        
        // Nur die letzten 50 Downloads speichern
        const recentDownloads = downloads.slice(-50);
        localStorage.setItem('qr-downloads', JSON.stringify(recentDownloads));
        
        // Download-Counter erhöhen
        const downloadCount = parseInt(localStorage.getItem('total-downloads') || '0') + 1;
        localStorage.setItem('total-downloads', downloadCount.toString());
        
    } catch (error) {
        console.log('Tracking-Fehler:', error);
    }
}
}

// Integration mit der Hauptapp
document.addEventListener('DOMContentLoaded', () => {
    // QR Customization erst nach der Hauptapp initialisieren
    setTimeout(() => {
        window.qrCustomization = new QRCustomization();
        
        // Mit Hauptapp verknüpfen falls vorhanden
        if (window.qrApp) {
            window.qrCustomization.integrateWithMainApp(window.qrApp);
        }
    }, 500);
});

/* Nach QRCustomization-Klasse oder in app.js ergänzen */
class TemplateManager {
  constructor(qrCustomizer) {
    this.qrCustomizer = qrCustomizer;               // Referenz auf QRCustomization
    this.templates = this.buildTemplates();         // Array mit Template-Objekten
    this.modal = document.getElementById('template-modal');
    this.grid  = document.getElementById('template-grid');
    this.renderCards();
    this.bindEvents();
  }

  /* Beispiel-Templates */
  buildTemplates() {
    return [
      {
        id: 'wifi',
        name: 'Besucher-WiFi',
        payload: 'WIFI:T:WPA;S:Guest_WLAN;P:mysecretpw;H:false;;',
        settings: { color:'#ffffff', bgColor:'#2563eb', size:'300' }
      },
      {
        id: 'vcard',
        name: 'Visitenkarte',
        payload:
`BEGIN:VCARD
VERSION:3.0
FN:Max Mustermann
ORG:Muster GmbH
TEL:+49 123 456789
EMAIL:max@muster.de
URL:https://muster.de
END:VCARD`,
        settings: { color:'#000000', bgColor:'#facc15', size:'300' }
      },
      {
        id: 'link',
        name: 'Website Link',
        payload: 'https://www.example.com',
        settings: { color:'#ffffff', bgColor:'#0d9488', size:'300' }
      }
    ];
  }

  /* Karten ins Modal rendern */
  renderCards() {
    this.grid.innerHTML = this.templates.map(t => `
      <div class="template-card" data-id="${t.id}">
        <div class="template-preview">
          <span>QR</span>
        </div>
        <div class="template-name">${t.name}</div>
      </div>
    `).join('');
  }

  bindEvents() {
    /* Öffnen durch Button „Templates verwenden“ */
    document.querySelectorAll('[data-feature="templates"]').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });

    /* Schließen */
    this.modal.querySelector('[data-close-template]')
        .addEventListener('click', () => this.close());
    this.modal.addEventListener('click', e => {
      if (e.target === this.modal) this.close();
    });

    /* Klick auf Template-Karte */
    this.grid.addEventListener('click', e => {
      const card = e.target.closest('.template-card');
      if (!card) return;
      const tpl = this.templates.find(t => t.id === card.dataset.id);
      if (tpl) this.applyTemplate(tpl);
    });
  }

  open()  { this.modal.style.display = 'flex'; }
  close() { this.modal.style.display = 'none'; }

  /* Template anwenden */
  applyTemplate(tpl) {
    const { payload, settings } = tpl;

    /* Inhalt setzen */
    const textarea = document.getElementById('qr-content');
    textarea.value = payload;

    /* Farben & Größe übernehmen */
    this.qrCustomizer.setColor(settings.color);
    this.qrCustomizer.setBgColor(settings.bgColor);
    this.qrCustomizer.setSize(settings.size);

    /* Vorschau aktualisieren */
    this.qrCustomizer.updatePreview();

    /* Feedback */
    window.qrApp?.showToast?.(`Template „${tpl.name}“ angewendet`, 'success', 2500);

    this.close();
  }
}

/* ---------- Template-Modal Handling ---------- */
(function initTemplateModal() {
  const modal        = document.getElementById('template-modal');
  const closeBtn     = modal?.querySelector('[data-close-template]');

  if (!modal) return; // Modal existiert nicht

  // Öffnen – Quick-Action + Generator-Button
  document.querySelectorAll('[data-action="show-templates"], [data-feature="templates"]')
    .forEach(btn => btn.addEventListener('click', () => openTemplateModal()));

  // Schließen über „×“
  closeBtn?.addEventListener('click', closeTemplateModal);

  // Schließen bei Klick außerhalb des Inhalts
  modal.addEventListener('click', e => {
    if (e.target === modal) closeTemplateModal();
  });

  // Schließen per ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeTemplateModal();
    }
  });

  /* ---------- Helper ---------- */
  function openTemplateModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // Fokus auf Modal für Accessibility
    modal.querySelector('.modal-content')?.focus();
  }

  function closeTemplateModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
})();

/* Initialisierung nach QRCustomization-Setup */
document.addEventListener('DOMContentLoaded', () => {
  /* warten bis qrCustomization existiert */
  setTimeout(() => {
    if (window.qrCustomization) {
      window.templateManager = new TemplateManager(window.qrCustomization);
    }
  }, 600);
});
