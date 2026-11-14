(() => {
  // Content stays visible if JavaScript or animation APIs are unavailable.
  if (!("IntersectionObserver" in window) || !Element.prototype.animate) return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches) return;

  const targets = document.querySelectorAll(
    ".intro, .activities .kicker, .activities h2, .activity, " +
    ".works > .kicker, .works > h2, .work, .album-intro, .journal-photo"
  );
  const running = new Map();
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (preference.matches || document.hidden || target.contains(document.activeElement)) continue;

      const animation = target.animate(
        [
          { opacity: 0, transform: "translateY(18px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 620,
          delay: Math.min(order++, 3) * 70,
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "backwards",
        }
      );
      running.set(target, animation);
      const cleanUp = () => running.delete(target);
      animation.addEventListener("finish", cleanUp, { once: true });
      animation.addEventListener("cancel", cleanUp, { once: true });
    }
  }, { threshold: 0 });

  targets.forEach((target) => observer.observe(target));

  // Keyboard focus should never wait for a fade or staggered entrance.
  document.addEventListener("focusin", (event) => {
    for (const target of targets) {
      if (!target.contains(event.target)) continue;
      observer.unobserve(target);
      running.get(target)?.cancel();
      running.delete(target);
    }
  });

  const stop = () => {
    observer.disconnect();
    for (const animation of running.values()) animation.cancel();
    running.clear();
  };
  preference.addEventListener("change", (event) => {
    if (event.matches) stop();
  });
  window.addEventListener("beforeprint", stop);
})();
