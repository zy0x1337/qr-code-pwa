/**
 * Legal Modal System
 * Optimized for modern web standards with enhanced UX
 */

class LegalModal {
    constructor() {
        this.currentModal = null;
        this.isOpen = false;
        this.scrollPosition = 0;
        
        // Enhanced content with better structure
        this.content = {
            privacy: {
                title: '🔒 Datenschutzerklärung',
                subtitle: 'Informationen zur Datenverarbeitung',
                icon: '🔒',
                sections: [
                    {
                        title: '1. Datenschutz auf einen Blick',
                        content: `
                            <div class="info-highlight">
                                <h4>Allgemeine Hinweise</h4>
                                <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p>
                            </div>
                            
                            <h5>Datenerfassung auf dieser Website</h5>
                            <p><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
                            <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.</p>
                            
                            <div class="data-collection-info">
                                <h5>Wie erfassen wir Ihre Daten?</h5>
                                <ul>
                                    <li><strong>Direkte Eingabe:</strong> QR-Code Inhalte, die Sie erstellen</li>
                                    <li><strong>Automatisch:</strong> Technische Daten beim Websitebesuch</li>
                                    <li><strong>Lokal:</strong> Nutzungsdaten werden auf Ihrem Gerät gespeichert</li>
                                </ul>
                            </div>
                        `
                    },
                    {
                        title: '2. QR-Code Datenverarbeitung',
                        content: `
                            <div class="feature-highlight">
                                <h4>🔐 Lokale Verarbeitung</h4>
                                <p>Alle QR-Code Erstellungen finden lokal auf Ihrem Gerät statt. Ihre Daten verlassen Ihr Gerät nicht.</p>
                            </div>
                            
                            <h5>Gespeicherte Daten</h5>
                            <ul>
                                <li>QR-Code Inhalte (lokal im Browser)</li>
                                <li>Erstellungszeitpunkte</li>
                                <li>Anpassungseinstellungen</li>
                                <li>Nutzungshistorie</li>
                            </ul>
                            
                            <div class="security-note">
                                <p><strong>Wichtig:</strong> Sensible Daten wie Passwörter oder private Informationen sollten nicht in QR-Codes eingebettet werden.</p>
                            </div>
                        `
                    },
                    {
                        title: '3. Ihre Rechte',
                        content: `
                            <div class="rights-grid">
                                <div class="right-item">
                                    <h5>📋 Auskunft</h5>
                                    <p>Jederzeit über gespeicherte Daten</p>
                                </div>
                                <div class="right-item">
                                    <h5>🗑️ Löschung</h5>
                                    <p>Entfernung aller lokalen Daten</p>
                                </div>
                                <div class="right-item">
                                    <h5>⚙️ Einstellungen</h5>
                                    <p>Kontrolle über Datenverarbeitung</p>
                                </div>
                                <div class="right-item">
                                    <h5>🔄 Übertragung</h5>
                                    <p>Export Ihrer QR-Code Historie</p>
                                </div>
                            </div>
                        `
                    }
                ]
            },
            
            imprint: {
                title: '📋 Impressum',
                subtitle: 'Rechtliche Informationen',
                icon: '📋',
                sections: [
                    {
                        title: 'Angaben gemäß § 5 TMG',
                        content: `
                            <div class="contact-card">
                                <h4>Verantwortlich für den Inhalt</h4>
                                <div class="contact-info">
                                    <p><strong>QR Generator Pro</strong><br>
                                    Muster Entwickler<br>
                                    Beispielstraße 123<br>
                                    12345 Musterstadt</p>
                                    
                                    <div class="contact-methods">
                                        <p><strong>📧 E-Mail:</strong> info@qr-generator.example</p>
                                        <p><strong>📞 Telefon:</strong> +49 (0) 123 456789</p>
                                        <p><strong>🌐 Website:</strong> www.qr-generator.example</p>
                                    </div>
                                </div>
                            </div>
                        `
                    },
                    {
                        title: 'Rechtliche Hinweise',
                        content: `
                            <div class="legal-grid">
                                <div class="legal-item">
                                    <h5>⚖️ Haftungsausschluss</h5>
                                    <p>Inhalte werden nach bestem Wissen erstellt. Keine Haftung für externe Links.</p>
                                </div>
                                <div class="legal-item">
                                    <h5>📄 Urheberrecht</h5>
                                    <p>Alle Inhalte unterliegen dem deutschen Urheberrecht.</p>
                                </div>
                            </div>
                        `
                    }
                ]
            },
            
            terms: {
                title: '📜 Nutzungsbedingungen',
                subtitle: 'Bedingungen für die Nutzung',
                icon: '📜',
                sections: [
                    {
                        title: '1. Geltungsbereich',
                        content: `
                            <p>Diese Nutzungsbedingungen gelten für alle Nutzer des QR-Generator Services.</p>
                            <div class="terms-highlight">
                                <h4>Wichtige Punkte</h4>
                                <ul>
                                    <li>✅ Kostenlose Nutzung für private und gewerbliche Zwecke</li>
                                    <li>✅ Unbegrenzte QR-Code Erstellung</li>
                                    <li>✅ Lokale Datenverarbeitung</li>
                                    <li>❌ Missbrauch für illegale Inhalte</li>
                                </ul>
                            </div>
                        `
                    },
                    {
                        title: '2. Nutzungsrechte',
                        content: `
                            <h5>Erlaubte Nutzung</h5>
                            <ul>
                                <li>Erstellung beliebiger QR-Codes</li>
                                <li>Kommerzielle Nutzung erlaubt</li>
                                <li>Download und Weitergabe der QR-Codes</li>
                            </ul>
                            
                            <h5>Beschränkungen</h5>
                            <ul>
                                <li>Keine Verbreitung von schädlichen Inhalten</li>
                                <li>Keine Umgehung der Sicherheitsmaßnahmen</li>
                                <li>Respektierung der Server-Ressourcen</li>
                            </ul>
                        `
                    }
                ]
            }
        };
        
        this.init();
    }
    
    init() {
        this.createModalStructure();
        this.bindEvents();
        this.setupKeyboardNavigation();
        this.setupAccessibility();
    }
    
    createModalStructure() {
        // Prüfen ob Modal bereits existiert
        if (document.querySelector('.legal-modal-overlay')) return;
        
        const modalHTML = `
            <div class="modal-overlay legal-modal-overlay" aria-hidden="true" role="dialog" aria-modal="true">
                <div class="modal-container legal-modal-container" role="document">
                    <!-- Modal Header -->
                    <header class="modal-header legal-modal-header">
                        <div class="modal-title-section">
                            <div class="modal-logo">
                                <span class="modal-icon">⚖️</span>
                            </div>
                            <div class="modal-title-text">
                                <h2 class="modal-title" id="legal-modal-title">Rechtliche Informationen</h2>
                                <p class="modal-subtitle" id="legal-modal-subtitle">Datenschutz & Nutzungsbedingungen</p>
                            </div>
                        </div>
                        <button 
                            class="modal-close" 
                            aria-label="Modal schließen"
                            title="Modal schließen (ESC)"
                            type="button"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </header>
                    
                    <!-- Modal Body -->
                    <main class="modal-body legal-modal-body">
                        <!-- Navigation -->
                        <nav class="legal-nav" role="tablist">
                            <button 
                                class="legal-nav-item active" 
                                data-content="privacy"
                                role="tab"
                                aria-selected="true"
                                aria-controls="privacy-panel"
                                id="privacy-tab"
                            >
                                <span class="nav-icon">🔒</span>
                                <span class="nav-text">Datenschutz</span>
                            </button>
                            <button 
                                class="legal-nav-item" 
                                data-content="imprint"
                                role="tab"
                                aria-selected="false"
                                aria-controls="imprint-panel"
                                id="imprint-tab"
                            >
                                <span class="nav-icon">📋</span>
                                <span class="nav-text">Impressum</span>
                            </button>
                            <button 
                                class="legal-nav-item" 
                                data-content="terms"
                                role="tab"
                                aria-selected="false"
                                aria-controls="terms-panel"
                                id="terms-tab"
                            >
                                <span class="nav-icon">📜</span>
                                <span class="nav-text">AGB</span>
                            </button>
                        </nav>
                        
                        <!-- Content Area -->
                        <div class="legal-content-area">
                            <div class="legal-content-wrapper">
                                <!-- Content wird dynamisch geladen -->
                            </div>
                        </div>
                    </main>
                    
                    <!-- Footer -->
                    <footer class="legal-modal-footer">
                        <div class="footer-info">
                            <span class="last-updated">Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE')}</span>
                        </div>
                        <div class="footer-actions">
                            <button class="btn btn--secondary print-btn" type="button">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6,9 6,2 18,2 18,9"></polyline>
                                    <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"></path>
                                    <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                                Drucken
                            </button>
                            <button class="btn btn--primary understood-btn" type="button">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20,6 9,17 4,12"></polyline>
                                </svg>
                                Verstanden
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.querySelector('.legal-modal-overlay');
        this.container = document.querySelector('.legal-modal-container');
    }
    
    bindEvents() {
        // Navigation Events
        document.querySelectorAll('.legal-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const contentType = e.currentTarget.dataset.content;
                this.switchContent(contentType);
            });
        });
        
        // Close Events
        const closeBtn = document.querySelector('.legal-modal-overlay .modal-close');
        const understoodBtn = document.querySelector('.understood-btn');
        const overlay = document.querySelector('.legal-modal-overlay');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (understoodBtn) understoodBtn.addEventListener('click', () => this.close());
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close();
            });
        }
        
        // Print Event
        const printBtn = document.querySelector('.print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.print());
        }
        
        // Legal Link Events (für Footer Links)
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-legal-modal]')) {
                e.preventDefault();
                const contentType = e.target.dataset.legalModal;
                this.open(contentType);
            }
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case 'Tab':
                    this.handleTabNavigation(e);
                    break;
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (e.target.classList.contains('legal-nav-item')) {
                        e.preventDefault();
                        this.navigateWithArrows(e.key === 'ArrowLeft' ? -1 : 1);
                    }
                    break;
            }
        });
    }
    
    setupAccessibility() {
        // ARIA live region für dynamische Inhalte
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'legal-modal-live-region';
        document.body.appendChild(liveRegion);
    }
    
    open(contentType = 'privacy') {
        if (this.isOpen) return;
        
        this.scrollPosition = window.pageYOffset;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
        
        this.modal.setAttribute('aria-hidden', 'false');
        this.modal.classList.add('show');
        this.isOpen = true;
        
        // Focus management
        const firstFocusable = this.modal.querySelector('.modal-close');
        if (firstFocusable) firstFocusable.focus();
        
        // Content laden
        this.switchContent(contentType);
        
        // Analytics/Tracking (optional)
        this.trackModalOpen(contentType);
        
        // Announce to screen readers
        this.announceToScreenReader(`${this.content[contentType].title} Modal geöffnet`);
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.modal.classList.remove('show');
        this.modal.setAttribute('aria-hidden', 'true');
        
        // Smooth closing animation
        setTimeout(() => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            window.scrollTo(0, this.scrollPosition);
            this.isOpen = false;
        }, 300);
        
        this.announceToScreenReader('Modal geschlossen');
    }
    
    switchContent(contentType) {
        const content = this.content[contentType];
        if (!content) return;
        
        // Navigation aktualisieren
        document.querySelectorAll('.legal-nav-item').forEach(item => {
            const isActive = item.dataset.content === contentType;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive.toString());
        });
        
        // Header aktualisieren
        const title = document.getElementById('legal-modal-title');
        const subtitle = document.getElementById('legal-modal-subtitle');
        const icon = document.querySelector('.modal-icon');
        
        if (title) title.textContent = content.title;
        if (subtitle) subtitle.textContent = content.subtitle;
        if (icon) icon.textContent = content.icon;
        
        // Content rendern
        this.renderContent(content, contentType);
        
        // Scroll to top
        const contentWrapper = document.querySelector('.legal-content-wrapper');
        if (contentWrapper) contentWrapper.scrollTop = 0;
        
        this.announceToScreenReader(`${content.title} Inhalte geladen`);
    }
    
    renderContent(content, contentType) {
        const wrapper = document.querySelector('.legal-content-wrapper');
        if (!wrapper) return;
        
        const sectionsHTML = content.sections.map((section, index) => `
            <section class="legal-section" id="section-${contentType}-${index}">
                <header class="section-header">
                    <h3 class="section-title">${section.title}</h3>
                </header>
                <div class="section-content">
                    ${section.content}
                </div>
            </section>
        `).join('');
        
        const contentHTML = `
            <div class="legal-content" 
                 role="tabpanel" 
                 aria-labelledby="${contentType}-tab"
                 id="${contentType}-panel">
                <div class="content-header">
                    <div class="content-icon">${content.icon}</div>
                    <div class="content-title-section">
                        <h2 class="content-title">${content.title}</h2>
                        <p class="content-subtitle">${content.subtitle}</p>
                    </div>
                </div>
                
                <div class="sections-container">
                    ${sectionsHTML}
                </div>
            </div>
        `;
        
        wrapper.innerHTML = contentHTML;
        
        // Animationen für Sections starten
        this.animateSections();
    }
    
    animateSections() {
        const sections = document.querySelectorAll('.legal-section');
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                section.style.transition = 'all 0.3s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    handleTabNavigation(e) {
        const focusableElements = this.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    navigateWithArrows(direction) {
        const navItems = Array.from(document.querySelectorAll('.legal-nav-item'));
        const currentIndex = navItems.findIndex(item => item.classList.contains('active'));
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = navItems.length - 1;
        if (newIndex >= navItems.length) newIndex = 0;
        
        navItems[newIndex].click();
        navItems[newIndex].focus();
    }
    
    print() {
        const content = document.querySelector('.legal-content-wrapper').innerHTML;
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Generator - Rechtliche Informationen</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem; line-height: 1.6; }
                    .legal-section { margin-bottom: 2rem; page-break-inside: avoid; }
                    .section-title { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
                    .info-highlight, .feature-highlight, .terms-highlight { 
                        background: #f3f4f6; padding: 1rem; border-radius: 8px; margin: 1rem 0; 
                    }
                    .rights-grid, .legal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
                    @media print { body { margin: 1rem; font-size: 12pt; } }
                </style>
            </head>
            <body>
                <h1>QR Generator - Rechtliche Informationen</h1>
                ${content}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
    
    getScrollbarWidth() {
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        document.body.appendChild(outer);
        
        const inner = document.createElement('div');
        outer.appendChild(inner);
        
        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        outer.parentNode.removeChild(outer);
        
        return scrollbarWidth;
    }
    
    announceToScreenReader(message) {
        const liveRegion = document.getElementById('legal-modal-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }
    
    trackModalOpen(contentType) {
        // Optional: Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'legal_modal_open', {
                'content_type': contentType,
                'timestamp': new Date().toISOString()
            });
        }
    }
    
    // Public API Methods
    showPrivacy() { this.open('privacy'); }
    showImprint() { this.open('imprint'); }
    showTerms() { this.open('terms'); }
    
    // Cleanup method
    destroy() {
        const modal = document.querySelector('.legal-modal-overlay');
        const liveRegion = document.getElementById('legal-modal-live-region');
        
        if (modal) modal.remove();
        if (liveRegion) liveRegion.remove();
        
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

// CSS für die optimierte Darstellung
const additionalCSS = `
/* Legal Modal Specific Styles */
.legal-modal-overlay .modal-container {
    max-width: 1200px;
    min-height: 600px;
}

.legal-modal-header {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
    padding: var(--space-24) var(--space-32);
}

.legal-modal-body {
    display: flex;
    min-height: 500px;
}

.legal-nav {
    width: 240px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-card-border);
    padding: var(--space-20);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.legal-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    padding: var(--space-16);
    border: none;
    background: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-standard);
    text-align: left;
    color: var(--color-text-secondary);
}

.legal-nav-item:hover {
    background: var(--color-secondary);
    color: var(--color-text);
}

.legal-nav-item.active {
    background: var(--color-primary);
    color: white;
    font-weight: var(--font-weight-semibold);
}

.nav-icon {
    font-size: var(--font-size-lg);
}

.legal-content-area {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-24);
}

.content-header {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    margin-bottom: var(--space-32);
    padding-bottom: var(--space-20);
    border-bottom: 1px solid var(--color-card-border);
}

.content-icon {
    font-size: var(--font-size-4xl);
    opacity: 0.8;
}

.legal-section {
    margin-bottom: var(--space-32);
    padding: var(--space-20);
    background: var(--color-surface);
    border: 1px solid var(--color-card-border);
    border-radius: var(--radius-lg);
}

.section-title {
    color: var(--color-text);
    margin-bottom: var(--space-16);
    padding-bottom: var(--space-8);
    border-bottom: 2px solid var(--color-primary);
}

.info-highlight, .feature-highlight, .terms-highlight {
    background: linear-gradient(135deg, 
        rgba(var(--color-primary-rgb), 0.1) 0%, 
        rgba(var(--color-primary-rgb), 0.05) 100%);
    border: 1px solid rgba(var(--color-primary-rgb), 0.2);
    border-radius: var(--radius-base);
    padding: var(--space-16);
    margin: var(--space-16) 0;
}

.rights-grid, .legal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-16);
    margin: var(--space-16) 0;
}

.right-item, .legal-item {
    padding: var(--space-16);
    background: var(--color-background);
    border: 1px solid var(--color-card-border);
    border-radius: var(--radius-base);
}

.contact-card {
    background: var(--color-background);
    border: 1px solid var(--color-card-border);
    border-radius: var(--radius-lg);
    padding: var(--space-20);
}

.legal-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-16) var(--space-24);
    background: var(--color-background);
    border-top: 1px solid var(--color-card-border);
}

.footer-actions {
    display: flex;
    gap: var(--space-12);
}

.last-updated {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
}

/* Responsive Design */
@media (max-width: 768px) {
    .legal-modal-body {
        flex-direction: column;
    }
    
    .legal-nav {
        width: 100%;
        flex-direction: row;
        overflow-x: auto;
        padding: var(--space-16);
    }
    
    .legal-nav-item {
        min-width: 120px;
        justify-content: center;
    }
    
    .rights-grid, .legal-grid {
        grid-template-columns: 1fr;
    }
    
    .legal-modal-footer {
        flex-direction: column;
        gap: var(--space-12);
    }
}

@media (max-width: 480px) {
    .legal-content-area {
        padding: var(--space-16);
    }
    
    .content-header {
        flex-direction: column;
        text-align: center;
    }
}
`;

// CSS dynamisch hinzufügen
if (!document.querySelector('#legal-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'legal-modal-styles';
    style.textContent = additionalCSS;
    document.head.appendChild(style);
}

// Global Instance
window.LegalModal = new LegalModal();

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegalModal;
}
