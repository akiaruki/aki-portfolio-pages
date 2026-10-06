(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const menu = document.querySelector(".menu-toggle"),
    nav = document.querySelector(".main-nav");
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
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true")
      closeMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  matchMedia("(min-width:901px)").addEventListener("change", () => closeMenu());

  // App interface captures. One scheduled read per scroll/resize event;
  // native scrolling and CSS transitions provide the motion, with no idle loop.
  const story = document.querySelector(".scrollytelling");
  const chapters = [...story.querySelectorAll(".story-chapter")];
  const chapterButtons = [...story.querySelectorAll("[data-go]")];
  const compactScreen = matchMedia("(max-width:900px)");
  const shortScreen = matchMedia("(max-height:620px)");
  let storyFrame = 0, activeChapter = -1;
  const storyEnhanced = () => !motion.matches && !compactScreen.matches && !shortScreen.matches;
  const selectChapter = (index) => {
    if (index === activeChapter) return;
    activeChapter = index;
    story.dataset.chapter = String(index);
    chapters.forEach((chapter, i) => {
      const active = i === index;
      chapter.classList.toggle("is-active", active && storyEnhanced());
      chapter.inert = storyEnhanced() && !active;
      if (storyEnhanced()) chapter.setAttribute("aria-hidden", String(!active));
      else chapter.removeAttribute("aria-hidden");
    });
    chapterButtons.forEach((button, i) => {
      if (i === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  };
  const updateStory = () => {
    storyFrame = 0;
    if (!storyEnhanced()) {
      let current = 0;
      chapters.forEach((chapter, index) => {
        if (chapter.getBoundingClientRect().top <= innerHeight * 0.45) current = index;
      });
      selectChapter(current);
      return;
    }
    const bounds = story.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height - innerHeight)));
    selectChapter(Math.min(4, Math.floor(progress * 5)));
  };
  const scheduleStory = () => {
    if (!storyFrame) storyFrame = requestAnimationFrame(updateStory);
  };
  const configureStory = () => {
    cancelAnimationFrame(storyFrame);
    storyFrame = 0;
    activeChapter = -1;
    story.dataset.renderer = "app-captures";
    story.dataset.storyMode = storyEnhanced() ? "motion" : "static";
    chapters.forEach((chapter) => {
      chapter.inert = false;
      chapter.removeAttribute("aria-hidden");
      chapter.classList.remove("is-active");
    });
    updateStory();
  };
  window.addEventListener("scroll", scheduleStory, { passive: true });
  window.addEventListener("resize", scheduleStory, { passive: true });
  [motion, compactScreen, shortScreen].forEach(query => query.addEventListener("change", configureStory));
  chapterButtons.forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.go);
    if (!storyEnhanced()) {
      chapters[index].scrollIntoView({ behavior: motion.matches ? "auto" : "smooth", block: "start" });
      return;
    }
    const bounds = story.getBoundingClientRect();
    window.scrollTo({
      top: bounds.top + scrollY + (bounds.height - innerHeight) * (index === 0 ? 0 : (index + 0.3) / 5),
      behavior: "smooth",
    });
  }));
  configureStory();

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
