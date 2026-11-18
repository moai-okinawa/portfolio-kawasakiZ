(() => {
  // Navigation remains fully usable when JavaScript or media queries are absent.
  const menu = document.querySelector("#site-menu");
  const toggle = document.querySelector(".menu-toggle");
  if (menu && toggle && window.matchMedia) {
    const mobile = window.matchMedia("(max-width: 760px)");
    const setMenu = (open) => {
      menu.hidden = mobile.matches && !open;
      toggle.setAttribute("aria-expanded", String(mobile.matches && open));
      toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    };
    const syncMenu = () => {
      const focused = document.activeElement;
      // Move focus before its current control becomes hidden at a breakpoint.
      if (mobile.matches) {
        toggle.hidden = false;
        if (menu.contains(focused)) toggle.focus({ preventScroll: true });
        setMenu(false);
      } else {
        setMenu(false);
        if (focused === toggle) menu.querySelector("a")?.focus({ preventScroll: true });
        toggle.hidden = true;
      }
    };
    toggle.addEventListener("click", () => setMenu(menu.hidden));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !mobile.matches || menu.hidden) return;
      setMenu(false);
      toggle.focus({ preventScroll: true });
    });
    menu.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link || !menu.contains(link) || !mobile.matches) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute("href") || "";
      const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
      if (target) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      } else {
        toggle.focus({ preventScroll: true });
      }
      setMenu(false);
    });
    if (mobile.addEventListener) mobile.addEventListener("change", syncMenu);
    else mobile.addListener(syncMenu);
    syncMenu();
  }

  // A native details element is the no-JS / no-dialog fallback for each work.
  const dialog = document.querySelector("#work-dialog");
  const image = document.querySelector("#dialog-image");
  const title = document.querySelector("#dialog-title");
  const meta = document.querySelector("#dialog-meta");
  const description = document.querySelector("#dialog-description");
  if (dialog && image && title && meta && description && typeof dialog.showModal === "function") {
    let opener = null;
    let savedOverflow = null;
    const unlock = () => {
      if (savedOverflow) {
        document.documentElement.style.overflow = savedOverflow.root;
        document.body.style.overflow = savedOverflow.body;
        savedOverflow = null;
      }
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    };
    for (const work of document.querySelectorAll(".work")) {
      const summary = work.querySelector(".work-details summary");
      const workImage = work.querySelector(".cover");
      const workTitle = work.querySelector("h3");
      const workMeta = work.querySelector(".meta");
      const content = work.querySelector(".work-detail-content");
      if (!summary || !workImage || !workTitle || !workMeta || !content) continue;
      summary.setAttribute("aria-haspopup", "dialog");
      summary.setAttribute("aria-controls", dialog.id);
      summary.setAttribute("aria-label", `作品をひらく：${workTitle.textContent.trim()}`);
      summary.addEventListener("click", (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || dialog.open) return;
        image.src = workImage.src;
        image.alt = workImage.alt;
        title.textContent = workTitle.textContent.trim();
        meta.replaceChildren(...workMeta.cloneNode(true).childNodes);
        description.replaceChildren(...content.cloneNode(true).childNodes);
        // If opening fails, keep the native details action available.
        try { dialog.showModal(); } catch { return; }
        event.preventDefault();
        opener = summary;
        savedOverflow = { root: document.documentElement.style.overflow, body: document.body.style.overflow };
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        dialog.scrollTop = 0;
      });
    }
    dialog.addEventListener("close", unlock);
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  }

  // Only local section links receive location state; the photo page retains page state.
  const sections = Array.from(document.querySelectorAll('#site-menu a[href^="#"]'), (link) => ({
    link, section: document.getElementById(link.hash.slice(1)),
  })).filter(({ link, section }) => section && link.getAttribute("aria-current") !== "page");
  if (sections.length) {
    let frame = 0;
    const updateCurrent = () => {
      frame = 0;
      const active = sections.filter(({ section }) => section.getBoundingClientRect().top <= window.innerHeight / 3).pop() || sections[0];
      for (const item of sections) {
        if (item === active) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(updateCurrent); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    updateCurrent();
  }
})();
