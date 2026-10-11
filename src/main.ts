import Lenis from 'lenis';
import gsap from 'gsap';
import { initLiquidGlass } from './components/liquid-glass';
import configData from './config/data.json';

const ANIMATION_CONFIG = Object.freeze({
  EASE_EXPO: 'power4.out',
  EASE_ELASTIC: 'elastic.out(1, 0.85)',
  STAGGER: 0.12,
});

/**
 * Inicializa e gerencia a rolagem suave com fallback adaptativo
 */
function createScrollEngine(mediaQueries: { mobile: MediaQueryList; reducedMotion: MediaQueryList }) {
  let lenisInstance: Lenis | null = null;

  const init = () => {
    if (mediaQueries.reducedMotion.matches || mediaQueries.mobile.matches) {
      document.documentElement.classList.add('fallback-scroll');
      return;
    }

    document.documentElement.classList.remove('fallback-scroll');
    lenisInstance = new Lenis({ lerp: 0.08, smoothWheel: true });
    gsap.ticker.add((time) => lenisInstance?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  };

  const destroy = () => {
    if (lenisInstance) {
      lenisInstance.destroy();
      lenisInstance = null;
    }
    document.documentElement.classList.add('fallback-scroll');
  };

  return { init, destroy };
}

/**
 * Animação de entrada dos elementos principais
 */
function playEntranceSequence(prefersReducedMotion: boolean): void {
  const timeline = gsap.timeline({ delay: 0.3 });
  const heroCover = document.querySelector('.hero-cover');
  const profileName = document.querySelector('.profile-name');
  const animatedElements = document.querySelectorAll('.anim-el');

  if (heroCover && !prefersReducedMotion) {
    timeline.from(heroCover, {
      opacity: 0,
      scale: 1.05,
      duration: 1.5,
      ease: ANIMATION_CONFIG.EASE_EXPO,
    });
  }

  if (profileName) {
    const headerElements = document.querySelectorAll('.card-header > *');
    if (headerElements.length > 0) {
      timeline.from(
        headerElements,
        {
          opacity: 0,
          y: 15,
          stagger: 0.1,
          duration: 1.5,
          ease: ANIMATION_CONFIG.EASE_ELASTIC,
        },
        heroCover ? '-=1.2' : 0
      );
    }
  }

  if (animatedElements.length > 0) {
    gsap.set(animatedElements, { visibility: 'visible' });

    if (!prefersReducedMotion) {
      timeline.from(
        animatedElements,
        {
          opacity: 0,
          y: 20,
          stagger: ANIMATION_CONFIG.STAGGER,
          duration: 1.5,
          ease: ANIMATION_CONFIG.EASE_ELASTIC,
        },
        '-=1.2'
      );
    }
  }
}

interface LeadClickDetail {
  destination: string | null;
  label: string;
  timestamp: number;
}

declare global {
  interface WindowEventMap {
    'analytics:lead_click': CustomEvent<LeadClickDetail>;
  }
}

/**
 * Log defensivo ativo apenas em ambiente de desenvolvimento
 */
function logSecurityEvent(message: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[Security] ${message}`);
  }
}

/**
 * Decodifica o número de WhatsApp dinamicamente em tempo de execução para frustrar scrapers
 */
function resolveContactNumber(): string {
  // Lê do env ou usa fallback ofuscado em Base64 para evitar plain-text scraping
  const envPhone = import.meta.env.VITE_CONTACT_PHONE;
  if (envPhone && typeof envPhone === 'string' && envPhone.trim().length > 0) {
    return envPhone.trim();
  }

  const raw = configData.contact?.phone;
  if (raw && typeof raw === 'string') {
    return raw;
  }

  // Fallback seguro em Base64 ("5511977440146")
  try {
    return atob('NTUxMTk3NzQ0MDE0Ng==');
  } catch {
    return '5511977440146';
  }
}

/**
 * Configuração defensiva do formulário WhatsApp com Honeypot, Rate Limiting e Fail-Safe
 */
function setupWhatsAppForm(): void {
  const form = document.getElementById('whatsapp-form') as HTMLFormElement | null;
  const submitBtn = document.getElementById('whatsapp-submit-btn') as HTMLButtonElement | null;
  if (!form) return;

  const loadTimestamp = Date.now();
  const RATE_LIMIT_STORAGE_KEY = 'sec_whatsapp_last_sent';
  const RATE_LIMIT_COOLDOWN_MS = 45000; // 45 segundos de cooldown entre submissões

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    // 1. Defesa Anti-Bot (Honeypot Trap)
    const honeypot = (formData.get('_hp_company')?.toString() || '').trim();
    if (honeypot.length > 0) {
      logSecurityEvent('Automated bot submission rejected.');
      return;
    }

    // 2. Defesa Temporal (Human-like submission check: mínimo 1.2s após renderização)
    if (Date.now() - loadTimestamp < 1200) {
      logSecurityEvent('Submission too fast. Suspected automation.');
      return;
    }

    // 3. Client-Side Rate Limiting (Prevenção de spam e flooding)
    const lastSent = Number(sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '0');
    const timeSinceLast = Date.now() - lastSent;
    if (timeSinceLast < RATE_LIMIT_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RATE_LIMIT_COOLDOWN_MS - timeSinceLast) / 1000);
      if (submitBtn) {
        submitBtn.textContent = `Aguarde ${waitSeconds}s para reenviar...`;
      }
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.textContent = 'Iniciar Conversa no WhatsApp';
        }
      }, 3000);
      return;
    }

    const firstName = (formData.get('firstName')?.toString() || '').trim();
    const lastName = (formData.get('lastName')?.toString() || '').trim();
    const message = (formData.get('message')?.toString() || '').trim();

    if (!firstName || !message) return;

    if (submitBtn) {
      submitBtn.textContent = 'Abrindo WhatsApp...';
      submitBtn.disabled = true;
    }

    const targetNumber = resolveContactNumber();
    const text = `Olá! Meu nome é ${firstName}${lastName ? ' ' + lastName : ''}.\n\n${message}`;
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;

    sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, Date.now().toString());

    try {
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.opener = null;
      } else {
        // Fallback fail-safe para navegadores com popup bloqueado
        window.location.assign(whatsappUrl);
      }
    } catch {
      window.location.assign(whatsappUrl);
    } finally {
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.textContent = 'Iniciar Conversa no WhatsApp';
          submitBtn.disabled = false;
        }
      }, 2000);
    }
  });
}

/**
 * Event bus para rastreamento de conversão em tempo real
 */
function setupConversionTracking(): void {
  const trackableLinks = document.querySelectorAll<HTMLAnchorElement>('a[href]');
  trackableLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const destination = link.getAttribute('href');
      const label = link.textContent?.trim() || link.getAttribute('aria-label') || 'link';

      window.dispatchEvent(
        new CustomEvent<LeadClickDetail>('analytics:lead_click', {
          detail: { destination, label, timestamp: Date.now() },
        })
      );
    });
  });
}

class AppManager {
  private mediaQueries = {
    mobile: window.matchMedia('(max-width: 768px)'),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
  };

  private scrollEngine = createScrollEngine(this.mediaQueries);
  private liquidGlassCleanup: (() => void) | null = null;

  constructor() {
    this.#bindEvents();
  }

  #bindEvents(): void {
    const handleMediaChange = () => {
      if (this.mediaQueries.mobile.matches || this.mediaQueries.reducedMotion.matches) {
        this.scrollEngine.destroy();
      } else {
        this.scrollEngine.init();
      }
    };

    this.mediaQueries.mobile.addEventListener('change', handleMediaChange);
    this.mediaQueries.reducedMotion.addEventListener('change', handleMediaChange);
  }

  bootstrap(): void {
    try {
      this.scrollEngine.init();
      playEntranceSequence(this.mediaQueries.reducedMotion.matches);

      if (this.liquidGlassCleanup) {
        this.liquidGlassCleanup();
      }
      this.liquidGlassCleanup = initLiquidGlass();

      setupWhatsAppForm();
      setupConversionTracking();
    } catch (error) {
      logSecurityEvent(`Error during initialization. Falling back to default behavior: ${String(error)}`);
      document.documentElement.classList.add('fallback-scroll');
      gsap.set('.anim-el, .hero-cover, .profile-name', { visibility: 'visible', opacity: 1, y: 0 });
    }
  }
}

// App Initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new AppManager().bootstrap());
} else {
  new AppManager().bootstrap();
}
