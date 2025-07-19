// Verbesserte QR-Scanner Implementierung
(function(global) {
  'use strict';
  
  class Html5Qrcode {
    constructor(elementId) {
      this.elementId = elementId;
      this.element = document.getElementById(elementId);
      this.isScanning = false;
      this.stream = null;
      this.video = null;
      this.canvas = null;
      this.ctx = null;
      this.scanCount = 0; // Counter für Scan-Versuche
      this.lastScanResult = null;
      this.confirmationCount = 0; // Bestätigung für gleichen QR-Code
    }
    
    async start(cameraIdOrConfig, config, qrCodeSuccessCallback, qrCodeErrorCallback) {
      try {
        this.successCallback = qrCodeSuccessCallback;
        this.errorCallback = qrCodeErrorCallback;
        
        // Video-Element erstellen
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', true);
        this.video.style.width = '100%';
        this.video.style.height = 'auto';
        this.video.style.maxWidth = '500px';
        
        // Canvas für Analyse erstellen
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Kamera-Stream anfordern
        const constraints = {
          video: {
            facingMode: cameraIdOrConfig.facingMode || 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
        
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
        
        // Warten bis Video geladen ist
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play();
            resolve();
          };
        });
        
        // Video zum Container hinzufügen
        this.element.innerHTML = '';
        this.element.appendChild(this.video);
        
        // Scanning starten
        this.isScanning = true;
        this._startScanLoop();
        
        return Promise.resolve();
        
      } catch (error) {
        throw new Error('Kamera-Zugriff fehlgeschlagen: ' + error.message);
      }
    }
    
    _startScanLoop() {
      if (!this.isScanning) return;
      
      try {
        this._analyzeFrame();
      } catch (error) {
        if (this.errorCallback) {
          this.errorCallback(error.message);
        }
      }
      
      // Nächsten Scan nach 500ms
      setTimeout(() => this._startScanLoop(), 500);
    }
    
    _analyzeFrame() {
      if (!this.video.videoWidth || !this.video.videoHeight) return;
      
      // Canvas-Größe anpassen
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      
      // Aktuellen Frame auf Canvas zeichnen
      this.ctx.drawImage(this.video, 0, 0);
      
      // Bild-Daten für Analyse holen
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // Vereinfachte QR-Code-Erkennung
      const result = this._detectQRPattern(imageData);
      
      if (result) {
        // Mehrfache Bestätigung des gleichen Codes
        if (result === this.lastScanResult) {
          this.confirmationCount++;
          if (this.confirmationCount >= 3) { // 3 aufeinanderfolgende gleiche Erkennungen
            if (this.successCallback) {
              this.successCallback(result, null);
            }
            this.confirmationCount = 0;
            this.lastScanResult = null;
          }
        } else {
          this.lastScanResult = result;
          this.confirmationCount = 1;
        }
      } else {
        // Reset wenn kein QR-Code erkannt
        this.confirmationCount = 0;
        if (this.scanCount % 20 === 0) { // Nur jeden 20. Versuch loggen
          console.log('🔍 QR-Code wird gesucht...');
        }
      }
      
      this.scanCount++;
    }
    
    _detectQRPattern(imageData) {
      // **WICHTIG**: Diese Methode sollte echte QR-Codes erkennen
      // Für Demo-Zwecke: Sehr restriktive Erkennung
      
      const { data, width, height } = imageData;
      
      // Nur im Zentrum nach QR-Codes suchen
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      const searchRadius = 100;
      
      let darkPatterns = 0;
      let lightPatterns = 0;
      let totalPixels = 0;
      
      // Muster-Erkennung im Zentrum
      for (let y = centerY - searchRadius; y < centerY + searchRadius; y += 5) {
        for (let x = centerX - searchRadius; x < centerX + searchRadius; x += 5) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const i = (y * width + x) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            if (gray < 100) darkPatterns++;
            else if (gray > 200) lightPatterns++;
            totalPixels++;
          }
        }
      }
      
      // Sehr spezifische Kriterien für QR-Code-Erkennung
      const darkRatio = darkPatterns / totalPixels;
      const lightRatio = lightPatterns / totalPixels;
      
      // QR-Code hat typischerweise 40-60% dunkle und 20-40% helle Bereiche
      if (darkRatio > 0.4 && darkRatio < 0.6 && lightRatio > 0.2 && lightRatio < 0.4) {
        // Zusätzliche Prüfung auf Ecken-Muster
        if (this._detectPositionMarkers(data, width, height, centerX, centerY)) {
          // **NUR FÜR DEMO**: Geben Sie eine Test-URL zurück
          // In einer echten Implementierung würden Sie hier den QR-Code decodieren
          return this._generateTestData();
        }
      }
      
      return null;
    }
    
    _detectPositionMarkers(data, width, height, centerX, centerY) {
      // Vereinfachte Positionsmarker-Erkennung
      // Suche nach 3 Ecken-Quadraten
      
      const markerSize = 20;
      let markerCount = 0;
      
      // Positionen der drei Positionsmarker in einem QR-Code
      const positions = [
        [centerX - 60, centerY - 60], // Oben links
        [centerX + 60, centerY - 60], // Oben rechts  
        [centerX - 60, centerY + 60]  // Unten links
      ];
      
      positions.forEach(([x, y]) => {
        if (this._isPositionMarker(data, width, height, x, y, markerSize)) {
          markerCount++;
        }
      });
      
      // Mindestens 2 von 3 Markern müssen erkannt werden
      return markerCount >= 2;
    }
    
    _isPositionMarker(data, width, height, centerX, centerY, size) {
      let darkPixels = 0;
      let totalPixels = 0;
      
      for (let y = centerY - size; y < centerY + size; y += 2) {
        for (let x = centerX - size; x < centerX + size; x += 2) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const i = (y * width + x) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            if (gray < 128) darkPixels++;
            totalPixels++;
          }
        }
      }
      
      const darkRatio = darkPixels / totalPixels;
      return darkRatio > 0.6; // Positionsmarker sind überwiegend dunkel
    }
    
    _generateTestData() {
      // Demo-Daten für Tests
      const testURLs = [
        'https://www.google.com',
        'https://github.com',
        'Hallo Welt - Test QR Code',
        'test@example.com',
        '+49 123 456789'
      ];
      
      return testURLs[Math.floor(Math.random() * testURLs.length)];
    }
    
    async stop() {
      this.isScanning = false;
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.element) {
        this.element.innerHTML = '<div class="scanner-placeholder">Scanner gestoppt</div>';
      }
      
      return Promise.resolve();
    }
    
    clear() {
      this.stop();
    }
  }
  
  // Export
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = { Html5Qrcode };
  } else {
    global.Html5Qrcode = Html5Qrcode;
  }
  
})(typeof window !== 'undefined' ? window : this);
