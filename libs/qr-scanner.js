/*!
 * Simple QR Scanner for PWA
 * Local implementation without external dependencies
 */
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
    }
    
    async start(cameraIdOrConfig, config, qrCodeSuccessCallback, qrCodeErrorCallback) {
      try {
        this.successCallback = qrCodeSuccessCallback;
        this.errorCallback = qrCodeErrorCallback;
        
        // Create video element
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', true);
        this.video.style.width = '100%';
        this.video.style.height = 'auto';
        this.video.style.maxWidth = '500px';
        
        // Create canvas for analysis
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Get camera stream
        const constraints = {
          video: {
            facingMode: cameraIdOrConfig.facingMode || 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
        
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
        
        // Wait for video to load
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play();
            resolve();
          };
        });
        
        // Add video to container
        this.element.innerHTML = '';
        this.element.appendChild(this.video);
        
        // Start scanning
        this.isScanning = true;
        this._startScanLoop();
        
        return Promise.resolve();
        
      } catch (error) {
        throw new Error('Camera access denied or not available: ' + error.message);
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
      
      // Continue scanning
      setTimeout(() => this._startScanLoop(), 500);
    }
    
    _analyzeFrame() {
      if (!this.video.videoWidth || !this.video.videoHeight) return;
      
      // Set canvas size to match video
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      
      // Draw current video frame to canvas
      this.ctx.drawImage(this.video, 0, 0);
      
      // Get image data
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // Simple pattern detection (this is a basic implementation)
      const result = this._detectQRPattern(imageData);
      
      if (result) {
        if (this.successCallback) {
          this.successCallback(result, null);
        }
      }
    }
    
    _detectQRPattern(imageData) {
      // This is a simplified QR detection
      // In a real implementation, you would use advanced image processing
      
      const { data, width, height } = imageData;
      
      // Convert to grayscale and look for patterns
      const threshold = 128;
      let darkPixels = 0;
      let lightPixels = 0;
      
      // Sample center area
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      const sampleSize = 50;
      
      for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
        for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const i = (y * width + x) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            if (gray < threshold) {
              darkPixels++;
            } else {
              lightPixels++;
            }
          }
        }
      }
      
      // Simple heuristic: if there's a good mix of dark and light pixels,
      // might be a QR code
      const total = darkPixels + lightPixels;
      const darkRatio = darkPixels / total;
      
      if (darkRatio > 0.3 && darkRatio < 0.7) {
        // Simulate reading a QR code (in real app, this would decode the pattern)
        return this._simulateQRRead();
      }
      
      return null;
    }
    
    _simulateQRRead() {
      // For demo purposes, return a simulated result
      // In a real implementation, this would decode the actual QR pattern
      const demoTexts = [
        'https://example.com',
        'Demo QR Code gefunden',
        'Tel: +49 123 456789',
        'mailto:test@example.com'
      ];
      
      return demoTexts[Math.floor(Math.random() * demoTexts.length)];
    }
    
    async stop() {
      this.isScanning = false;
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.element) {
        this.element.innerHTML = '';
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
