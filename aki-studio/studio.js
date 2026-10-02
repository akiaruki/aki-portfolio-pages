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
    alternateTried = false,
    displayProgress = null,
    progressVelocity = 0,
    lastTick = 0,
    presentedFrame = 0;
  story.dataset.renderer = "static";
  const preference = () =>
    motion.matches
      ? "reduced-motion"
      : connection?.saveData
        ? "data-saving"
        : "";
  const suspendProgress = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    displayProgress = null;
    progressVelocity = 0;
    lastTick = 0;
  };
  const fallback = (reason) => {
    enabled = false;
    suspendProgress();
    video.pause();
    if (presentedFrame && video.cancelVideoFrameCallback)
      video.cancelVideoFrameCallback(presentedFrame);
    presentedFrame = 0;
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
    p < 0.13 ? 0 : p < 0.325 ? 1 : p < 0.53 ? 2 : p < 0.735 ? 3 : 4;
  const presentChapter = (time) => {
    const phase = phaseAt(time / Math.max(1 / 60, video.duration - 1 / 60));
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
      poster.src = `assets/story-v4-${phase}.webp`;
    }
    story.dataset.chapter = String(phase);
  };
  const observePresentation = () => {
    if (!presentedFrame && video.requestVideoFrameCallback) {
      presentedFrame = video.requestVideoFrameCallback((_, metadata) => {
        presentedFrame = 0;
        if (!enabled) return;
        story.dataset.presentedTime = metadata.mediaTime.toFixed(4);
        presentChapter(metadata.mediaTime);
      });
    }
  };
  const draw = (now) => {
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
    const targetProgress = Math.max(
      0,
      Math.min(
        1,
        (latestY - metrics.top) /
          Math.max(1, metrics.height - metrics.viewport),
      ),
    );
    // One reversible, critically damped progress signal drives the entire
    // presentation. Native page scrolling is never intercepted. Velocity is
    // retained when the visitor changes direction; work stops at rest.
    if (displayProgress === null) {
      displayProgress = targetProgress;
      lastTick = now;
    }
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTick) / 1000));
    lastTick = now;
    // A shorter response follows native scrolling more closely while retaining
    // a continuous, reversible signal. Decoder work remains one seek at a time.
    const w = 48,
      delta = displayProgress - targetProgress;
    const c = progressVelocity + w * delta,
      decay = Math.exp(-w * dt);
    displayProgress = targetProgress + (delta + c * dt) * decay;
    progressVelocity = (progressVelocity - w * c * dt) * decay;
    const settled =
      Math.abs(displayProgress - targetProgress) < 0.00007 &&
      Math.abs(progressVelocity) < 0.0006;
    if (settled) {
      displayProgress = targetProgress;
      progressVelocity = 0;
    }
    const progress = Math.max(0, Math.min(1, displayProgress));
    story.dataset.progress = progress.toFixed(3);
    story.dataset.targetProgress = targetProgress.toFixed(3);
    targetTime = Math.min(
      video.duration - 1 / 60,
      (Math.round(progress * (video.duration * 60 - 1)) + 0.25) / 60,
    );
    if (
      !video.seeking &&
      video.readyState >= 2 &&
      Math.abs(video.currentTime - targetTime) > 0.009
    ) {
      observePresentation();
      video.currentTime = targetTime;
    }
    if (!settled) frame = requestAnimationFrame(draw);
  };
  const schedule = () => {
    if (enabled && visible && !document.hidden && !frame)
      frame = requestAnimationFrame(draw);
  };
  video.addEventListener("seeked", () => {
    if (!video.requestVideoFrameCallback && enabled)
      presentChapter(video.currentTime);
    schedule();
  });
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
    presentChapter(video.currentTime);
    suspendProgress();
    latestY = scrollY;
    observePresentation();
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
    video.src = `assets/aki-story-v4-${matchMedia("(max-width:900px)").matches ? "mobile" : "desktop"}.${format}`;
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
        if (visible) {
          latestY = scrollY;
          schedule();
        } else suspendProgress();
      },
      { threshold: 0 },
    ).observe(viewport);
  document.addEventListener("visibilitychange", () => {
    suspendProgress();
    if (!document.hidden) {
      latestY = scrollY;
      dirty = true;
      schedule();
    }
  });
  motion.addEventListener("change", () => {
    if (preference()) fallback(preference());
    else if (!enabled) start();
  });
  connection?.addEventListener("change", () => {
    if (preference()) fallback(preference());
    else if (!enabled) start();
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
