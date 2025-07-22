// Legal Modal System
const LegalModal = {
  // Modal-Elemente
  overlay: null,
  container: null,
  title: null,
  body: null,
  
  // Initialisierung
  init() {
    this.overlay = document.getElementById('legalModal');
    this.container = this.overlay?.querySelector('.modal-container');
    this.title = document.getElementById('modalTitle');
    this.body = document.getElementById('modalBody');
    
    // Event Listeners
    this.setupEventListeners();
  },
  
  // Event Listeners einrichten
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
  },
  
  // Modal öffnen
  show(type) {
    if (!this.overlay) return;
    
    const content = this.getContent(type);
    if (!content) return;
    
    // Content setzen
    this.title.textContent = content.title;
    this.body.innerHTML = content.body;
    
    // Modal anzeigen
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Scroll verhindern
    
    // Animation starten
    requestAnimationFrame(() => {
      this.overlay.classList.add('show');
    });
    
    // Focus Management
    this.container?.focus();
  },
  
  // Modal schließen
  close() {
    if (!this.overlay || !this.isOpen()) return;
    
    // Animation
    this.overlay.classList.remove('show');
    
    // Nach Animation verstecken
    setTimeout(() => {
      this.overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = ''; // Scroll wiederherstellen
    }, 300);
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
  
  // Datenschutz-Inhalt
  getPrivacyContent() {
    return `
      <h3>1. Datenverarbeitung</h3>
      <p>Diese QR Code PWA verarbeitet Ihre Daten ausschließlich lokal in Ihrem Browser. Es werden keine personenbezogenen Daten an externe Server übertragen.</p>
      
      <h3>2. Lokale Speicherung</h3>
      <p>Folgende Daten werden lokal in Ihrem Browser gespeichert:</p>
      <ul>
        <li>QR Code-Verlauf und generierte Codes</li>
        <li>Anwendungseinstellungen (Theme, Präferenzen)</li>
        <li>Upload-Cache für offline Funktionalität</li>
      </ul>
      
      <h3>3. Kamera-Zugriff</h3>
      <p>Für das Scannen von QR Codes benötigen wir Zugriff auf Ihre Gerätekamera. Die Kamerabilder werden nicht gespeichert oder übertragen.</p>
      
      <h3>4. Externe Bibliotheken</h3>
      <p>Diese App nutzt folgende externe Bibliotheken:</p>
      <ul>
        <li>QRCode.js - für die QR Code-Generierung</li>
        <li>html5-qrcode - für das Scannen von QR Codes</li>
      </ul>
      
      <h3>5. Ihre Rechte</h3>
      <p>Sie können jederzeit:</p>
      <ul>
        <li>Den Verlauf in den Einstellungen löschen</li>
        <li>Den Browser-Cache leeren</li>
        <li>Die App deinstallieren</li>
      </ul>
      
      <p><strong>Stand:</strong> Januar 2025</p>
    `;
  },
  
  // Impressum-Inhalt
  getImprintContent() {
    return `
      <h3>Angaben gemäß § 5 TMG</h3>
      <p>
        <strong>[Ihr Name]</strong><br>
        [Ihre Adresse]<br>
        [PLZ Ort]<br>
        Deutschland
      </p>
      
      <h3>Kontakt</h3>
      <p>
        E-Mail: [ihre-email@domain.de]<br>
        Telefon: [Telefonnummer] (optional)
      </p>
      
      <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
      <p>
        [Ihr Name]<br>
        [Ihre Adresse]<br>
        [PLZ Ort]
      </p>
      
      <h3>Haftungsausschluss</h3>
      <p>Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
      
      <p><strong>Stand:</strong> Januar 2025</p>
    `;
  },
  
  // Nutzungsbedingungen-Inhalt
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
      
      <p><strong>Stand:</strong> Januar 2025</p>
    `;
  },
  
  // FAQ-Inhalt
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

// Bei DOM-Geladen-Event initialisieren
document.addEventListener('DOMContentLoaded', () => {
  LegalModal.init();
});

// Für globalen Zugriff
window.LegalModal = LegalModal;
