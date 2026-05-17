import { useEffect, useState } from "react";

const STORAGE_KEY = "sharedxp_install_dismissed";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const IOS_STEPS = [
  {
    num: 1,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#96c93d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
    text: <>Tap the <strong>Share</strong> button at the bottom of your browser</>
  },
  {
    num: 2,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#96c93d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></>
  },
  {
    num: 3,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#96c93d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    text: <>Tap <strong>"Add"</strong> in the top-right corner to confirm</>
  },
];

const IosInstructionsModal = ({ onClose }) => (
  <div className="install-modal-overlay" role="dialog" aria-modal="true" aria-label="How to install SharedXP">
    <div className="install-modal">
      <div className="install-modal-header">
        <img src="/icon-192.png" alt="SharedXP" width="48" height="48" className="install-modal-icon" />
        <div>
          <p className="install-modal-title">Add to Home Screen</p>
          <p className="install-modal-sub">Install SharedXP in 3 easy steps</p>
        </div>
        <button type="button" className="install-modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <ol className="install-modal-steps">
        {IOS_STEPS.map((step) => (
          <li key={step.num} className="install-modal-step">
            <span className="install-step-icon">{step.icon}</span>
            <span className="install-step-text">{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="install-modal-arrow-hint">
        <div className="install-modal-arrow-label">Tap the Share button here</div>
        <div className="install-modal-arrow">↓</div>
      </div>

      <button type="button" className="install-modal-done" onClick={onClose}>
        Got it
      </button>
    </div>
  </div>
);

const InstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ios = isIos();
    setIsIosDevice(ios);

    if (ios) {
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
    setDeferredPrompt(null);
  };

  const closeIosModal = () => {
    setShowIosModal(false);
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return (
    <>
      {show && (
        <div className="install-banner" role="dialog" aria-label="Install app">
          <div className="install-banner-icon" aria-hidden="true">
            <img src="/icon-192.png" alt="" width="40" height="40" />
          </div>
          <div className="install-banner-body">
            <p className="install-banner-title">Add SharedXP to your home screen</p>
            <p className="install-banner-sub">
              {isIosDevice
                ? "Get the full app experience — works offline too"
                : "Install for a faster, full-screen experience"}
            </p>
          </div>
          <div className="install-banner-actions">
            <button type="button" className="install-banner-dismiss" onClick={dismiss}>
              Not now
            </button>
            {isIosDevice ? (
              <button type="button" className="install-banner-install" onClick={() => setShowIosModal(true)}>
                How?
              </button>
            ) : (
              <button type="button" className="install-banner-install" onClick={install}>
                Install
              </button>
            )}
          </div>
        </div>
      )}

      {showIosModal && <IosInstructionsModal onClose={closeIosModal} />}
    </>
  );
};

export default InstallBanner;
