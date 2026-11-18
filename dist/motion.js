(() => {
  // Enhancement only: the document is readable before this file runs, when it
  // cannot run, and when motion is disabled. No perpetual animation loop.
  if (!window.CSS?.supports("translate", "0 1px") || !window.matchMedia) return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
  const root = document.documentElement;
  const items = Array.from(document.querySelectorAll("[data-reveal]"),
    (element) => ({ element, state: null }));
  const parallax = Array.from(document.querySelectorAll("[data-parallax]"),
    (element) => ({ element, value: 0 }));
  const routes = Array.from(document.querySelectorAll(".journey-route"), (element) => ({
    element,
    lines: Array.from(element.querySelectorAll(".route-line")),
    steps: Array.from(element.querySelectorAll(".route-step")),
  }));
  const progress = document.querySelector(".reading-progress");
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  let frame = 0;
  let active = false;
  let printing = false;

  function update() {
    frame = 0;
    if (!active || document.hidden) return;
    const height = window.innerHeight;
    const lowerEdge = height - Math.min(56, height * .07);

    // Measure first, then write. Compensate for the currently interpolated
    // translate so an animation cannot keep retriggering its own boundary.
    const next = items.map(({ element, state }) => {
      if (element.contains(document.activeElement)) return "visible";
      const rect = element.getBoundingClientRect();
      const offset = parseFloat(getComputedStyle(element).translate.split(/\s+/)[1]) || 0;
      const top = rect.top - offset;
      const bottom = rect.bottom - offset;
      const upperEdge = Math.min(112, height * .16, rect.height * .7);
      if (bottom <= upperEdge + (state === "above" ? 12 : 0)) return "above";
      if (top >= lowerEdge - (state === "below" ? 12 : 0)) return "below";
      return "visible";
    });
    const offsets = parallax.map(({ element, value }) => {
      if (!desktop.matches) return 0;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > height) return value;
      return clamp((height / 2 - (rect.top - value + rect.height / 2)) * .06, -24, 24);
    });
    const routeProgress = routes.map(({ element }) => {
      const rect = element.getBoundingClientRect();
      const offset = parseFloat(getComputedStyle(element).translate.split(/\s+/)[1]) || 0;
      return clamp((height * .8 - rect.top + offset) / Math.max(1, rect.height + height * .25));
    });
    const scrollable = Math.max(0, root.scrollHeight - height);
    const completion = scrollable > 0 ? clamp(window.scrollY / scrollable) : 0;

    root.classList.remove("scroll-motion-priming");
    items.forEach((item, index) => {
      if (item.state === next[index]) return;
      item.state = next[index];
      item.element.dataset.scrollState = item.state;
    });
    parallax.forEach((item, index) => {
      if (item.value === offsets[index]) return;
      item.value = offsets[index];
      item.element.style.setProperty("--parallax-y", `${item.value.toFixed(2)}px`);
    });
    routes.forEach(({ element, steps }, index) => {
      const amount = routeProgress[index];
      element.style.setProperty("--route-progress", amount.toFixed(4));
      steps.forEach((step, stepIndex) => {
        step.dataset.stepVisible = String(amount >= (stepIndex + 1) / (steps.length + 1));
      });
    });
    progress?.style.setProperty("--reading-progress", completion.toFixed(4));
  }

  function schedule() {
    if (active && !document.hidden && !frame) frame = requestAnimationFrame(update);
  }

  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    active = !preference.matches && !printing;
    root.classList.toggle("motion-enhanced", active);
    root.classList.toggle("scroll-motion-priming", active);
    items.forEach((item) => {
      item.element.classList.toggle("scroll-reveal", active);
      item.state = null;
      // Do not hide content before a successful geometry measurement.
      delete item.element.dataset.scrollState;
    });
    parallax.forEach((item) => {
      item.value = 0;
      item.element.style.removeProperty("--parallax-y");
    });
    routes.forEach(({ element, lines, steps }) => {
      element.style.removeProperty("--route-progress");
      lines.forEach((line) => line.setAttribute("pathLength", "1"));
      steps.forEach((step) => { delete step.dataset.stepVisible; });
    });
    progress?.style.removeProperty("--reading-progress");
    if (active) schedule();
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("load", schedule, true);
  document.addEventListener("focusin", schedule);
  document.addEventListener("focusout", schedule);
  preference.addEventListener("change", sync);
  desktop.addEventListener("change", schedule);
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
