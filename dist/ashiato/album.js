const viewer = document.querySelector("#viewer");
const fullImage = viewer.querySelector(".viewer-image");
const title = viewer.querySelector("#viewer-title");
const photos = Array.from(document.querySelectorAll(".photo-link"));
let current = 0;

function showPhoto(index) {
  current = (index + photos.length) % photos.length;
  const link = photos[current];
  fullImage.src = link.href;
  fullImage.alt = link.querySelector("img").alt;
  title.textContent = link.closest("figure").querySelector("h2").textContent;
}

photos.forEach((link, index) => {
  link.addEventListener("click", (event) => {
    if (!viewer.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    showPhoto(index);
    viewer.showModal();
  });
});

viewer.querySelector(".previous").addEventListener("click", () => showPhoto(current - 1));
viewer.querySelector(".next").addEventListener("click", () => showPhoto(current + 1));
viewer.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(current + (event.key === "ArrowLeft" ? -1 : 1));
  }
});
viewer.addEventListener("click", (event) => {
  if (event.target !== viewer) return;
  const box = viewer.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
    viewer.close();
  }
});
