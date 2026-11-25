import { useEffect, useRef } from "react";

/**
 * Hardware Back Button Handler for Android (Capacitor App plugin + History Popstate)
 * Order of precedence:
 * 1. Close any open modal (Memory, Voice Pack, Legal, Auth)
 * 2. Close mobile sidebar drawer if open on mobile (<768px)
 * 3. Prompt "Press back again to exit" before exiting the Android app
 */
export function useAndroidBackButton({
  hasOpenModal,
  closeAllModals,
  isMobileDrawerOpen,
  closeMobileDrawer,
  onToast
}) {
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    const capApp =
      typeof window !== "undefined" ? window.Capacitor?.Plugins?.App : null;
    if (!capApp?.addListener) return undefined;

    let listenerHandle = null;
    capApp
      .addListener("backButton", () => {
        if (hasOpenModal) {
          closeAllModals();
          return;
        }
        if (isMobileDrawerOpen) {
          closeMobileDrawer();
          return;
        }
        const now = Date.now();
        if (now - lastBackPressRef.current < 2200) {
          capApp.exitApp?.();
        } else {
          lastBackPressRef.current = now;
          onToast?.("Press back again to exit GitaGPT");
        }
      })
      .then((h) => {
        listenerHandle = h;
      })
      .catch(() => {});

    return () => {
      listenerHandle?.remove?.();
    };
  }, [
    hasOpenModal,
    closeAllModals,
    isMobileDrawerOpen,
    closeMobileDrawer,
    onToast
  ]);
}
