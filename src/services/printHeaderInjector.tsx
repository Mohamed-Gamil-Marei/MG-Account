import React from 'react';
import { createRoot } from 'react-dom/client';
import { db } from '../db/localDatabase';
import { OfficialReportHeader } from '../components/common/OfficialReportHeader';
import { DensityProvider } from '../components/common/CompactDensityContext';
import { I18nProvider } from '../utils/i18n';

let injectedHeaderContainer: HTMLElement | null = null;
let injectedRoot: ReturnType<typeof createRoot> | null = null;
let isInjectorInitialized = false;

/**
 * Injects the official office letterhead component at the beginning of the body/main DOM
 * right before printing occurs (`window.onbeforeprint`).
 * Then cleanly tears it down on `window.onafterprint`.
 */
export function injectPrintHeader(customTitle?: string): void {
  try {
    const state = db.getState();
    const officeProfile = state.officeProfile;
    const activeClientId = state.activeClientContext?.clientId;
    const clientProfile = activeClientId
      ? state.clients.find((c) => c.id === activeClientId)
      : (state.clients && state.clients[0]) || null;
    const fiscalYear = state.activeClientContext?.selectedFiscalYear || new Date().getFullYear();

    // If an existing container exists, clean it up first
    removeInjectedPrintHeader();

    // Check if the printable content already includes an official header
    const activePrintable = document.querySelector('[data-printable="true"], #printable-document-root, #credit-financials-container, [data-letterhead="true"]');
    const hasInternalOfficialHeader = activePrintable?.querySelector('.official-header, .injected-official-print-header, [data-official-header="true"]');

    // If an official header already exists inside the printable document, skip injection completely
    if (hasInternalOfficialHeader) {
      return;
    }

    // Create container
    injectedHeaderContainer = document.createElement('div');
    injectedHeaderContainer.id = 'injected-print-header-root';
    injectedHeaderContainer.className = 'injected-official-print-header w-full';

    // Insert at the top of the body or root
    const rootEl = document.getElementById('root') || document.body;
    rootEl.insertBefore(injectedHeaderContainer, rootEl.firstChild);

    injectedRoot = createRoot(injectedHeaderContainer);
    injectedRoot.render(
      <DensityProvider>
        <I18nProvider>
          <div className="w-full">
            <OfficialReportHeader
              officeProfile={officeProfile}
              clientProfile={clientProfile}
              fiscalYear={fiscalYear}
              documentTitle={customTitle || document.title || 'تقرير مالي محاسبي معتمد'}
              variant="print-only"
              className="w-full"
            />
          </div>
        </I18nProvider>
      </DensityProvider>
    );
  } catch (err) {
    console.warn('[injectPrintHeader] Warning while injecting print header:', err);
  }
}

/**
 * Removes the injected print header after printing finishes
 */
export function removeInjectedPrintHeader(): void {
  try {
    if (injectedRoot) {
      injectedRoot.unmount();
      injectedRoot = null;
    }
    if (injectedHeaderContainer && injectedHeaderContainer.parentNode) {
      injectedHeaderContainer.parentNode.removeChild(injectedHeaderContainer);
      injectedHeaderContainer = null;
    }
  } catch (err) {
    console.warn('[removeInjectedPrintHeader] Cleanup error:', err);
  }
}

/**
 * Installs global beforeprint and afterprint event listeners
 */
export function initPrintHeaderInjection(): void {
  if (isInjectorInitialized || typeof window === 'undefined') return;
  isInjectorInitialized = true;

  window.addEventListener('beforeprint', () => {
    injectPrintHeader();
  });

  window.addEventListener('afterprint', () => {
    // Delay unmount slightly to ensure print rasterization has grabbed the DOM
    setTimeout(() => {
      removeInjectedPrintHeader();
    }, 500);
  });
}
