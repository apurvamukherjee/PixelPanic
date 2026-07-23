import { useEffect } from "react";

// Pushes a throwaway history entry while an overlay is open so the device/
// browser Back button dismisses it instead of navigating away entirely.
export function useBackClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ overlay: true }, "");
    const handlePopState = () => onClose();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
