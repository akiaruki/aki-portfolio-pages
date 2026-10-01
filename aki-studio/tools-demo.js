(() => {
  "use strict";
  const grid = document.querySelector("#tool-grid");
  const status = document.querySelector("#organizer-status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const catalog = [
    ["crop", "Crop"],
    ["develop", "Develop"],
    ["curves", "Curves"],
    ["color", "Color Mixer"],
    ["detail", "Detail"],
    ["mono", "B&W Mixer"],
    ["split", "Split Toning"],
    ["optics", "Optics"],
    ["geometry", "Geometry"],
    ["effects", "Effects"],
    ["frame", "Frame"],
    ["date", "Date"],
  ];
  const defaults = catalog.map((x) => x[0]),
    names = new Map(catalog),
    nodes = new Map();
  const storageKey = "aki-tool-demo-order-v1";
  let order = defaults.slice(),
    active = null,
    pending = null,
    settling = null;
  let frame = 0,
    lastTime = 0,
    suppressUntil = 0;
  const springs = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      Array.isArray(saved) &&
      saved.length === 12 &&
      new Set(saved).size === 12 &&
      saved.every((x) => names.has(x))
    )
      order = saved;
  } catch {}
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(order));
      return true;
    } catch {
      return false;
    }
  };
  const announce = (text) => {
    status.textContent = text;
  };
  const labels = (list = active?.draft || order) => {
    for (const [id, node] of nodes) {
      node.setAttribute(
        "aria-label",
        `${names.get(id)}. Position ${list.indexOf(id) + 1} of 12.`,
      );
      node.setAttribute("aria-pressed", String(active?.id === id));
      node.classList.toggle(
        "is-picked",
        active?.id === id && active.mode !== "drag",
      );
    }
  };
  const synchronize = () => {
    order.forEach((id) => grid.append(nodes.get(id)));
    labels();
  };
  const suppress = () => {
    suppressUntil = performance.now() + 650;
  };
  const clearPending = () => {
    if (pending) clearTimeout(pending.timer);
    pending = null;
  };
  const schedule = () => {
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  // Exact critically damped step. Retargeting preserves velocity; no bouncing,
  // layout reads, or DOM reordering is needed while the gesture is in flight.
  const step = (s, key, velocity, target, dt) => {
    if (reduced.matches) {
      s[key] = target;
      s[velocity] = 0;
      return false;
    }
    const w = 30,
      d = s[key] - target,
      c = s[velocity] + w * d,
      e = Math.exp(-w * dt);
    s[key] = target + (d + c * dt) * e;
    s[velocity] = (s[velocity] - w * c * dt) * e;
    if (Math.abs(s[key] - target) < 0.08 && Math.abs(s[velocity]) < 0.7) {
      s[key] = target;
      s[velocity] = 0;
      return false;
    }
    return true;
  };
  const clearSettling = () => {
    if (settling) {
      settling.ghost.remove();
      nodes.get(settling.id).classList.remove("is-drag-source");
      settling = null;
    }
  };
  const geometry = () => {
    const scroll = grid.scrollTop,
      bounds = grid.getBoundingClientRect();
    const slots = order.map((id) => {
      const r = nodes.get(id).getBoundingClientRect();
      return {
        id,
        left: r.left,
        top: r.top + scroll,
        width: r.width,
        height: r.height,
        cx: r.left + r.width / 2,
        cy: r.top + scroll + r.height / 2,
      };
    });
    return {
      slots,
      bounds,
      maximum: Math.max(0, grid.scrollHeight - grid.clientHeight),
    };
  };
  const resetSprings = () => {
    for (const node of nodes.values()) {
      node.style.transform = "";
      node.style.willChange = "";
    }
    springs.clear();
  };
  const start = (id, mode, point) => {
    clearPending();
    if (active) finish(true, true);
    clearSettling();
    resetSprings();
    const g = geometry(),
      index = order.indexOf(id),
      slot = g.slots[index];
    active = {
      id,
      mode,
      original: order.slice(),
      draft: order.slice(),
      index,
      ...g,
      point,
      previousPoint: point,
      velocity: { x: 0, y: 0 },
      pointTime: performance.now(),
    };
    for (const node of nodes.values()) {
      springs.set(node, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
      node.style.willChange = "transform";
    }
    if (mode === "drag") {
      const ghost = nodes.get(id).cloneNode(true);
      ghost.removeAttribute("data-tool");
      ghost.removeAttribute("aria-pressed");
      ghost.removeAttribute("aria-label");
      ghost.className = "tool-card tool-drag-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      ghost.style.width = slot.width + "px";
      ghost.style.height = slot.height + "px";
      active.offset = {
        x: point.x - slot.left,
        y: point.y - (slot.top - grid.scrollTop),
      };
      active.ghost = ghost;
      active.gx = slot.left;
      active.gy = slot.top - grid.scrollTop;
      ghost.style.transform = `translate3d(${active.gx}px,${active.gy}px,0)`;
      document.body.append(ghost);
      nodes.get(id).classList.add("is-drag-source");
      grid.dataset.arranging = "drag";
      suppress();
      announce(
        `${names.get(id)} picked up. Move it to a new position, then release.`,
      );
    } else {
      grid.dataset.arranging = mode;
      announce(
        mode === "tap"
          ? `${names.get(id)} selected. Tap another tool to place it there.`
          : `${names.get(id)} selected. Arrow keys move; Enter places; Escape cancels.`,
      );
    }
    labels();
    schedule();
  };
  const choose = (index, requestFrame = true) => {
    const a = active;
    if (!a) return;
    index = Math.max(0, Math.min(11, index));
    if (index === a.index) return;
    a.index = index;
    a.draft = a.original.filter((x) => x !== a.id);
    a.draft.splice(index, 0, a.id);
    a.draft.forEach((id, i) => {
      const from = a.slots.find((s) => s.id === id),
        to = a.slots[i],
        s = springs.get(nodes.get(id));
      s.tx = to.left - from.left;
      s.ty = to.top - from.top;
    });
    labels();
    announce(`${names.get(a.id)}. Position ${index + 1} of 12.`);
    if (requestFrame) schedule();
  };
  const place = (dt) => {
    const a = active;
    if (!a || a.mode !== "drag") return false;
    const before = grid.scrollTop,
      edge = Math.min(44, a.bounds.height / 4),
      p = a.point;
    let speed = 0;
    if (p.x >= a.bounds.left - 36 && p.x <= a.bounds.right + 36) {
      if (p.y < a.bounds.top + edge)
        speed = -310 * Math.min(1, (a.bounds.top + edge - p.y) / edge);
      else if (p.y > a.bounds.bottom - edge)
        speed = 310 * Math.min(1, (p.y - a.bounds.bottom + edge) / edge);
    }
    const next = Math.max(0, Math.min(a.maximum, before + speed * dt));
    const source = a.slots.find((s) => s.id === a.id),
      cx = p.x - a.offset.x + source.width / 2,
      cy = p.y - a.offset.y + source.height / 2 + next;
    const distance = (s) => Math.hypot(cx - s.cx, cy - s.cy);
    let index = a.index;
    for (let i = 0; i < 12; i++)
      if (distance(a.slots[i]) + 7 < distance(a.slots[index])) index = i;
    choose(index, false);
    a.gx = p.x - a.offset.x;
    a.gy = p.y - a.offset.y;
    a.ghost.style.transform = `translate3d(${a.gx}px,${a.gy}px,0)`;
    if (next !== before) grid.scrollTop = next;
    return next !== before;
  };
  function tick(time) {
    frame = 0;
    const dt = Math.min(0.035, Math.max(0.001, (time - lastTime) / 1000));
    lastTime = time;
    let moving = place(dt);
    for (const [node, s] of springs) {
      const x = step(s, "x", "vx", s.tx, dt),
        y = step(s, "y", "vy", s.ty, dt);
      moving = x || y || moving;
      if (!(active?.mode === "drag" && node.dataset.tool === active.id))
        node.style.transform = `translate3d(${s.x}px,${s.y}px,0)`;
    }
    if (settling) {
      const s = settling,
        x = step(s, "x", "vx", s.tx, dt),
        y = step(s, "y", "vy", s.ty, dt);
      s.ghost.style.transform = `translate3d(${s.x}px,${s.y}px,0)`;
      if (!x && !y) clearSettling();
      else moving = true;
    }
    if (moving && !document.hidden) frame = requestAnimationFrame(tick);
    else if (!active && !settling) resetSprings();
  }
  function finish(commit, immediate = false) {
    clearPending();
    const a = active;
    if (!a) return;
    if (a.mode === "drag") place(0);
    active = null;
    delete grid.dataset.arranging;
    order = (commit ? a.draft : a.original).slice();
    // Cache the visual offsets before the single DOM commit, then compensate
    // those offsets against the new slots. Neighbors continue without a snap.
    for (const [node, s] of springs) {
      const from = a.slots.find((v) => v.id === node.dataset.tool),
        to = a.slots[order.indexOf(node.dataset.tool)];
      s.x -= to.left - from.left;
      s.y -= to.top - from.top;
      s.tx = 0;
      s.ty = 0;
    }
    synchronize();
    if (a.ghost) {
      const to = a.slots[order.indexOf(a.id)];
      const velocity =
        performance.now() - a.pointTime < 80 ? a.velocity : { x: 0, y: 0 };
      settling = {
        id: a.id,
        ghost: a.ghost,
        x: a.gx,
        y: a.gy,
        vx: velocity.x,
        vy: velocity.y,
        tx: to.left,
        ty: to.top - grid.scrollTop,
      };
      if (immediate || reduced.matches) clearSettling();
    }
    if (commit) {
      const saved = save();
      announce(
        `${names.get(a.id)} placed at position ${order.indexOf(a.id) + 1}. ${saved ? "Arrangement saved in this browser." : "Arrangement updated for this visit."}`,
      );
    } else announce("Arrangement restored.");
    if (immediate) {
      resetSprings();
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
    nodes.get(a.id).focus({ preventScroll: true });
  }
  const begin = (id, point, kind, identifier) => {
    if (active?.mode === "drag") finish(false, true);
    clearPending();
    const state = { id, point, kind, identifier };
    state.timer = setTimeout(() => {
      if (pending !== state) return;
      start(id, "drag", point);
      active.kind = kind;
      active.identifier = identifier;
    }, 420);
    pending = state;
  };
  const update = (point) => {
    if (
      pending &&
      Math.hypot(point.x - pending.point.x, point.y - pending.point.y) > 8
    ) {
      clearPending();
      suppress();
      return;
    }
    const a = active;
    if (!a || a.mode !== "drag") return;
    const now = performance.now(),
      dt = Math.max(8, now - a.pointTime) / 1000;
    a.velocity = {
      x: Math.max(-1600, Math.min(1600, (point.x - a.point.x) / dt)),
      y: Math.max(-1600, Math.min(1600, (point.y - a.point.y) / dt)),
    };
    a.point = point;
    a.pointTime = now;
    schedule();
  };
  const end = (cancel) => {
    clearPending();
    if (active?.mode === "drag") {
      suppress();
      finish(!cancel);
    }
  };
  for (const [id, name] of catalog) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "tool-card";
    node.dataset.tool = id;
    const icon = document.createElement("img");
    icon.src = `assets/tool-icons/${id}.png`;
    icon.alt = "";
    icon.width = 104;
    icon.height = 104;
    icon.draggable = false;
    const label = document.createElement("span");
    label.className = "tool-name";
    label.textContent = name;
    node.append(icon, label);
    nodes.set(id, node);
    grid.append(node);
    node.addEventListener("click", (event) => {
      if (performance.now() < suppressUntil) {
        event.preventDefault();
        return;
      }
      if (active && active.mode !== "drag") {
        if (active.id !== id) choose((active.draft || order).indexOf(id));
        finish(true);
      } else start(id, "tap");
    });
    node.addEventListener("keydown", (event) => {
      const deltas = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -4,
        ArrowDown: 4,
      };
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (event.repeat) return;
        if (active?.id === id) finish(true);
        else start(id, "keyboard");
        return;
      }
      if (event.key === "Escape" && active) {
        event.preventDefault();
        finish(false);
        return;
      }
      if (!(event.key in deltas)) return;
      event.preventDefault();
      if (active?.id === id) {
        choose(active.index + deltas[event.key]);
      } else
        nodes
          .get(
            order[
              Math.max(0, Math.min(11, order.indexOf(id) + deltas[event.key]))
            ],
          )
          .focus({ preventScroll: true });
    });
  }
  synchronize();
  grid.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary)
      return;
    const node = event.target.closest("[data-tool]");
    if (node)
      begin(
        node.dataset.tool,
        { x: event.clientX, y: event.clientY },
        "pointer",
        event.pointerId,
      );
  });
  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      if (
        (pending?.kind === "pointer" &&
          pending.identifier === event.pointerId) ||
        (active?.kind === "pointer" && active.identifier === event.pointerId)
      )
        update({ x: event.clientX, y: event.clientY });
    },
    { passive: true },
  );
  window.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch") end(false);
  });
  window.addEventListener("pointercancel", (event) => {
    if (event.pointerType !== "touch") end(true);
  });
  // A non-passive gate is installed before contact, and cancels only moves
  // following a stationary pickup. Changing touch-action after hold cannot
  // claim the current gesture. Ordinary swipes retain the browser's scrolling.
  grid.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        end(true);
        return;
      }
      const node = event.target.closest("[data-tool]"),
        touch = event.changedTouches[0];
      if (node)
        begin(
          node.dataset.tool,
          { x: touch.clientX, y: touch.clientY },
          "touch",
          touch.identifier,
        );
    },
    { passive: true },
  );
  grid.addEventListener(
    "touchmove",
    (event) => {
      const identifier =
        active?.kind === "touch"
          ? active.identifier
          : pending?.kind === "touch"
            ? pending.identifier
            : null;
      const touch = [...event.changedTouches].find(
        (t) => t.identifier === identifier,
      );
      if (!touch) return;
      if (event.touches.length !== 1) {
        end(true);
        return;
      }
      if (active?.mode === "drag" && event.cancelable) event.preventDefault();
      update({ x: touch.clientX, y: touch.clientY });
    },
    { passive: false },
  );
  grid.addEventListener("touchend", () => end(false), { passive: true });
  grid.addEventListener("touchcancel", () => end(true), { passive: true });
  window.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) end(true);
    },
    { passive: true },
  );
  grid.addEventListener("contextmenu", (event) => event.preventDefault());
  grid.addEventListener("dragstart", (event) => event.preventDefault());
  const cancel = () => {
    clearPending();
    if (active) finish(false, true);
    clearSettling();
  };
  window.addEventListener("blur", cancel);
  window.addEventListener("resize", cancel, { passive: true });
  window.addEventListener("pagehide", cancel);
  window.addEventListener(
    "wheel",
    () => {
      if (active?.mode === "drag") cancel();
    },
    { passive: true },
  );
  window.addEventListener(
    "scroll",
    (event) => {
      if (event.target !== grid) {
        clearPending();
        if (active?.mode === "drag") cancel();
      }
    },
    { capture: true, passive: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active) {
      event.preventDefault();
      suppress();
      finish(false);
    }
  });
  reduced.addEventListener("change", cancel);
  document.querySelector("#reset-order").addEventListener("click", () => {
    cancel();
    resetSprings();
    order = defaults.slice();
    synchronize();
    save();
    announce("Default arrangement restored.");
  });
})();
