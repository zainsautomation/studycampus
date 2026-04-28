// Lightweight analytics wrapper for Google Analytics 4.
// Activates automatically when VITE_GA_MEASUREMENT_ID is set in .env.
// Safe no-op when the env var is missing — nothing breaks in dev.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let initialized = false;

export function initAnalytics() {
  if (initialized || !GA_ID || typeof window === 'undefined') return;

  // Inject GA script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: false, // we send manually for SPA
    anonymize_ip: true,
  });

  initialized = true;
}

export function trackPageView(path: string, title?: string) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(name: string, params: Record<string, any> = {}) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', name, params);
}

export const isAnalyticsEnabled = () => Boolean(GA_ID);
