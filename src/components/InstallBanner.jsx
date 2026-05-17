import { useEffect, useState } from "react";

const STORAGE_KEY = "sharedxp_install_dismissed";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const InstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Never show if already installed or permanently dismissed
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ios = isIos();
    setIsIosDevice(ios);

    if (ios) {
      // iOS has no install event — just show the instructions banner after a delay
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: intercept the browser's beforeinstallprompt
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
    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install app">
      <div className="install-banner-icon" aria-hidden="true">
        <img src="/icon-192.png" alt="" width="40" height="40" />
      </div>
      <div className="install-banner-body">
        <p className="install-banner-title">Add SharedXP to your home screen</p>
        {isIosDevice ? (
          <p className="install-banner-sub">
            Tap <strong>Share</strong> <span aria-hidden="true">⎙</span> then <strong>"Add to Home Screen"</strong>
          </p>
        ) : (
          <p className="install-banner-sub">Install the app for a faster, full-screen experience</p>
        )}
      </div>
      <div className="install-banner-actions">
        <button type="button" className="install-banner-dismiss" onClick={dismiss} aria-label="Dismiss">
          Not now
        </button>
        {!isIosDevice && (
          <button type="button" className="install-banner-install" onClick={install}>
            Install
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallBanner;
