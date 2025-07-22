// Legal Modal System mit Event-Delegation und robuster Error-Behandlung
(function() {
  'use strict';

  const LegalModal = {
    // Modal-Elemente
    overlay: null,
    container: null,
    title: null,
    body: null,
    isInitialized: false,

    // Initialisierung mit Fehlerbehandlung
    init() {
      try {
        console.log('🔧 LegalModal wird initialisiert...');
        
        // DOM-Elemente suchen
        this.overlay = document.getElementById('legalModal');
        this.container = this.overlay?.querySelector('.modal-container');
        this.title = document.getElementById('modalTitle');
        this.body = document.getElementById('modalBody');

        if (!this.overlay) {
          console.warn('⚠️ LegalModal HTML nicht gefunden - erstelle Fallback');
          this.createFallbackModal();
        }

        // Event Listeners einrichten
        this.setupEventListeners();
        this.setupLegalLinksEventDelegation();
        
        this.isInitialized = true;
        console.log('✅ LegalModal erfolgreich initialisiert');
        
      } catch (error) {
        console.error('❌ LegalModal Initialisierungsfehler:', error);
        this.setupFallbackSystem();
      }
    },

    // Event Listeners für Modal-Funktionen
    setupEventListeners() {
      if (!this.overlay) return;

      // Overlay-Click zum Schließen
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });

      // Escape-Taste zum Schließen
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      });

      // Close-Button
      const closeBtn = this.overlay.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }
    },

    // Event-Delegation für Legal-Links (HAUPTFUNKTION)
    setupLegalLinksEventDelegation() {
      console.log('🔗 Event-Delegation für Legal-Links wird eingerichtet...');
      
      // Event-Delegation für das gesamte Dokument
      document.addEventListener('click', (e) => {
        // Prüfen ob geklicktes Element ein Legal-Link ist
        const target = e.target;
        const link = target.closest('a[data-legal]');
        
        if (link) {
          e.preventDefault();
          const type = link.dataset.legal;
          console.log(`📋 Legal-Link geklickt: ${type}`);
          this.show(type);
          return;
        }

        // Fallback für alte onclick-Links
        if (target.onclick && target.onclick.toString().includes('LegalModal.show')) {
          e.preventDefault();
          const onclickStr = target.onclick.toString();
          const match = onclickStr.match(/LegalModal\.show\(['"]([^'"]+)['"]\)/);
          if (match) {
            const type = match[1];
            console.log(`📋 Fallback Legal-Link: ${type}`);
            this.show(type);
          }
        }
      });

      // Bestehende onclick-Links zu data-legal konvertieren
      this.convertOldLinksToDataAttributes();
      
      console.log('✅ Event-Delegation erfolgreich eingerichtet');
    },

    // Alte onclick-Links konvertieren
    convertOldLinksToDataAttributes() {
      const links = document.querySelectorAll('a[onclick*="LegalModal.show"]');
      
      links.forEach(link => {
        const onclickStr = link.getAttribute('onclick');
        const match = onclickStr.match(/LegalModal\.show\(['"]([^'"]+)['"]\)/);
        
        if (match) {
          const type = match[1];
          link.setAttribute('data-legal', type);
          link.removeAttribute('onclick');
          console.log(`🔄 Link konvertiert: ${type}`);
        }
      });
    },

    // Modal öffnen mit Sicherheitschecks
    show(type) {
      if (!this.isInitialized) {
        console.warn('⚠️ LegalModal nicht initialisiert - verwende Fallback');
        this.showFallback(type);
        return;
      }

      if (!this.overlay) {
        console.error('❌ Modal-Overlay nicht verfügbar');
        this.showFallback(type);
        return;
      }

      try {
        const content = this.getContent(type);
        if (!content) {
          console.error(`❌ Kein Content für Typ: ${type}`);
          this.showFallback(type);
          return;
        }

        // Content setzen
        if (this.title) this.title.textContent = content.title;
        if (this.body) this.body.innerHTML = content.body;

        // Modal anzeigen
        this.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Animation starten
        requestAnimationFrame(() => {
          this.overlay.classList.add('show');
        });

        // Focus Management
        if (this.container) {
          this.container.focus();
        }

        console.log(`✅ Modal geöffnet: ${type}`);

      } catch (error) {
        console.error('❌ Fehler beim Öffnen des Modals:', error);
        this.showFallback(type);
      }
    },

    // Modal schließen
    close() {
      if (!this.overlay || !this.isOpen()) return;

      try {
        // Animation
        this.overlay.classList.remove('show');

        // Nach Animation verstecken
        setTimeout(() => {
          if (this.overlay) {
            this.overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
          }
        }, 300);

        console.log('✅ Modal geschlossen');

      } catch (error) {
        console.error('❌ Fehler beim Schließen des Modals:', error);
      }
    },

    // Prüfen ob Modal offen ist
    isOpen() {
      return this.overlay?.classList.contains('show') || false;
    },

    // Content für verschiedene Typen
    getContent(type) {
      const contents = {
        privacy: {
          title: 'Datenschutzerklärung',
          body: this.getPrivacyContent()
        },
        imprint: {
          title: 'Impressum',
          body: this.getImprintContent()
        },
        terms: {
          title: 'Nutzungsbedingungen',
          body: this.getTermsContent()
        },
        faq: {
          title: 'Häufig gestellte Fragen',
          body: this.getFAQContent()
        }
      };

      return contents[type] || null;
    },

    // Fallback-Modal erstellen falls HTML fehlt
    createFallbackModal() {
      const modalHTML = `
        <div id="legalModal" class="modal-overlay" aria-hidden="true" style="
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s ease;
        ">
          <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modalTitle" style="
            position: relative;
            background: white;
            margin: 2rem auto;
            padding: 0;
            max-width: 800px;
            max-height: 90vh;
            border-radius: 8px;
            overflow: hidden;
            transform: translateY(-50px);
            transition: transform 0.3s ease;
          ">
            <div class="modal-header" style="
              padding: 1.5rem;
              border-bottom: 1px solid #eee;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <h2 id="modalTitle" class="modal-title" style="margin: 0; color: #333;"></h2>
              <button class="modal-close" aria-label="Modal schließen" style="
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                color: #666;
              ">&times;</button>
            </div>
            <div class="modal-content" style="
              max-height: calc(90vh - 140px);
              overflow-y: auto;
            ">
              <div id="modalBody" class="modal-body" style="
                padding: 1.5rem;
                line-height: 1.6;
                color: #444;
              "></div>
            </div>
            <div class="modal-footer" style="
              padding: 1rem 1.5rem;
              border-top: 1px solid #eee;
              text-align: right;
            ">
              <button class="btn btn-primary modal-close-btn" style="
                background: #007cba;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
              ">Verstanden</button>
            </div>
          </div>
        </div>

        <style>
          .modal-overlay.show {
            display: block !important;
            opacity: 1 !important;
          }
          .modal-overlay.show .modal-container {
            transform: translateY(0) !important;
          }
          .modal-close:hover, .modal-close-btn:hover {
            background-color: rgba(0,0,0,0.1) !important;
          }
        </style>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Neue Referenzen setzen
      this.overlay = document.getElementById('legalModal');
      this.container = this.overlay.querySelector('.modal-container');
      this.title = document.getElementById('modalTitle');
      this.body = document.getElementById('modalBody');

      console.log('✅ Fallback-Modal erstellt');
    },

    // Fallback-System für kritische Fehler
    setupFallbackSystem() {
      window.LegalModal = {
        show: (type) => this.showFallback(type),
        close: () => console.log('Fallback close called')
      };
    },

    // Einfacher Alert-Fallback
    showFallback(type) {
      const titles = {
        privacy: 'Datenschutzerklärung',
        imprint: 'Impressum',
        terms: 'Nutzungsbedingungen',
        faq: 'FAQ'
      };

      const content = this.getContent(type);
      if (content) {
        // Einfaches Text-Modal
        alert(`${content.title}\n\n${content.body.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim()}`);
      } else {
        alert(`${titles[type] || 'Information'}\n\nDie Informationen werden geladen. Bitte versuchen Sie es erneut.`);
      }
    },

    getPrivacyContent() {
    return `
        <div class="legal-content">
            <div class="legal-header">
                <p class="legal-date"><strong>Stand:</strong> ${new Date().toLocaleDateString('de-DE')} | <strong>Version:</strong> 1.0</p>
            </div>

            <div class="legal-section">
                <h3>📱 Übersicht</h3>
                <p>Diese QR Code Progressive Web App (PWA) wurde entwickelt, um Ihre <strong>Privatsphäre zu respektieren</strong>. Alle Daten werden ausschließlich lokal in Ihrem Browser verarbeitet und gespeichert. Es erfolgt <strong>keine Übertragung</strong> personenbezogener Daten an externe Server.</p>
            </div>

            <div class="legal-section">
                <h3>🛡️ Datenschutz-Prinzipien</h3>
                <ul class="legal-list">
                    <strong>Privacy by Design:</strong> Datenschutz ist von Anfang an eingebaut
                    <strong>Lokale Verarbeitung:</strong> Alle Operationen erfolgen in Ihrem Browser
                    <strong>Keine Tracking:</strong> Wir verfolgen Sie nicht und erstellen keine Profile
                    <strong>Minimale Datenerhebung:</strong> Nur notwendige Daten werden verarbeitet
                </ul>
            </div>

            <div class="legal-section">
                <h3>💾 Lokale Datenspeicherung</h3>
                <p>Folgende Daten werden <strong>ausschließlich lokal</strong> in Ihrem Browser gespeichert:</p>
                <ul class="legal-list">
                    <strong>QR Code Verlauf:</strong> Von Ihnen generierte QR Codes
                    <strong>Scan-Verlauf:</strong> Gescannte QR Code Inhalte
                    <strong>App-Einstellungen:</strong> Design-Präferenzen, Benachrichtigungseinstellungen
                    <strong>Temporäre Daten:</strong> QR Code Vorschaubilder, Upload-Cache
                    <strong>Service Worker Cache:</strong> App-Dateien für Offline-Funktionalität
                </ul>
                <div class="legal-note">
                    <strong>💡 Hinweis:</strong> Diese Daten bleiben auf Ihrem Gerät und können jederzeit über die App-Einstellungen oder Browser-Einstellungen gelöscht werden.
                </div>
            </div>

            <div class="legal-section">
                <h3>📷 Kamera-Zugriff</h3>
                <p>Für die QR Code Scanner-Funktionalität benötigen wir Zugriff auf Ihre Gerätekamera:</p>
                <ul class="legal-list">
                    <strong>Zweck:</strong> Ausschließlich zum Scannen von QR Codes
                    <strong>Verarbeitung:</strong> Live-Stream für Echtzeit-Erkennung
                    <strong>Speicherung:</strong> Kamerabilder werden <strong>niemals gespeichert</strong>
                    <strong>Kontrolle:</strong> Sie können den Kamera-Zugriff jederzeit widerrufen
                </ul>
                <div class="legal-warning">
                    ⚠️ <strong>Wichtig:</strong> Ohne Kamera-Berechtigung kann die Scanner-Funktion nicht verwendet werden.
                </div>
            </div>

            <div class="legal-section">
                <h3>🔗 Externe Bibliotheken & CDN</h3>
                <p>Diese App nutzt folgende externe Ressourcen für erweiterte Funktionalität:</p>
                <div class="legal-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Bibliothek</th>
                                <th>Zweck</th>
                                <th>Anbieter</th>
                                <th>Datenschutz</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>QRCode.js</strong></td>
                                <td>QR Code Generierung</td>
                                <td>cdnjs.cloudflare.com</td>
                                <td>Keine Datensammlung</td>
                            </tr>
                            <tr>
                                <td><strong>html5-qrcode</strong></td>
                                <td>QR Code Scanner</td>
                                <td>unpkg.com</td>
                                <td>Keine Datensammlung</td>
                            </tr>
                            <tr>
                                <td><strong>Web Fonts</strong></td>
                                <td>Schriftarten</td>
                                <td>r2cdn.perplexity.ai</td>
                                <td>Anonyme Anfragen</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p class="legal-note">Diese Bibliotheken werden über Content Delivery Networks (CDN) geladen. Es werden keine personenbezogenen Daten übermittelt.</p>
            </div>

            <div class="legal-section">
                <h3>🌐 Progressive Web App (PWA) Funktionen</h3>
                <p>Als PWA nutzt diese App erweiterte Browser-Funktionen:</p>
                <ul class="legal-list">
                    <strong>Service Worker:</strong> Für Offline-Funktionalität und Caching
                    <strong>Web App Manifest:</strong> Für Installation auf dem Startbildschirm
                    <strong>LocalStorage/IndexedDB:</strong> Für lokale Datenspeicherung
                    <strong>Push Notifications:</strong> Nur bei expliziter Zustimmung
                </ul>
            </div>

            <div class="legal-section">
                <h3>⚖️ Ihre Rechte (DSGVO)</h3>
                <p>Sie haben folgende Rechte bezüglich Ihrer Daten:</p>
                <div class="legal-rights-grid">
                    <div class="right-item">
                        <strong>🔍 Auskunft</strong>
                        <p>Einsicht in gespeicherte Daten über Browser-Entwicklertools</p>
                    </div>
                    <div class="right-item">
                        <strong>🗑️ Löschung</strong>
                        <p>Daten jederzeit über App-Einstellungen löschbar</p>
                    </div>
                    <div class="right-item">
                        <strong>📤 Übertragung</strong>
                        <p>Export-Funktion für Ihren QR Code Verlauf</p>
                    </div>
                    <div class="right-item">
                        <strong>🛑 Widerspruch</strong>
                        <p>Berechtigungen jederzeit in Browser-Einstellungen widerrufbar</p>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>🔒 Sicherheit</h3>
                <p>Wir setzen folgende Sicherheitsmaßnahmen ein:</p>
                <ul class="legal-list">
                    <strong>HTTPS-Verschlüsselung:</strong> Sichere Datenübertragung
                    <strong>Content Security Policy:</strong> Schutz vor Code-Injection
                    <strong>Same-Origin Policy:</strong> Isolierung der App-Daten
                    <strong>Sichere Storage APIs:</strong> Verschlüsselte lokale Speicherung
                </ul>
            </div>

            <div class="legal-section">
                <h3>📧 Kontakt & Fragen</h3>
                <div class="legal-contact">
                    <p>Bei Fragen zum Datenschutz erreichen Sie uns unter:</p>
                    <div class="contact-info">
                        <strong>📧 E-Mail:</strong> <a href="mailto:privacy@qr-pro.app">privacy@qr-pro.app</a><br>
                        <strong>📝 Formular:</strong> <a href="#" data-legal="faq">Häufige Fragen</a><br>
                        <strong>🕒 Response:</strong> Innerhalb von 48 Stunden
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>📝 Änderungen</h3>
                <p>Wir behalten uns vor, diese Datenschutzerklärung zu aktualisieren, um Änderungen in der App oder rechtlichen Anforderungen Rechnung zu tragen. Sie werden über wesentliche Änderungen durch eine Benachrichtigung in der App informiert.</p>
            </div>

            <div class="legal-footer">
                <div class="legal-summary">
                    <strong>📋 Zusammenfassung:</strong> 
                    Diese QR Code PWA respektiert Ihre Privatsphäre vollständig. Alle Daten bleiben auf Ihrem Gerät, es erfolgt keine Überwachung oder Datensammlung. Sie haben jederzeit die vollständige Kontrolle über Ihre Daten.
                </div>
                <p class="legal-timestamp">Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
        </div>
    `;
},

    getImprintContent() {
    return `
        <div class="legal-content">
            <div class="legal-header">
                <p class="legal-date"><strong>Stand:</strong> ${new Date().toLocaleDateString('de-DE')} | <strong>Gültig ab:</strong> Juli 2025</p>
            </div>

            <div class="legal-section">
                <h3>📍 Anbieter</h3>
                <div class="contact-card">
                    <div class="contact-info">
                        <p class="company-name"><strong>QR Pro Development</strong></p>
                        <p class="contact-line">Max Mustermann</p>
                        <p class="contact-line">Musterstraße 123</p>
                        <p class="contact-line">12345 Musterstadt</p>
                        <p class="contact-line">Deutschland</p>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>📞 Kontaktdaten</h3>
                <div class="contact-grid">
                    <div class="contact-item">
                        <span class="contact-icon">📧</span>
                        <div class="contact-details">
                            <p><strong>E-Mail:</strong></p>
                            <p><a href="mailto:kontakt@qr-pro.app">kontakt@qr-pro.app</a></p>
                        </div>
                    </div>
                    <div class="contact-item">
                        <span class="contact-icon">🌐</span>
                        <div class="contact-details">
                            <p><strong>Website:</strong></p>
                            <p>qr-pro.app</p>
                        </div>
                    </div>
                    <div class="contact-item">
                        <span class="contact-icon">⏰</span>
                        <div class="contact-details">
                            <p><strong>Erreichbarkeit:</strong></p>
                            <p>Montag - Freitag, 9:00 - 17:00 Uhr</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>⚖️ Rechtliche Hinweise</h3>
                <div class="legal-disclaimer">
                    <div class="disclaimer-item">
                        <h4>🔍 Inhaltliche Verantwortung</h4>
                        <p>Die Inhalte unserer Anwendung wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.</p>
                    </div>
                    
                    <div class="disclaimer-item">
                        <h4>🔗 Externe Links</h4>
                        <p>Diese App kann Links zu externen Websites Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
                    </div>
                    
                    <div class="disclaimer-item">
                        <h4>📱 App-Funktionalität</h4>
                        <p>Wir bemühen uns um eine kontinuierliche Verfügbarkeit der App, können jedoch keine hundertprozentige Verfügbarkeit garantieren. Die Nutzung erfolgt auf eigene Verantwortung. Für durch die Nutzung entstehende Schäden übernehmen wir keine Haftung.</p>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>🏛️ Rechtlicher Rahmen</h3>
                <div class="legal-framework">
                    <div class="framework-grid">
                        <div class="framework-item">
                            <strong>🇩🇪 Geltendes Recht</strong>
                            <p>Es gilt das Recht der Bundesrepublik Deutschland</p>
                        </div>
                        <div class="framework-item">
                            <strong>🏢 Gerichtsstand</strong>
                            <p>Gerichtsstand ist Musterstadt, Deutschland</p>
                        </div>
                        <div class="framework-item">
                            <strong>📋 Rechtsgrundlage</strong>
                            <p>Dieses Impressum entspricht den Anforderungen nach § 5 TMG und § 55 RStV</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>🛡️ Urheberrecht</h3>
                <div class="copyright-notice">
                    <p>Die durch die App-Betreiber erstellten Inhalte und Werke unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
                    
                    <div class="copyright-details">
                        <div class="copyright-item">
                            <strong>©️ App-Design & Code:</strong>
                            <span>QR Pro Development ${new Date().getFullYear()}</span>
                        </div>
                        <div class="copyright-item">
                            <strong>📦 Externe Bibliotheken:</strong>
                            <span>Unterliegen den jeweiligen Open-Source-Lizenzen</span>
                        </div>
                        <div class="copyright-item">
                            <strong>🎨 Icons & Grafiken:</strong>
                            <span>Lizenzfrei oder mit entsprechender Lizenz verwendet</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>🔧 Technische Informationen</h3>
                <div class="tech-info">
                    <div class="tech-grid">
                        <div class="tech-item">
                            <strong>💻 Technologie:</strong>
                            <p>Progressive Web App (PWA)</p>
                        </div>
                        <div class="tech-item">
                            <strong>🌍 Hosting:</strong>
                            <p>GitHub Pages / CDN</p>
                        </div>
                        <div class="tech-item">
                            <strong>📊 Analytics:</strong>
                            <p>Keine Tracking-Tools verwendet</p>
                        </div>
                        <div class="tech-item">
                            <strong>🔒 Sicherheit:</strong>
                            <p>HTTPS-Verschlüsselung</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>📝 Streitbeilegung</h3>
                <div class="dispute-resolution">
                    <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:</p>
                    <p class="os-link"><a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a></p>
                    
                    <div class="dispute-notice">
                        <p><strong>📋 Hinweis:</strong> Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
                    </div>
                </div>
            </div>

            <div class="legal-section">
                <h3>🆔 Identifikation</h3>
                <div class="identification-info">
                    <p><strong>Umsatzsteuer-Identifikationsnummer:</strong> DE123456789 <em>(falls zutreffend)</em></p>
                    <p><strong>Registergericht:</strong> Amtsgericht Musterstadt <em>(falls zutreffend)</em></p>
                    <p><strong>Registernummer:</strong> HRB 12345 <em>(falls zutreffend)</em></p>
                    
                    <div class="legal-note">
                        <strong>💡 Hinweis:</strong> Falls Sie Privatperson sind, entfernen Sie die Angaben zu Umsatzsteuer-ID und Registereintragung.
                    </div>
                </div>
            </div>

            <div class="legal-footer">
                <div class="footer-summary">
                    <strong>📋 Zusammenfassung:</strong>
                    Dieses Impressum erfüllt die deutschen Rechtsvorgaben nach TMG und RStV. Alle Angaben sind wahrheitsgemäß und vollständig. Bei Fragen kontaktieren Sie uns über die angegebenen Kontaktdaten.
                </div>
                
                <div class="footer-update">
                    <p class="legal-timestamp">Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                    <p class="legal-version">Version: 2.0 | Gültigkeitsdauer: Unbegrenzt bis zur nächsten Änderung</p>
                </div>
            </div>
        </div>
    `;
},

    getTermsContent() {
      return `
        <h3>1. Geltungsbereich</h3>
        <p>Diese Nutzungsbedingungen gelten für die Verwendung der QR Pro PWA.</p>
        
        <h3>2. Nutzungsrechte</h3>
        <p>Die Nutzung dieser Anwendung ist kostenlos. Sie erhalten ein nicht-übertragbares Recht zur persönlichen Nutzung.</p>
        
        <h3>3. Einschränkungen</h3>
        <p>Es ist untersagt:</p>
        <ul>
          <li>Die App für illegale Zwecke zu nutzen</li>
          <li>Den Quellcode zu dekompilieren oder zu reverse-engineeren</li>
          <li>Die App kommerziell weiterzuvertreiben ohne Lizenz</li>
        </ul>
        
        <h3>4. Haftungsbeschränkung</h3>
        <p>Die Nutzung erfolgt auf eigene Verantwortung. Wir übernehmen keine Haftung für Schäden, die durch die Nutzung entstehen.</p>
        
        <h3>5. Verfügbarkeit</h3>
        <p>Wir bemühen uns um eine hohe Verfügbarkeit, können diese jedoch nicht garantieren.</p>
        
        <p><strong>Stand:</strong> Juli 2025</p>
      `;
    },

    getFAQContent() {
      return `
        <h3>Allgemeine Fragen</h3>
        <p><strong>Ist die App kostenfrei?</strong><br>
        Ja, QR Pro ist komplett kostenfrei nutzbar.</p>
        
        <p><strong>Funktioniert die App offline?</strong><br>
        Ja, dank PWA-Technologie können Sie QR Codes auch ohne Internetverbindung generieren.</p>
        
        <h3>QR Code-Generierung</h3>
        <p><strong>Welche QR Code-Typen werden unterstützt?</strong><br>
        Text, URLs, E-Mail, Telefon, WLAN, vCard und mehr.</p>
        
        <p><strong>Kann ich Logos hinzufügen?</strong><br>
        Ja, Sie können Logos per Drag & Drop hinzufügen und die Größe anpassen.</p>
        
        <h3>Scanning</h3>
        <p><strong>Warum funktioniert der Scanner nicht?</strong><br>
        Stellen Sie sicher, dass Sie Kamera-Zugriff gewährt haben und der QR Code gut beleuchtet ist.</p>
        
        <h3>Daten & Privatsphäre</h3>
        <p><strong>Werden meine QR Codes gespeichert?</strong><br>
        Nur lokal in Ihrem Browser. Keine Daten werden an externe Server gesendet.</p>
        
        <p><strong>Wie lösche ich den Verlauf?</strong><br>
        In den Einstellungen finden Sie die Option "Verlauf löschen".</p>
        
        <h3>Installation</h3>
        <p><strong>Wie installiere ich die PWA?</strong><br>
        Klicken Sie auf "Zur Startseite hinzufügen" in Ihrem Browser oder das Installations-Icon.</p>
      `;
    }
  };

  // Auto-Initialisierung mit verschiedenen Strategien
  function initializeLegalModal() {
    try {
      LegalModal.init();
    } catch (error) {
      console.error('❌ LegalModal Auto-Init Fehler:', error);
      // Retry nach kurzer Verzögerung
      setTimeout(() => {
        try {
          LegalModal.init();
        } catch (retryError) {
          console.error('❌ LegalModal Retry-Init Fehler:', retryError);
          LegalModal.setupFallbackSystem();
        }
      }, 1000);
    }
  }

  // DOM Ready Event-Handling
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLegalModal);
  } else {
    // DOM bereits geladen
    initializeLegalModal();
  }

  // Globaler Zugriff mit Fallback
  window.LegalModal = window.LegalModal || LegalModal;

  // Debugging-Funktion
  window.debugLegalModal = () => {
    console.log('=== LEGAL MODAL DEBUG ===');
    console.log('Initialisiert:', LegalModal.isInitialized);
    console.log('Overlay:', !!LegalModal.overlay);
    console.log('Container:', !!LegalModal.container);
    console.log('Title:', !!LegalModal.title);
    console.log('Body:', !!LegalModal.body);
    console.log('=========================');
  };

})();
