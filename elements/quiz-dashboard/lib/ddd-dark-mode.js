/**
 * ddd-dark-mode.js
 * DDD-compliant dark mode: toggles `body.dark-mode` based on system preference
 * (prefers-color-scheme) and reacts to live changes. Pages provide their own
 * fallback CSS for `body.dark-mode` tokens when the DDD theme is not loaded.
 */
(function () {
  const QUERY = "(prefers-color-scheme: dark)";
  const KEY = "a3-dark-mode";

  function applyDark(prefersDark) {
    document.body.classList.toggle("dark-mode", prefersDark);
  }

  function currentPreference() {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored === "dark";
    return window.matchMedia(QUERY).matches;
  }

  try {
    applyDark(currentPreference());
  } catch (e) {
    /* localStorage unavailable (sandboxed) — fall back to matchMedia */
    const mq = window.matchMedia(QUERY);
    applyDark(mq.matches);
  }

  try {
    window.matchMedia(QUERY).addEventListener("change", (e) => applyDark(e.matches));
  } catch (e) {
    /* older browsers — ignore */
  }

  document.addEventListener("a3-dark-mode-toggle", (e) => {
    const preferDark = Boolean(e.detail && e.detail.dark);
    try {
      localStorage.setItem(KEY, preferDark ? "dark" : "light");
    } catch (err) { /* ignore */ }
    applyDark(preferDark);
  });
})();
