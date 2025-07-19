// libs/qr-scanner.js - Korrigierte jsQR Integration
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
      this.jsQR = null;
      this.jsQRLoaded = false;
      this.jsQRLoadPromise = null;
    }
    
    // Warten bis jsQR vollständig geladen ist
    async loadJsQR() {
      if (this.jsQRLoadPromise) {
        return this.jsQRLoadPromise; // Bereits am Laden
      }
      
      if (typeof window.jsQR !== 'undefined') {
        this.jsQR = window.jsQR;
        this.jsQRLoaded = true;
        console.log('✅ jsQR already available');
        return Promise.resolve();
      }
      
      console.log('🔄 Loading jsQR library...');
      
      this.jsQRLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        
        script.onload = () => {
          if (typeof window.jsQR !== 'undefined') {
            this.jsQR = window.jsQR;
            this.jsQRLoaded = true;
            console.log('✅ jsQR library loaded successfully');
            resolve();
          } else {
            console.error('❌ jsQR loaded but not available in window');
            reject(new Error('jsQR not available after loading'));
          }
        };
        
        script.onerror = (error) => {
          console.error('❌ Failed to load jsQR library');
          reject(new Error('Failed to load jsQR library'));
        };
        
        // Timeout nach 10 Sekunden
        setTimeout(() => {
          if (!this.jsQRLoaded) {
            console.error('❌ jsQR loading timeout');
            reject(new Error('jsQR loading timeout'));
          }
        }, 10000);
        
        document.head.appendChild(script);
      });
      
      return this.jsQRLoadPromise;
    }
    
    async start(cameraIdOrConfig, config, qrCodeSuccessCallback, qrCodeErrorCallback) {
      try {
        this.successCallback = qrCodeSuccessCallback;
        this.errorCallback = qrCodeErrorCallback;
        
        // 1. ERST jsQR laden und warten
        console.log('🔄 Ensuring jsQR is loaded...');
        await this.loadJsQR();
        
        if (!this.jsQRLoaded) {
          throw new Error('jsQR library failed to load');
        }
        
        console.log('✅ jsQR ready, starting camera...');
        
        // 2. DANN Kamera initialisieren
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', true);
        this.video.style.width = '100%';
        this.video.style.height = 'auto';
        this.video.style.maxWidth = '500px';
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 3. Kamera-Stream anfordern
        const constraints = {
          video: {
            facingMode: cameraIdOrConfig.facingMode || 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        };
        
        console.log('📹 Requesting camera stream...');
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
        
        // 4. Warten bis Video bereit ist
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play();
            console.log('📹 Video ready:', this.video.videoWidth, 'x', this.video.videoHeight);
            resolve();
          };
        });
        
        // 5. Video zum Container hinzufügen
        this.element.innerHTML = '';
        this.element.appendChild(this.video);
        
        // 6. Scanning starten - JETZT ist alles bereit
        this.isScanning = true;
        console.log('🔍 Starting QR scan loop...');
        this._startScanLoop();
        
        return Promise.resolve();
        
      } catch (error) {
        console.error('💥 Scanner start failed:', error);
        throw new Error('Scanner start failed: ' + error.message);
      }
    }
    
    _startScanLoop() {
      if (!this.isScanning) return;
      
      requestAnimationFrame(() => {
        try {
          this._analyzeFrame();
        } catch (error) {
          console.error('Frame analysis error:', error);
        }
        this._startScanLoop();
      });
    }
    
    _analyzeFrame() {
      // Alle Voraussetzungen prüfen
      if (!this.video || !this.video.videoWidth || !this.video.videoHeight) {
        return; // Video noch nicht bereit
      }
      
      if (!this.jsQRLoaded || !this.jsQR) {
        console.warn('⚠️ jsQR not ready for analysis');
        return;
      }
      
      try {
        // Canvas an Video-Größe anpassen
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Frame auf Canvas zeichnen
        this.ctx.drawImage(this.video, 0, 0);
        
        // Bild-Daten für jsQR extrahieren
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // jsQR aufrufen - KORRIGIERTE Parameter
        const code = this.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        
        if (code && code.data && code.data.trim()) {
          console.log('🎉 QR-Code detected:', code.data);
          
          // Scanner stoppen nach Fund
          this.stop();
          
          if (this.successCallback) {
            this.successCallback(code.data, {
              location: code.location,
              binaryData: code.binaryData
            });
          }
        }
        
      } catch (error) {
        console.error('❌ QR analysis error:', error);
        if (this.errorCallback) {
          this.errorCallback('Analysis error: ' + error.message);
        }
      }
    }
    
    async stop() {
      console.log('🛑 Stopping scanner...');
      this.isScanning = false;
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
          console.log('📹 Camera track stopped');
        });
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
    
    // Debug-Methode
    getStatus() {
      return {
        jsQRLoaded: this.jsQRLoaded,
        jsQRAvailable: typeof this.jsQR === 'function',
        isScanning: this.isScanning,
        videoReady: this.video ? this.video.readyState === 4 : false,
        videoSize: this.video ? `${this.video.videoWidth}x${this.video.videoHeight}` : 'none'
      };
    }
  }
  
  // Export
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = { Html5Qrcode };
  } else {
    global.Html5Qrcode = Html5Qrcode;
  }
  
})(typeof window !== 'undefined' ? window : this);
