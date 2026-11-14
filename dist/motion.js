(() => {
  // Without JavaScript or independent translate support, everything stays visible.
  if (!window.CSS?.supports("translate", "0 1px") || !window.matchMedia) return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = Array.from(document.querySelectorAll(
    ".intro, .print, .activities .kicker, .activities h2, .activity, " +
    ".works > .kicker, .works > h2, .work, .album-intro, .journal-photo"
  ), (element) => ({ element, state: null }));
  let frame = 0;
  let active = false;
  let printing = false;

  function update() {
    frame = 0;
    if (!active || document.hidden) return;
    const height = window.innerHeight;
    const lowerEdge = height - Math.min(56, height * .07);

    // Read all positions before changing styles. Remove the current animated
    // translation so the movement itself cannot retrigger the boundary.
    const next = items.map(({ element, state }) => {
      if (element.contains(document.activeElement)) return "visible";
      const rect = element.getBoundingClientRect();
      const translate = getComputedStyle(element).translate;
      const offset = parseFloat(translate.split(/\s+/)[1]) || 0;
      const top = rect.top - offset;
      const bottom = rect.bottom - offset;
      const upperEdge = Math.min(112, height * .16, rect.height * .7);
      // A small dead band prevents flickering when scrolling near an edge.
      if (bottom <= upperEdge + (state === "above" ? 12 : 0)) return "above";
      if (top >= lowerEdge - (state === "below" ? 12 : 0)) return "below";
      return "visible";
    });

    document.documentElement.classList.remove("scroll-motion-priming");
    items.forEach((item, index) => {
      if (item.state === next[index]) return;
      item.state = next[index];
      item.element.dataset.scrollState = item.state;
    });
  }

  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(update);
  }

  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    active = !preference.matches && !printing;
    document.documentElement.classList.toggle("scroll-motion-priming", active);
    items.forEach((item) => {
      item.element.classList.toggle("scroll-reveal", active);
      item.state = null;
      if (active) item.element.dataset.scrollState = "below";
      else delete item.element.dataset.scrollState;
    });
    if (active) {
      // Commit the initial pose without a transition, then fade in over 1.4s.
      void document.documentElement.offsetWidth;
      schedule();
    }
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("load", schedule, true);
  document.addEventListener("focusin", schedule);
  document.addEventListener("focusout", schedule);
  preference.addEventListener("change", sync);
  window.addEventListener("beforeprint", () => { printing = true; sync(); });
  window.addEventListener("afterprint", () => { printing = false; sync(); });
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    items.forEach(({ element }) => observer.observe(element));
  }
  document.fonts?.ready.then(schedule);
  sync();
})();
