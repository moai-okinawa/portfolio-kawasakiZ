(() => {
  const viewer = document.querySelector("#viewer");
  if (!viewer || typeof viewer.showModal !== "function") return;
  const image = viewer.querySelector(".viewer-image");
  const title = viewer.querySelector("#viewer-title");
  const counter = viewer.querySelector("#viewer-counter");
  const note = viewer.querySelector("#viewer-note");
  const previous = viewer.querySelector(".previous");
  const next = viewer.querySelector(".next");
  const photos = Array.from(document.querySelectorAll(".photo-link")).filter(link => link.querySelector("img") && link.closest("figure")?.querySelector("h2"));
  if (!image || !title || !previous || !next || !photos.length) return;
  let current = 0;
  let opener = null;
  let savedOverflow = null;

  const showPhoto = (index) => {
    current = (index + photos.length) % photos.length;
    const link = photos[current];
    const thumbnail = link.querySelector("img");
    const figure = link.closest("figure");
    const rotated = thumbnail.classList.contains("island-rotated");
    image.src = link.href;
    image.alt = thumbnail.alt;
    image.classList.toggle("island-rotated", rotated);
    viewer.classList.toggle("island-view", rotated);
    title.textContent = figure.querySelector("h2").textContent.trim();
    if (counter) counter.textContent = `${String(current + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
    if (note) note.textContent = figure.querySelector("small")?.textContent.trim() || "";
  };
  previous.disabled = next.disabled = photos.length < 2;
  photos.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || viewer.open) return;
      showPhoto(index);
      // Native image links remain available if the browser cannot open a dialog.
      try { viewer.showModal(); } catch { return; }
      event.preventDefault();
      opener = link;
      savedOverflow = { root: document.documentElement.style.overflow, body: document.body.style.overflow };
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    });
  });
  previous.addEventListener("click", () => showPhoto(current - 1));
  next.addEventListener("click", () => showPhoto(current + 1));
  viewer.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(current + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  viewer.addEventListener("close", () => {
    if (savedOverflow) {
      document.documentElement.style.overflow = savedOverflow.root;
      document.body.style.overflow = savedOverflow.body;
      savedOverflow = null;
    }
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const box = viewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) viewer.close();
  });
})();
