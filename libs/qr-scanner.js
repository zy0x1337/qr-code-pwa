// libs/qr-scanner-improved.js
(function(global) {
  'use strict';
  
  class Html5Qrcode {
    constructor(elementId) {
      this.elementId = elementId;
      this.element = document.getElementById(elementId);
      this.isScanning = false;
      this.stream = null;
      this.video = null;
      this.jsQR = null; // Für jsQR Bibliothek
      this.loadJsQR();
    }
    
    async loadJsQR() {
      // JsQR Bibliothek dynamisch laden
      if (typeof jsQR === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        script.onload = () => {
          console.log('✅ jsQR library loaded');
          this.jsQR = window.jsQR;
        };
        document.head.appendChild(script);
      } else {
        this.jsQR = window.jsQR;
      }
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
        
        // Canvas für Analyse
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Kamera-Stream
        const constraints = {
          video: {
            facingMode: cameraIdOrConfig.facingMode || 'environment',
            width: { ideal: 1280, min: 640 }, // Höhere Auflösung für bessere Erkennung
            height: { ideal: 720, min: 480 }
          }
        };
        
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
        
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
      
      requestAnimationFrame(() => {
        this._analyzeFrame();
        this._startScanLoop();
      });
    }
    
    _analyzeFrame() {
      if (!this.video.videoWidth || !this.video.videoHeight || !this.jsQR) return;
      
      // Canvas-Größe an Video anpassen
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      
      // Aktuellen Frame auf Canvas zeichnen
      this.ctx.drawImage(this.video, 0, 0);
      
      // Bild-Daten für jsQR holen
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // jsQR für echte QR-Code-Erkennung verwenden
      const code = this.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert" // Performance-Optimierung
      });
      
      if (code && code.data) {
        console.log('✅ QR-Code gefunden:', code.data);
        
        if (this.successCallback) {
          this.successCallback(code.data, {
            location: code.location,
            binaryData: code.binaryData
          });
        }
      }
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
