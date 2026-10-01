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

  // The story is an offline Blender render composited in Remotion. No WebGL is
  // needed by the visitor. Semantic chapters and posters remain the baseline.
  const story = document.querySelector(".scrollytelling"),
    viewport = story.querySelector(".story-viewport");
  const video = document.querySelector("#story-video"),
    poster = document.querySelector("#story-poster");
  const chapters = [...story.querySelectorAll(".story-chapter")],
    chapterButtons = [...story.querySelectorAll("[data-go]")];
  const connection = navigator.connection;
  let enabled = false,
    visible = true,
    frame = 0,
    latestY = scrollY,
    metrics,
    dirty = true,
    activeChapter = -1,
    targetTime = 0,
    alternateTried = false;
  story.dataset.renderer = "static";
  const preference = () =>
    motion.matches
      ? "reduced-motion"
      : connection?.saveData
        ? "data-saving"
        : "";
  const fallback = (reason) => {
    enabled = false;
    cancelAnimationFrame(frame);
    frame = 0;
    video.pause();
    story.dataset.storyMode = "static";
    story.dataset.renderer = "static";
    story.dataset.fallbackReason = reason;
    story.querySelector(".story-render").classList.remove("video-ready");
    for (const chapter of chapters) {
      chapter.inert = false;
      chapter.removeAttribute("aria-hidden");
      chapter.classList.remove("is-active");
    }
  };
  const phaseAt = (p) =>
    p < 0.13 ? 0 : p < 0.33 ? 1 : p < 0.54 ? 2 : p < 0.74 ? 3 : 4;
  const draw = () => {
    frame = 0;
    if (!enabled || document.hidden || !visible) return;
    if (dirty) {
      const r = story.getBoundingClientRect();
      metrics = {
        top: r.top + latestY,
        height: r.height,
        viewport: innerHeight,
      };
      dirty = false;
    }
    const progress = Math.max(
      0,
      Math.min(
        1,
        (latestY - metrics.top) /
          Math.max(1, metrics.height - metrics.viewport),
      ),
    );
    const phase = phaseAt(progress);
    if (phase !== activeChapter) {
      activeChapter = phase;
      chapters.forEach((chapter, index) => {
        const active = index === phase;
        chapter.classList.toggle("is-active", active);
        chapter.inert = !active;
        chapter.setAttribute("aria-hidden", String(!active));
      });
      chapterButtons.forEach((button, index) => {
        if (index === phase) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      poster.src = `assets/story-${phase}.webp`;
    }
    story.dataset.progress = progress.toFixed(3);
    story.dataset.chapter = String(phase);
    targetTime = progress * Math.max(0, video.duration - 1 / 24);
    if (
      !video.seeking &&
      video.readyState >= 2 &&
      Math.abs(video.currentTime - targetTime) > 0.026
    )
      video.currentTime = targetTime;
  };
  const schedule = () => {
    if (enabled && visible && !document.hidden && !frame)
      frame = requestAnimationFrame(draw);
  };
  video.addEventListener("seeked", schedule);
  video.addEventListener("error", () => {
    if (
      !alternateTried &&
      !preference() &&
      video.canPlayType('video/webm; codecs="vp9"')
    ) {
      alternateTried = true;
      video.src = video.src.replace(/\.mp4$/, ".webm");
      video.load();
      return;
    }
    fallback("video-unavailable");
  });
  video.addEventListener("loadeddata", () => {
    if (preference()) {
      fallback(preference());
      return;
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      fallback("video-duration-unavailable");
      return;
    }
    enabled = true;
    story.dataset.storyMode = "motion";
    story.dataset.renderer = "blender-remotion-video";
    delete story.dataset.fallbackReason;
    story.querySelector(".story-render").classList.add("video-ready");
    dirty = true;
    activeChapter = -1;
    schedule();
  });
  const start = () => {
    if (preference()) {
      fallback(preference());
      return;
    }
    const format = video.canPlayType("video/mp4")
      ? "mp4"
      : video.canPlayType('video/webm; codecs="vp9"')
        ? "webm"
        : "";
    if (!format) {
      fallback("video-format-unavailable");
      return;
    }
    alternateTried = format === "webm";
    story.dataset.renderer = "loading-rendered-video";
    video.preload = "auto";
    video.src = `assets/aki-story-${matchMedia("(max-width:900px)").matches ? "mobile" : "desktop"}.${format}`;
    video.load();
  };
  if ("requestIdleCallback" in window)
    requestIdleCallback(start, { timeout: 700 });
  else setTimeout(start, 150);
  window.addEventListener(
    "scroll",
    () => {
      latestY = scrollY;
      schedule();
    },
    { passive: true },
  );
  window.addEventListener(
    "resize",
    () => {
      dirty = true;
      schedule();
    },
    { passive: true },
  );
  if ("ResizeObserver" in window)
    new ResizeObserver(() => {
      dirty = true;
      schedule();
    }).observe(story);
  if ("IntersectionObserver" in window)
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) schedule();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0 },
    ).observe(viewport);
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden) {
      dirty = true;
      schedule();
    }
  });
  motion.addEventListener("change", () => {
    if (preference()) fallback(preference());
  });
  connection?.addEventListener("change", () => {
    if (preference()) fallback(preference());
  });
  chapterButtons.forEach((button) =>
    button.addEventListener("click", () => {
      if (!enabled) return;
      const positions = [0, 0.23, 0.45, 0.64, 0.86],
        r = story.getBoundingClientRect();
      window.scrollTo({
        top:
          r.top +
          scrollY +
          (r.height - innerHeight) * positions[Number(button.dataset.go)],
        behavior: motion.matches ? "instant" : "smooth",
      });
    }),
  );

  // Every look result is a separate image captured from the real application.
  const lookImage = document.querySelector("#look-result"),
    lookName = document.querySelector("#look-name");
  const lookButtons = [...document.querySelectorAll("[data-look]")];
  let lookRequest = 0;
  const selectLook = async (button) => {
    const request = ++lookRequest;
    lookButtons.forEach((b) =>
      b.setAttribute("aria-pressed", String(b === button)),
    );
    lookImage.style.opacity = ".45";
    lookImage.src = `assets/look-${button.dataset.look}.webp`;
    lookImage.alt = `Gumamela photograph rendered in Aki Studio with the ${button.textContent} look`;
    lookName.textContent = button.textContent;
    try {
      await lookImage.decode();
    } catch {}
    if (request === lookRequest) lookImage.style.opacity = "1";
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

  // Original vector icons and local, optional demo preferences. No app state is
  // read or changed. Touch dragging is limited to each card's handle.
  const tools = [
    ["crop", "Crop", "M7 3v14h14M3 7h14v14"],
    [
      "develop",
      "Develop",
      "M12 3v2m0 14v2M3 12h2m14 0h2M5.5 5.5l1.4 1.4m10.2 10.2 1.4 1.4m0-13-1.4 1.4M6.9 17.1l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    ],
    ["curves", "Curves", "M4 3v17h17M5 18C16 18 7 5 20 5"],
    [
      "color",
      "Color Mixer",
      "M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z",
    ],
    ["detail", "Detail", "m12 3 10 18H2L12 3Zm0 6v5m0 3v1"],
    ["mono", "B&W Mixer", "M12 3v18M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"],
    [
      "split",
      "Split Toning",
      "M14 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m8 4a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
    ],
    [
      "optics",
      "Optics",
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    ],
    [
      "geometry",
      "Geometry",
      "M6 3h12l3 18H3L6 3Zm3 0-1 18m7-18 1 18M5 9h14M4 15h16",
    ],
    ["effects", "Effects", "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"],
    ["frame", "Frame", "M3 3h18v18H3V3Zm4 4h10v10H7V7Z"],
    [
      "date",
      "Date",
      "M7 2v5m10-5v5M3 10h18M6 4h12a3 3 0 0 1 3 3v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3m2 11h8",
    ],
  ];
  const defaults = tools.map((x) => x[0]),
    storageKey = "aki-tool-demo-order-v1";
  let order = defaults.slice(),
    picked = null,
    snapshot = null,
    drag = null,
    suppressClick = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      Array.isArray(saved) &&
      saved.length === defaults.length &&
      new Set(saved).size === defaults.length &&
      saved.every((x) => defaults.includes(x))
    )
      order = saved;
  } catch {}
  const grid = document.querySelector("#tool-grid"),
    status = document.querySelector("#organizer-status");
  const nameOf = (id) => tools.find((x) => x[0] === id)[1];
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(order));
    } catch {}
  };
  const labelCards = () =>
    [...grid.children].forEach((card, index) => {
      card.setAttribute(
        "aria-label",
        `${nameOf(card.dataset.tool)}. Position ${index + 1} of ${order.length}. Press Space to arrange.`,
      );
      card.setAttribute("aria-pressed", String(card.dataset.tool === picked));
      card.classList.toggle("is-picked", card.dataset.tool === picked);
    });
  const synchronize = () => {
    order.forEach((id) =>
      grid.append(grid.querySelector(`[data-tool="${id}"]`)),
    );
    labelCards();
  };
  const move = (id, to) => {
    const from = order.indexOf(id);
    to = Math.max(0, Math.min(order.length - 1, to));
    if (from === to) return;
    order.splice(from, 1);
    order.splice(to, 0, id);
    synchronize();
    status.textContent = `${nameOf(id)} moved to position ${to + 1}.`;
  };
  const finishKeyboard = (cancel) => {
    if (cancel && snapshot) {
      order = snapshot.slice();
      synchronize();
      status.textContent = "Arrangement restored.";
    } else {
      save();
      if (picked)
        status.textContent = `${nameOf(picked)} placed. Your demo arrangement is saved in this browser.`;
    }
    picked = null;
    snapshot = null;
    labelCards();
  };
  const pick = (id) => {
    if (picked === id) {
      finishKeyboard(false);
      return;
    }
    if (picked) finishKeyboard(false);
    snapshot = order.slice();
    picked = id;
    labelCards();
    status.textContent = `${nameOf(id)} selected. Use arrow keys to move it, Enter to place, or Escape to cancel.`;
  };
  for (const [id, name, path] of tools) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "tool-card";
    card.dataset.tool = id;
    card.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg><span class="tool-name">${name}</span><span class="drag-handle" aria-hidden="true"><svg class="icon"><use href="#grip"/></svg></span>`;
    card.addEventListener("click", () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      pick(id);
    });
    card.addEventListener("keydown", (event) => {
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        index = order.indexOf(id),
        deltas = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -cols,
          ArrowDown: cols,
        };
      if (event.key === " ") {
        event.preventDefault();
        pick(id);
        return;
      }
      if (event.key === "Escape" && picked) {
        event.preventDefault();
        finishKeyboard(true);
        card.focus();
        return;
      }
      if (event.key === "Enter" && picked) {
        event.preventDefault();
        finishKeyboard(false);
        return;
      }
      if (!(event.key in deltas)) return;
      event.preventDefault();
      if (picked === id) {
        move(id, index + deltas[event.key]);
        card.focus();
      } else {
        grid.children[
          Math.max(0, Math.min(order.length - 1, index + deltas[event.key]))
        ]?.focus();
      }
    });
    card.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        (event.pointerType === "touch" && !event.target.closest(".drag-handle"))
      )
        return;
      if (picked) finishKeyboard(false);
      drag = {
        id,
        card,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        active: false,
        target: null,
      };
      card.setPointerCapture(event.pointerId);
    });
    card.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (!drag.active && Math.hypot(dx, dy) < 7) return;
      drag.active = true;
      card.classList.add("is-dragging");
      card.style.transform = `translate(${dx}px,${dy - 8}px) scale(1.035)`;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-tool]");
      grid
        .querySelectorAll(".drop-target")
        .forEach((x) => x.classList.remove("drop-target"));
      drag.target = target?.dataset.tool || null;
      if (target && target !== card) target.classList.add("drop-target");
    });
    const release = (event, cancel = false) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const state = drag;
      drag = null;
      card.classList.remove("is-dragging");
      card.style.removeProperty("transform");
      grid
        .querySelectorAll(".drop-target")
        .forEach((x) => x.classList.remove("drop-target"));
      if (card.hasPointerCapture(event.pointerId))
        card.releasePointerCapture(event.pointerId);
      if (state.active) {
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 0);
        if (!cancel && state.target) {
          move(id, order.indexOf(state.target));
          save();
        }
        card.focus();
      }
    };
    card.addEventListener("pointerup", (event) => release(event));
    card.addEventListener("pointercancel", (event) => release(event, true));
    grid.append(card);
  }
  synchronize();
  document.querySelector("#reset-order").addEventListener("click", () => {
    order = defaults.slice();
    picked = null;
    snapshot = null;
    synchronize();
    save();
    status.textContent = "Default arrangement restored.";
  });
})();
