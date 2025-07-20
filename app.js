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
    await this.loadLibraries();
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
    console.log('🔄 Initialisiere App-Daten...');
    
    try {
        // Gespeicherte Daten laden
        const savedHistory = localStorage.getItem('qr-pro-history');
        const savedScanHistory = localStorage.getItem('qr-pro-scan-history');
        const savedSettings = localStorage.getItem('qr-pro-settings');
        const savedDailyCount = localStorage.getItem('qr-pro-daily-count');
        const savedDate = localStorage.getItem('qr-pro-last-date');
        const savedUserTier = localStorage.getItem('qr-pro-user-tier');
        
        // Verlauf wiederherstellen
        if (savedHistory) {
            try {
                this.qrHistory = JSON.parse(savedHistory);
                console.log(`📊 ${this.qrHistory.length} QR-Codes im Verlauf geladen`);
            } catch (error) {
                console.warn('Fehler beim Laden des QR-Verlaufs:', error);
                this.qrHistory = [];
            }
        }
        
        if (savedScanHistory) {
            try {
                this.scanHistory = JSON.parse(savedScanHistory);
                console.log(`📱 ${this.scanHistory.length} Scans im Verlauf geladen`);
            } catch (error) {
                console.warn('Fehler beim Laden des Scan-Verlaufs:', error);
                this.scanHistory = [];
            }
        }
        
        // User Tier wiederherstellen
        if (savedUserTier) {
            this.userTier = savedUserTier;
        }
        
        // Einstellungen wiederherstellen und anwenden
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsedSettings };
                console.log('⚙️ Einstellungen wiederhergestellt:', this.settings);
                
                // UI-Einstellungen anwenden
                this.applySettingsToUI();
                
            } catch (error) {
                console.warn('Fehler beim Laden der Einstellungen:', error);
                this.resetToDefaultSettings();
            }
        } else {
            // Erste Nutzung - Standard-Einstellungen setzen
            console.log('🆕 Erste Nutzung - Standard-Einstellungen werden gesetzt');
            this.setDefaultSettings();
        }
        
        // Tägliche Zählung zurücksetzen falls neuer Tag
        const today = new Date().toDateString();
        if (savedDate !== today) {
            console.log('📅 Neuer Tag erkannt - Zähler zurückgesetzt');
            this.dailyQRCount = 0;
            localStorage.setItem('qr-pro-daily-count', '0');
            localStorage.setItem('qr-pro-last-date', today);
            
            // Alte Verlaufseinträge bereinigen falls eingestellt
            if (this.settings.autoDeleteHistory) {
                this.cleanupOldHistory();
            }
        } else if (savedDailyCount) {
            this.dailyQRCount = parseInt(savedDailyCount) || 0;
        }
        
        // Theme anwenden
        this.applyTheme();
        
        // Statistiken aktualisieren
        this.updateStatsCards();
        
        console.log('✅ App-Daten erfolgreich initialisiert');
        
    } catch (error) {
        console.error('❌ Kritischer Fehler bei der Dateninitialisierung:', error);
        
        // Fallback: App in sicherem Modus starten
        this.startSafeMode();
    }
}

// UI-Einstellungen anwenden
applySettingsToUI() {
    // Theme Selector
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector && this.settings.theme) {
        themeSelector.value = this.settings.theme;
    }
    
    // Benachrichtigungen Toggle
    const notificationsToggle = document.getElementById('notifications-toggle');
    if (notificationsToggle) {
        notificationsToggle.checked = this.settings.notifications !== false;
    }
    
    // Auto-Save Toggle
    const autoSaveToggle = document.getElementById('auto-save-toggle');
    if (autoSaveToggle) {
        autoSaveToggle.checked = this.settings.autoSave !== false;
    }
    
    // Farb-Presets wiederherstellen
    const colorPresetSelect = document.getElementById('qr-color-preset');
    if (colorPresetSelect && this.settings.colorPreset) {
        colorPresetSelect.value = this.settings.colorPreset;
    }
    
    // Hintergrund-Presets wiederherstellen (NEU)
    const bgPresetSelect = document.getElementById('qr-bg-preset');
    if (bgPresetSelect && this.settings.bgPreset) {
        bgPresetSelect.value = this.settings.bgPreset;
        
        // Preset anwenden falls nicht 'custom'
        if (this.settings.bgPreset !== 'custom' && this.bgPresets && this.bgPresets[this.settings.bgPreset]) {
            const bgColorInput = document.getElementById('qr-bg-color');
            if (bgColorInput) {
                bgColorInput.value = this.bgPresets[this.settings.bgPreset];
                bgColorInput.disabled = true;
                console.log(`🎨 Hintergrund-Preset "${this.settings.bgPreset}" angewendet`);
            }
        }
    }
    
    // Letzte verwendete Farben wiederherstellen
    if (this.settings.lastUsedColors) {
        const qrColorInput = document.getElementById('qr-color');
        const qrBgColorInput = document.getElementById('qr-bg-color');
        
        if (qrColorInput && this.settings.lastUsedColors.foreground) {
            qrColorInput.value = this.settings.lastUsedColors.foreground;
        }
        
        if (qrBgColorInput && this.settings.lastUsedColors.background && this.settings.bgPreset === 'custom') {
            qrBgColorInput.value = this.settings.lastUsedColors.background;
        }
    }
    
    // Scanner Einstellungen
    if (this.settings.preferredCamera && navigator.mediaDevices) {
        this.preferredCameraId = this.settings.preferredCamera;
    }
}

// Standard-Einstellungen setzen
setDefaultSettings() {
    this.settings = {
        theme: 'auto',
        notifications: true,
        autoSave: true,
        language: 'de',
        soundEnabled: true,
        vibrationEnabled: true,
        defaultQRSize: 'medium',
        defaultErrorLevel: 'M',
        defaultFormat: 'PNG',
        colorPreset: 'custom',
        bgPreset: 'custom', // NEU
        lastUsedColors: {
            foreground: '#000000',
            background: '#ffffff'
        },
        quickScanMode: false,
        autoDownload: false,
        showPreview: true,
        preferredCamera: 'environment',
        scanDelay: 500,
        maxHistoryItems: 100,
        autoDeleteHistory: false,
        historyRetentionDays: 30,
        premiumFeatures: {},
        version: '1.0.0'
    };
    
    // Sofort speichern
    this.saveSettings();
}

// Alte Verlaufseinträge bereinigen
cleanupOldHistory() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.historyRetentionDays);
    
    const originalQRCount = this.qrHistory.length;
    const originalScanCount = this.scanHistory.length;
    
    // Alte QR-Codes entfernen
    this.qrHistory = this.qrHistory.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate > cutoffDate;
    });
    
    // Alte Scans entfernen
    this.scanHistory = this.scanHistory.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate > cutoffDate;
    });
    
    // Speichern falls Änderungen
    if (this.qrHistory.length !== originalQRCount || this.scanHistory.length !== originalScanCount) {
        localStorage.setItem('qr-pro-history', JSON.stringify(this.qrHistory));
        localStorage.setItem('qr-pro-scan-history', JSON.stringify(this.scanHistory));
        
        const removedItems = (originalQRCount - this.qrHistory.length) + (originalScanCount - this.scanHistory.length);
        console.log(`🧹 ${removedItems} alte Verlaufseinträge bereinigt`);
        
        if (this.settings.notifications) {
            this.showToast(`${removedItems} alte Einträge bereinigt`, 'info');
        }
    }
}

// Sicherer Modus bei kritischen Fehlern
startSafeMode() {
    console.warn('🔒 Starte App im sicheren Modus');
    
    // Minimal-Einstellungen
    this.settings = {
        theme: 'auto',
        notifications: true,
        autoSave: true
    };
    
    // Leere Verläufe
    this.qrHistory = [];
    this.scanHistory = [];
    this.dailyQRCount = 0;
    
    // Theme anwenden
    this.applyTheme();
    
    // Benutzer informieren
    this.showToast('App im sicheren Modus gestartet. Einige Funktionen sind eingeschränkt.', 'warning', 5000);
}

// Einstellungen zurücksetzen
resetToDefaultSettings() {
    console.log('🔄 Setze Einstellungen auf Standard zurück');
    
    // Alte Einstellungen löschen
    localStorage.removeItem('qr-pro-settings');
    
    // Standard-Einstellungen setzen
    this.setDefaultSettings();
    
    // UI aktualisieren
    this.applySettingsToUI();
    
    if (this.settings.notifications) {
        this.showToast('Einstellungen zurückgesetzt', 'info');
    }
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

// Statistik-Methoden für Dashboard
getGeneratedCount() {
    return this.qrHistory.length;
}

getScannedCount() {
    return this.scanHistory.length;
}

getTodayActivity() {
    const today = new Date().toDateString();
    const todayQRs = this.qrHistory.filter(item => 
        new Date(item.timestamp).toDateString() === today
    ).length;
    
    const todayScans = this.scanHistory.filter(item => 
        new Date(item.timestamp).toDateString() === today
    ).length;
    
    return todayQRs + todayScans;
}

getTemplatesCount() {
    // Anzahl der verfügbaren Templates
    return this.userTier === 'premium' ? 25 : 5;
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
    const settings = {
        // Bestehende Einstellungen
        theme: this.settings.theme,
        notifications: this.settings.notifications,
        autoSave: this.settings.autoSave,
        
        // UI Einstellungen
        language: this.settings.language || 'de',
        soundEnabled: this.settings.soundEnabled || true,
        vibrationEnabled: this.settings.vibrationEnabled || true,
        
        // Generator Einstellungen
        defaultQRSize: this.settings.defaultQRSize || 'medium',
        defaultErrorLevel: this.settings.defaultErrorLevel || 'M',
        defaultFormat: this.settings.defaultFormat || 'PNG',
        
        // Farb-Presets
        colorPreset: document.getElementById('qr-color-preset')?.value || 'custom',
        lastUsedColors: {
            foreground: document.getElementById('qr-color')?.value || '#000000',
            background: document.getElementById('qr-bg-color')?.value || '#ffffff'
        },
        
        // Hintergrund-Presets (neu hinzugefügt)
        bgPreset: document.getElementById('qr-bg-preset')?.value || 'custom',
        
        // Erweiterte Einstellungen
        quickScanMode: this.settings.quickScanMode || false,
        autoDownload: this.settings.autoDownload || false,
        showPreview: this.settings.showPreview !== false, // Standard: true
        
        // Scanner Einstellungen
        preferredCamera: this.settings.preferredCamera || 'environment',
        scanDelay: this.settings.scanDelay || 500,
        
        // Verlauf Einstellungen
        maxHistoryItems: this.settings.maxHistoryItems || 100,
        autoDeleteHistory: this.settings.autoDeleteHistory || false,
        historyRetentionDays: this.settings.historyRetentionDays || 30,
        
        // Premium Einstellungen
        premiumFeatures: this.settings.premiumFeatures || {},
        
        // Letzte Aktualisierung
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
    };
    
    try {
        // In localStorage speichern
        localStorage.setItem('qr-pro-settings', JSON.stringify(settings));
        
        // Backup in IndexedDB falls verfügbar
        if (this.isOnline && 'indexedDB' in window) {
            this.saveToIndexedDB('settings', settings);
        }
        
        // Einstellungen in Instanz aktualisieren
        this.settings = { ...this.settings, ...settings };
        
        console.log('✅ Einstellungen gespeichert:', settings);
        
        // Benachrichtigung anzeigen
        if (this.settings.notifications) {
            this.showToast('Einstellungen gespeichert', 'success');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Einstellungen:', error);
        this.showToast('Fehler beim Speichern der Einstellungen', 'error');
        return false;
    }
}

// Hilfsmethode für IndexedDB Backup
async saveToIndexedDB(key, data) {
    try {
        const request = indexedDB.open('QRProDB', 1);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
        };
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            store.put(data, key);
        };
        
    } catch (error) {
        console.warn('IndexedDB Backup fehlgeschlagen:', error);
    }
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
        console.log('📷 Starte QR Scanner...');
        
        // Prüfen ob Html5Qrcode verfügbar ist
        if (!window.Html5Qrcode) {
            throw new Error('Html5Qrcode Library nicht verfügbar');
        }

        // Scanner-Container finden
        const scannerContainer = document.getElementById('scanner-container');
        if (!scannerContainer) {
            throw new Error('Scanner-Container nicht gefunden');
        }

        // Scanner bereits aktiv?
        if (this.html5QrCode && this.isScanning) {
            console.log('Scanner bereits aktiv');
            return;
        }

        // Html5QrCode Instanz erstellen
        this.html5QrCode = new Html5Qrcode("scanner-container");

        // Scanner-Konfiguration
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        // Scanner starten mit korrigierter Error-Behandlung
        await this.html5QrCode.start(
            { facingMode: "environment" }, // Rückkamera bevorzugen
            config,
            // SUCCESS CALLBACK
            (decodedText, decodedResult) => {
                console.log('✅ QR Code erkannt:', decodedText);
                this.onScanSuccess(decodedText, decodedResult);
            },
            // ERROR CALLBACK - KORRIGIERT
            (errorMessage) => {
                // Sichere Error-Behandlung
                if (errorMessage !== null && errorMessage !== undefined) {
                    // Als String behandeln
                    const errorStr = String(errorMessage);
                    
                    // Normale "Kein QR gefunden" Fehler ignorieren
                    const normalErrors = [
                        'No MultiFormat Readers',
                        'NotFoundException', 
                        'NotFoundError',
                        'No QR code found',
                        'QR code parse error'
                    ];
                    
                    const isNormalError = normalErrors.some(err => 
                        errorStr.includes(err)
                    );
                    
                    if (!isNormalError) {
                        console.log('Scanner Fehler:', errorStr);
                    }
                } else {
                    // errorMessage ist null/undefined - ignorieren
                    // (Das ist normal bei jedem Frame ohne QR Code)
                }
            }
        );

        this.isScanning = true;
        this.updateScannerUI();
        console.log('✅ Scanner erfolgreich gestartet');
        this.showToast('Scanner aktiv - Halten Sie einen QR Code vor die Kamera', 'success');

    } catch (error) {
        console.error('❌ Scanner-Start fehlgeschlagen:', error);
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
    
    if (this.isScanning) {
        if (startBtn) startBtn.textContent = 'Scanner läuft...';
        if (stopBtn) stopBtn.style.display = 'inline-block';
    } else {
        if (startBtn) startBtn.textContent = 'Scanner starten';
        if (stopBtn) stopBtn.style.display = 'none';
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

// Vereinfachte stopScanner Methode
async stopScanner() {
  console.log('🛑 Stoppe Scanner...');
  
  if (this.html5QrCode && this.isScanning) {
    try {
      await this.html5QrCode.stop();
      await this.html5QrCode.clear();
      console.log('✅ Scanner gestoppt');
    } catch (error) {
      console.warn('Warnung beim Scanner stoppen:', error);
    }
  }
  
  this.isScanning = false;
  
  // UI updaten
  const startBtn = document.getElementById('start-scanner');
  const stopBtn = document.getElementById('stop-scanner');
  
  if (startBtn) startBtn.style.display = 'block';
  if (stopBtn) stopBtn.style.display = 'none';
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

  // In der QRProApp Klasse hinzufügen
setupBackgroundPresets() {
    const bgPresetSelect = document.getElementById('qr-bg-preset');
    const bgColorInput = document.getElementById('qr-bg-color');
    
    if (!bgPresetSelect || !bgColorInput) return;
    
    // Preset-Farben definieren
    this.bgPresets = {
        'white': '#ffffff',
        'cream': '#fefef7', 
        'pearl': '#f8f8ff',
        'light-gray': '#f5f5f5',
        'warm-gray': '#f7f5f3',
        'cool-gray': '#f1f3f4',
        'beige': '#f5f5dc',
        'sand': '#f4e8d0', 
        'ivory': '#fffff0',
        'linen': '#faf0e6',
        'mint': '#f0fff4',
        'lavender': '#f8f4ff'
    };
    
    // Event Listener für Preset-Auswahl
    bgPresetSelect.addEventListener('change', (e) => {
        const selectedPreset = e.target.value;
        
        if (selectedPreset === 'custom') {
            // Benutzer kann eigene Farbe wählen
            bgColorInput.disabled = false;
        } else if (this.bgPresets[selectedPreset]) {
            // Preset-Farbe anwenden
            bgColorInput.value = this.bgPresets[selectedPreset];
            bgColorInput.disabled = true;
            
            // Vorschau aktualisieren
            this.updatePreview();
            
            // Toast-Benachrichtigung
            this.showToast(`Hintergrund-Preset "${this.getPresetName(selectedPreset)}" angewendet`, 'success');
        }
    });
    
    // Initialer Zustand
    bgColorInput.disabled = bgPresetSelect.value !== 'custom';
}

// Preset-Namen für Benutzeranzeige
getPresetName(presetKey) {
    const presetNames = {
        'white': 'Reines Weiß',
        'cream': 'Cremeweiß',
        'pearl': 'Perlweiß',
        'light-gray': 'Hellgrau',
        'warm-gray': 'Warmes Grau',
        'cool-gray': 'Kühles Grau',
        'beige': 'Beige',
        'sand': 'Sandton',
        'ivory': 'Elfenbein', 
        'linen': 'Leinen',
        'mint': 'Mint',
        'lavender': 'Lavendel'
    };
    
    return presetNames[presetKey] || presetKey;
}

// In der init() Methode hinzufügen
async init() {
    this.showLoadingScreen();
    this.setupEventListeners();
    this.setupBackgroundPresets(); // Neue Zeile hinzufügen
    this.initializeData();
    await this.loadLibraries();
    this.registerServiceWorker();
}

// Visuelle Preset-Vorschau erstellen
createPresetOptions() {
    const bgPresetSelect = document.getElementById('qr-bg-preset');
    if (!bgPresetSelect) return;
    
    // Optionen mit visuellen Indikatoren ersetzen
    bgPresetSelect.innerHTML = '';
    
    // Custom Option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Eigene Farbe';
    bgPresetSelect.appendChild(customOption);
    
    // Preset Options mit Farb-Indikatoren
    Object.entries(this.bgPresets).forEach(([key, color]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${this.getPresetName(key)}`;
        option.style.background = color;
        bgPresetSelect.appendChild(option);
    });
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

// PWA Install funktionalität (am Ende von app.js hinzufügen)
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
        this.init();
    }

    init() {
        this.setupColorPresets();
        this.setupSizeSelector();
        this.setupColorPickers();
    }

    // Farbenvorauswahl Setup
    setupColorPresets() {
        const colorPresets = document.querySelectorAll('.color-preset');
        const qrColorInput = document.getElementById('qr-color');
        
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                
                // Aktiven Zustand setzen
                colorPresets.forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                
                // Farbe übernehmen
                if (qrColorInput) {
                    qrColorInput.value = color;
                    this.qrColor = color;
                    this.updatePreview();
                }
            });
        });

        // Standard-Preset (schwarz) als aktiv markieren
        const defaultPreset = document.querySelector('.color-preset[data-color="#000000"]');
        if (defaultPreset) {
            defaultPreset.classList.add('active');
        }
    }

    // Color Picker Event Listeners
    setupColorPickers() {
        const qrColorInput = document.getElementById('qr-color');
        const qrBgColorInput = document.getElementById('qr-bg-color');

        if (qrColorInput) {
            qrColorInput.addEventListener('change', (e) => {
                this.qrColor = e.target.value;
                
                // Preset-Auswahl zurücksetzen wenn Custom-Color verwendet
                document.querySelectorAll('.color-preset').forEach(preset => {
                    if (preset.dataset.color === e.target.value) {
                        preset.classList.add('active');
                    } else {
                        preset.classList.remove('active');
                    }
                });
                
                this.updatePreview();
            });
        }

        if (qrBgColorInput) {
            qrBgColorInput.addEventListener('change', (e) => {
                this.qrBgColor = e.target.value;
                this.updatePreview();
            });
        }
    }

    // Größenauswahl Setup
    setupSizeSelector() {
        const sizeSelector = document.getElementById('qr-size');
        
        if (sizeSelector) {
            sizeSelector.addEventListener('change', (e) => {
                const selectedSize = e.target.value;
                
                // Premium-Check für große Größen
                if (selectedSize === '800' && !this.hasPremium()) {
                    this.showPremiumModal();
                    sizeSelector.value = this.qrSize; // Zurücksetzen
                    return;
                }
                
                this.qrSize = selectedSize;
                this.updatePreview();
                this.showSizeToast(selectedSize);
            });
        }
    }

    // Preview aktualisieren
    updatePreview() {
        const content = document.getElementById('qr-content')?.value.trim();
        if (!content || !window.QRCode) return;

        const preview = document.querySelector('.qr-preview');
        if (!preview) return;

        try {
            // Vorherigen QR Code löschen
            preview.innerHTML = '';

            // QR Code mit aktuellen Einstellungen generieren
            const qr = new QRCode(preview, {
                text: content,
                width: parseInt(this.qrSize),
                height: parseInt(this.qrSize),
                colorDark: this.qrColor,
                colorLight: this.qrBgColor,
                correctLevel: QRCode.CorrectLevel.H
            });

            console.log(`QR Code aktualisiert: ${this.qrSize}px, Farbe: ${this.qrColor}`);

        } catch (error) {
            console.error('Fehler beim QR Preview Update:', error);
        }
    }

    // Toast für Größenänderung
    showSizeToast(size) {
        const sizeNames = {
            '200': 'Klein',
            '300': 'Mittel', 
            '500': 'Groß',
            '800': 'Sehr groß'
        };

        if (typeof this.showToast === 'function') {
            this.showToast(`QR Code Größe: ${sizeNames[size]} (${size}px)`, 'info');
        }
    }

    // Premium Check (vereinfacht)
    hasPremium() {
        // Hier würde normalerweise der Premium-Status geprüft
        return localStorage.getItem('premium-status') === 'active';
    }

    // Premium Modal anzeigen
    showPremiumModal() {
        const modal = document.getElementById('premium-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        if (typeof this.showToast === 'function') {
            this.showToast('Premium-Feature: Große QR Codes (800px) benötigen Premium', 'warning');
        }
    }

    // Öffentliche Methoden für externe Verwendung
    setColor(color) {
        this.qrColor = color;
        const qrColorInput = document.getElementById('qr-color');
        if (qrColorInput) qrColorInput.value = color;
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
            size: this.qrSize
        };
    }
}

// QR Customization in die Hauptapp integrieren
if (typeof app !== 'undefined') {
    // In bestehende App integrieren
    app.qrCustomization = new QRCustomization();
} else {
    // Standalone initialisieren
    document.addEventListener('DOMContentLoaded', () => {
        window.qrCustomization = new QRCustomization();
    });
}
