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
    
    this.init();
  }

  init() {
    this.showLoadingScreen();
    this.setupEventListeners();
    this.initializeData();
    this.registerServiceWorker();
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
    // Onboarding
    document.getElementById('next-onboarding')?.addEventListener('click', () => this.nextSlide());
    document.getElementById('skip-onboarding')?.addEventListener('click', () => this.skipOnboarding());
    
    document.querySelectorAll('.dot').forEach((dot, index) => {
      dot.addEventListener('click', () => this.goToSlide(index));
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigateToPage(page);
      });
    });

    // Generator
    document.getElementById('generate-btn')?.addEventListener('click', () => this.generateQRCode());
    document.getElementById('qr-content')?.addEventListener('input', () => this.updatePreview());
    document.getElementById('qr-type')?.addEventListener('change', () => this.updateContentPlaceholder());
    
    // Scanner
    document.getElementById('start-scanner')?.addEventListener('click', () => this.startScanner());
    document.getElementById('stop-scanner')?.addEventListener('click', () => this.stopScanner());
    
    // Settings
    document.getElementById('theme-selector')?.addEventListener('change', (e) => this.changeTheme(e.target.value));
    
    // Quick actions
    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  // QR Code Generation
  async generateQRCode() {
    const content = document.getElementById('qr-content').value.trim();
    const type = document.getElementById('qr-type').value;
    
    if (!content) {
      this.showToast('Bitte geben Sie Inhalt für den QR Code ein', 'error');
      return;
    }

    // Check daily limit for free users
    if (this.userTier === 'free' && this.dailyQRCount >= this.dailyLimit) {
      this.showPremiumPrompt();
      return;
    }

    const preview = document.getElementById('qr-preview');
    const downloadBtn = document.getElementById('download-btn');
    
    try {
      // Clear previous QR code
      preview.innerHTML = '';
      
      // Generate QR code using qrcode.js library
      const qrCodeDataURL = await QRCode.toDataURL(content, {
        width: 300,
        margin: 2,
        color: {
          dark: document.getElementById('qr-color')?.value || '#000000',
          light: document.getElementById('qr-bg-color')?.value || '#FFFFFF'
        }
      });
      
      const img = document.createElement('img');
      img.src = qrCodeDataURL;
      img.alt = 'Generated QR Code';
      img.className = 'qr-code-image';
      
      preview.appendChild(img);
      downloadBtn.style.display = 'block';
      
      // Save to history
      this.addToHistory({
        type: 'generated',
        content: content,
        qrType: type,
        dataURL: qrCodeDataURL,
        timestamp: Date.now()
      });
      
      // Update daily count
      this.dailyQRCount++;
      localStorage.setItem('qr-pro-daily-count', this.dailyQRCount.toString());
      
      this.showToast('QR Code erfolgreich generiert!', 'success');
      this.updateDashboard();
      
    } catch (error) {
      console.error('QR Generation Error:', error);
      this.showToast('Fehler beim Generieren des QR Codes', 'error');
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
