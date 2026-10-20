(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const menu = document.querySelector(".menu-toggle"),
    nav = document.querySelector(".main-nav"),
    header = document.querySelector(".site-header");
  const closeMenu = (focus = false) => {
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
    nav.classList.remove("is-open");
    if (focus) menu.focus();
  };
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    nav.classList.toggle("is-open", open);
  });
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    const wasOpen = menu.getAttribute("aria-expanded") === "true";
    closeMenu();
    if (!wasOpen || !link.hash) return;
    const destination = document.getElementById(link.hash.slice(1));
    if (!destination) return;
    if (!destination.hasAttribute("tabindex")) {
      destination.setAttribute("tabindex", "-1");
      destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), { once: true });
    }
    destination.focus({ preventScroll: true });
  });
  header.addEventListener("focusout", (event) => {
    if (!header.contains(event.relatedTarget)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true")
      closeMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  matchMedia("(min-width:901px)").addEventListener("change", () => closeMenu());

  // Pre-rendered using the application's native Look recipes and renderer.
  // Decode offscreen before committing a matching image, label and selection.
  const lookImage = document.querySelector("#look-result"),
    lookName = document.querySelector("#look-name"),
    lookStatus = document.querySelector("#look-status"),
    lookExperience = document.querySelector(".look-experience");
  const lookButtons = [...document.querySelectorAll("[data-look]")];
  let lookRequest = 0;
  const decodedLooks = new Map();
  const loadLook = (slug) => {
    if (!decodedLooks.has(slug)) {
      const image = new Image();
      image.src = `assets/look-v3-${slug}.webp`;
      const ready = image
        .decode()
        .then(() => image)
        .catch((error) => {
          decodedLooks.delete(slug);
          throw error;
        });
      decodedLooks.set(slug, ready);
    }
    return decodedLooks.get(slug);
  };
  const selectLook = async (button) => {
    const request = ++lookRequest;
    const name = button.dataset.name;
    lookExperience.setAttribute("aria-busy", "true");
    lookStatus.textContent = `Loading ${name}…`;
    try {
      const image = await loadLook(button.dataset.look);
      if (request !== lookRequest) return;
      lookImage.src = image.src;
      lookImage.alt =
        button.dataset.look === "original"
          ? "Original yellow flower photograph, without an Adaptive Look"
          : `Yellow flower photograph with Aki Studio's ${name} Adaptive Look`;
      lookName.textContent = name;
      lookButtons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button)),
      );
      lookStatus.textContent = "";
    } catch {
      if (request !== lookRequest) return;
      lookStatus.textContent = `${name} couldn’t load. Select it again to retry.`;
    } finally {
      if (request === lookRequest)
        lookExperience.setAttribute("aria-busy", "false");
    }
  };
  lookButtons.forEach((button) => {
    button.addEventListener("click", () => selectLook(button));
    button.addEventListener("keydown", (event) => {
      let index = lookButtons.indexOf(button);
      if (event.key === "ArrowRight") index = (index + 1) % lookButtons.length;
      else if (event.key === "ArrowLeft")
        index = (index + lookButtons.length - 1) % lookButtons.length;
      else return;
      event.preventDefault();
      lookButtons[index].focus();
      selectLook(lookButtons[index]);
    });
  });
})();
