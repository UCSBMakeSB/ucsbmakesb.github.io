// A refresh starts at the top; normal section links and Back still work.
if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
  history.scrollRestoration = "manual";
  if (location.hash) {
    history.replaceState(history.state, "", location.pathname + location.search);
  }
  window.addEventListener("load", () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    history.scrollRestoration = "auto";
  }, { once: true });
}
