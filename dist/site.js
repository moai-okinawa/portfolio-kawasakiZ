const dialog = document.querySelector("#work-dialog");
const dialogImage = document.querySelector("#dialog-image");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMeta = document.querySelector("#dialog-meta");
const dialogDescription = document.querySelector("#dialog-description");

for (const work of document.querySelectorAll(".work")) {
  const button = work.querySelector("button");
  button.addEventListener("click", () => {
    const image = work.querySelector(".cover");
    dialogImage.src = image.src;
    dialogImage.alt = image.alt;
    dialogTitle.textContent = button.firstChild.textContent;
    dialogMeta.replaceChildren(...work.querySelector(".meta").cloneNode(true).childNodes);
    dialogDescription.replaceChildren(work.querySelector("template").content.cloneNode(true));
    dialog.showModal();
    dialog.scrollTop = 0;
  });
}

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

const sectionLinks = Array.from(document.querySelectorAll("nav a"), (link) => ({
  link,
  section: document.querySelector(link.hash),
}));

function markCurrentSection() {
  const active = sectionLinks.filter(({ section }) => section.getBoundingClientRect().top <= window.innerHeight / 3).pop() ?? sectionLinks[0];
  for (const item of sectionLinks) {
    if (item === active) item.link.setAttribute("aria-current", "location");
    else item.link.removeAttribute("aria-current");
  }
}

window.addEventListener("scroll", markCurrentSection, { passive: true });
window.addEventListener("resize", markCurrentSection);
markCurrentSection();
