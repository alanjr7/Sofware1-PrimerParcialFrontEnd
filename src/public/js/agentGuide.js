/**
 * agentGuide.js - Motor de Asistencia Técnica, Onboarding Automático y Ciclo de Vida
 * Arquitectura: User Onboarding Lifecycle State Machine
 */

(function () {
    'use strict';

    const ONBOARDING_STATUS = {
        PENDING: 'pending',
        COMPLETED: 'completed',
        DISMISSED: 'dismissed'
    };

    const STORAGE_KEYS = {
        GLOBAL_DISMISSED: 'agent_guide_global_dismissed',
        TOUR_PREFIX: 'agent_tour_status_'
    };

    // Iconografía Vectorial SVG (Feather/Lucide Style)
    const ICONS = {
        compass: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`,
        play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
        eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="23" x2="23" y2="1"></line></svg>`,
        close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        info: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        arrowRight: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
        arrowLeft: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`
    };

    class AgentGuideEngine {
        constructor() {
            this.currentTour = null;
            this.currentStepIndex = 0;
            this.isTourActive = false;
            this.targetElement = null;

            // Elementos DOM
            this.backdrop = null;
            this.spotlight = null;
            this.popover = null;
            this.fabContainer = null;
            this.fabMenu = null;

            this.boundResize = this.updatePositions.bind(this);
            this.boundKeys = this.handleKeyboard.bind(this);
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.evaluateLifecycleAndMount());
            } else {
                this.evaluateLifecycleAndMount();
            }
        }

        getCurrentPageKey() {
            const path = window.location.pathname.toLowerCase();
            if (path.includes('dashboard')) return 'dashboard';
            if (path.includes('crearsala')) return 'crearSala';
            if (path.includes('editarsala')) return 'editarSala';
            if (path.includes('pizarra')) return 'pizarra';
            if (path.includes('login') || path.includes('index')) return 'login';
            return 'dashboard';
        }

        evaluateLifecycleAndMount() {
            const pageKey = this.getCurrentPageKey();
            const tour = window.AGENT_TOURS && window.AGENT_TOURS[pageKey];

            // Si el usuario ya desactivó globalmente o ya completó este tour, NO montar nada en el DOM
            const isGloballyDismissed = localStorage.getItem(STORAGE_KEYS.GLOBAL_DISMISSED) === 'true';
            const tourStatus = tour ? localStorage.getItem(`${STORAGE_KEYS.TOUR_PREFIX}${tour.id}`) : null;

            if (isGloballyDismissed || tourStatus === ONBOARDING_STATUS.COMPLETED || tourStatus === ONBOARDING_STATUS.DISMISSED) {
                return;
            }

            // Construir DOM solo cuando sea necesario
            this.buildDOM();
            this.bindEvents();

            // Inicio automático en primera visita con delay para sincronización de datos
            if (!tourStatus && tour) {
                setTimeout(() => {
                    this.startTour(pageKey);
                }, 900);
            }
        }

        buildDOM() {
            // 1. Backdrop
            this.backdrop = document.createElement('div');
            this.backdrop.id = 'agent-overlay-backdrop';

            // 2. Spotlight Box
            this.spotlight = document.createElement('div');
            this.spotlight.id = 'agent-spotlight-box';

            // 3. Popover Card
            this.popover = document.createElement('div');
            this.popover.id = 'agent-popover-card';
            this.popover.setAttribute('role', 'dialog');
            this.popover.setAttribute('aria-modal', 'true');
            this.popover.innerHTML = `
                <div class="agent-popover-header">
                    <div class="agent-header-meta">
                        <span class="agent-status-indicator"></span>
                        <span class="agent-badge-pill">Guía del Sistema</span>
                        <span class="agent-step-pill" id="agent-step-badge">1 / 4</span>
                    </div>
                    <button class="agent-btn-icon-close" id="agent-close-btn" title="Cerrar (Esc)" aria-label="Cerrar">
                        ${ICONS.close}
                    </button>
                </div>
                <div class="agent-progress-track">
                    <div class="agent-progress-fill" id="agent-progress-bar"></div>
                </div>
                <div class="agent-popover-body">
                    <h4 id="agent-popover-title">Título</h4>
                    <p id="agent-popover-desc">Descripción funcional.</p>
                    <div class="agent-context-callout" id="agent-callout" style="display: none;">
                        ${ICONS.info}
                        <span id="agent-callout-text"></span>
                    </div>
                </div>
                <div class="agent-popover-footer">
                    <button class="btn-guide-dismiss-forever" id="agent-dismiss-forever-btn" title="Desactiva todas las guías del sistema">
                        ${ICONS.eyeOff}
                        <span>No volver a mostrar</span>
                    </button>
                    <div class="agent-btn-group">
                        <button class="btn-guide-secondary" id="agent-prev-btn">Anterior</button>
                        <button class="btn-guide-primary" id="agent-next-btn">
                            <span id="agent-next-text">Siguiente</span>
                            ${ICONS.arrowRight}
                        </button>
                    </div>
                </div>
            `;

            // 4. Trigger Widget (HUD Pill)
            this.fabContainer = document.createElement('div');
            this.fabContainer.id = 'agent-fab-container';
            this.fabContainer.innerHTML = `
                <div id="agent-fab-menu">
                    <button class="agent-fab-menu-item" id="agent-menu-tour">
                        ${ICONS.play} <span>Iniciar Recorrido</span>
                    </button>
                    <div class="agent-menu-divider"></div>
                    <button class="agent-fab-menu-item agent-menu-danger" id="agent-menu-dismiss-all">
                        ${ICONS.eyeOff} <span>Cerrar para siempre</span>
                    </button>
                </div>
                <button id="agent-fab-trigger" aria-label="Guía y Documentación">
                    ${ICONS.compass}
                    <span>Guía</span>
                </button>
            `;

            document.body.appendChild(this.backdrop);
            document.body.appendChild(this.spotlight);
            document.body.appendChild(this.popover);
            document.body.appendChild(this.fabContainer);

            this.fabMenu = document.getElementById('agent-fab-menu');
        }

        bindEvents() {
            document.getElementById('agent-close-btn').addEventListener('click', () => this.endTour());
            document.getElementById('agent-next-btn').addEventListener('click', () => this.nextStep());
            document.getElementById('agent-prev-btn').addEventListener('click', () => this.prevStep());
            document.getElementById('agent-dismiss-forever-btn').addEventListener('click', () => this.dismissForever());

            const trigger = document.getElementById('agent-fab-trigger');
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fabMenu.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (this.fabMenu && !this.fabContainer.contains(e.target)) {
                    this.fabMenu.classList.remove('active');
                }
            });

            document.getElementById('agent-menu-tour').addEventListener('click', () => {
                this.fabMenu.classList.remove('active');
                this.startTour(this.getCurrentPageKey());
            });

            document.getElementById('agent-menu-dismiss-all').addEventListener('click', () => {
                this.dismissForever();
            });

            window.addEventListener('keydown', this.boundKeys);
        }

        handleKeyboard(e) {
            if (e.key === 'Escape') {
                if (this.isTourActive) this.endTour();
                if (this.fabMenu) this.fabMenu.classList.remove('active');
            } else if (this.isTourActive) {
                if (e.key === 'ArrowRight' || e.key === 'Enter') {
                    this.nextStep();
                } else if (e.key === 'ArrowLeft') {
                    this.prevStep();
                }
            }
        }

        startTour(tourKey) {
            const tours = window.AGENT_TOURS || {};
            const tour = tours[tourKey];

            if (!tour || !tour.steps || tour.steps.length === 0) return;

            this.currentTour = tour;
            this.currentStepIndex = 0;
            this.isTourActive = true;

            this.backdrop.classList.add('active');
            window.addEventListener('resize', this.boundResize);
            window.addEventListener('scroll', this.boundResize, { passive: true });

            this.renderStep(this.currentStepIndex);
        }

        renderStep(index) {
            if (!this.currentTour || index < 0 || index >= this.currentTour.steps.length) return;

            const step = this.currentTour.steps[index];
            const target = document.querySelector(step.target);

            if (!target) {
                if (index < this.currentTour.steps.length - 1) {
                    this.renderStep(index + 1);
                } else {
                    this.completeTour();
                }
                return;
            }

            this.targetElement = target;
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            setTimeout(() => {
                this.updatePositions();
                this.updateContent(step, index);
                this.positionPopover(target, step.placement || 'bottom');
            }, 120);
        }

        updatePositions() {
            if (!this.isTourActive || !this.targetElement) return;

            const rect = this.targetElement.getBoundingClientRect();
            const padding = 6;

            this.spotlight.style.top = `${rect.top - padding}px`;
            this.spotlight.style.left = `${rect.left - padding}px`;
            this.spotlight.style.width = `${rect.width + padding * 2}px`;
            this.spotlight.style.height = `${rect.height + padding * 2}px`;
            this.spotlight.classList.add('active');
        }

        updateContent(step, index) {
            const total = this.currentTour.steps.length;
            const progress = ((index + 1) / total) * 100;

            document.getElementById('agent-step-badge').textContent = `${index + 1} / ${total}`;
            document.getElementById('agent-progress-bar').style.width = `${progress}%`;
            document.getElementById('agent-popover-title').textContent = step.title;
            document.getElementById('agent-popover-desc').textContent = step.description;

            const callout = document.getElementById('agent-callout');
            const calloutText = document.getElementById('agent-callout-text');
            if (step.tip) {
                calloutText.textContent = step.tip;
                callout.style.display = 'flex';
            } else {
                callout.style.display = 'none';
            }

            const prevBtn = document.getElementById('agent-prev-btn');
            const nextText = document.getElementById('agent-next-text');

            prevBtn.disabled = (index === 0);
            nextText.textContent = (index === total - 1) ? 'Concluir y Ocultar' : 'Siguiente';
        }

        positionPopover(target, placement) {
            const rect = target.getBoundingClientRect();
            const popover = this.popover;
            popover.classList.add('active');

            const width = popover.offsetWidth || 360;
            const height = popover.offsetHeight || 220;
            const margin = 14;

            let top = 0;
            let left = 0;

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            switch (placement) {
                case 'top':
                    top = rect.top - height - margin;
                    left = rect.left + (rect.width / 2) - (width / 2);
                    break;
                case 'bottom':
                    top = rect.bottom + margin;
                    left = rect.left + (rect.width / 2) - (width / 2);
                    break;
                case 'left':
                    top = rect.top + (rect.height / 2) - (height / 2);
                    left = rect.left - width - margin;
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - (height / 2);
                    left = rect.right + margin;
                    break;
            }

            if (left < 14) left = 14;
            if (left + width > vw - 14) left = vw - width - 14;
            if (top < 14) top = rect.bottom + margin;
            if (top + height > vh - 14) top = rect.top - height - margin;

            popover.style.top = `${Math.max(14, top)}px`;
            popover.style.left = `${Math.max(14, left)}px`;
        }

        nextStep() {
            if (!this.currentTour) return;
            if (this.currentStepIndex < this.currentTour.steps.length - 1) {
                this.currentStepIndex++;
                this.renderStep(this.currentStepIndex);
            } else {
                this.completeTour();
            }
        }

        prevStep() {
            if (!this.currentTour) return;
            if (this.currentStepIndex > 0) {
                this.currentStepIndex--;
                this.renderStep(this.currentStepIndex);
            }
        }

        completeTour() {
            if (this.currentTour) {
                localStorage.setItem(`${STORAGE_KEYS.TOUR_PREFIX}${this.currentTour.id}`, ONBOARDING_STATUS.COMPLETED);
            }
            this.endTour();
            this.removeHUDPermanently();
        }

        dismissForever() {
            localStorage.setItem(STORAGE_KEYS.GLOBAL_DISMISSED, 'true');
            if (this.currentTour) {
                localStorage.setItem(`${STORAGE_KEYS.TOUR_PREFIX}${this.currentTour.id}`, ONBOARDING_STATUS.DISMISSED);
            }
            this.endTour();
            this.removeHUDPermanently();
        }

        removeHUDPermanently() {
            if (this.fabContainer && this.fabContainer.parentNode) {
                this.fabContainer.style.opacity = '0';
                this.fabContainer.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    if (this.fabContainer && this.fabContainer.parentNode) {
                        this.fabContainer.remove();
                    }
                }, 300);
            }
        }

        endTour() {
            this.isTourActive = false;
            this.currentTour = null;
            this.targetElement = null;

            if (this.backdrop) this.backdrop.classList.remove('active');
            if (this.spotlight) this.spotlight.classList.remove('active');
            if (this.popover) this.popover.classList.remove('active');

            window.removeEventListener('resize', this.boundResize);
            window.removeEventListener('scroll', this.boundResize);
        }
    }

    window.AgentGuide = new AgentGuideEngine();
    window.AgentGuide.init();
})();
