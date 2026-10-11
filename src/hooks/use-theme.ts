"use client";
import { useEffect, useState } from "react";
const KEY = "omni-bridge-theme";
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function sync() {
      let choice: string | null = null;
      try { choice = localStorage.getItem(KEY); } catch { /* System preference still works without storage. */ }
      const next = choice === "dark" || choice === "light" ? choice : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next; setTheme(next);
    }
    sync(); media.addEventListener("change", sync); window.addEventListener("storage", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", sync); };
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; setTheme(next);
    try { localStorage.setItem(KEY, next); } catch { /* Toggle remains active for this page session. */ }
  }
  return { theme, toggle };
}
