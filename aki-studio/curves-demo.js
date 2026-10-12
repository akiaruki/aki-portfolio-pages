(() => {
  "use strict";
  // Source-backed Curves math: shape-preserving cubic Hermite, followed by
  // the native web editor's parametric-region > master > channel composition.
  const keys = ["rgb", "red", "green", "blue"];
  const identity = () => Object.fromEntries(keys.map(key => [key, [[0, 0], [255, 255]]]));
  const clamp = (n, low = 0, high = 255) => Math.max(low, Math.min(high, n));
  function curveLut(points) {
    const n = points.length, h = [], d = [], m = new Float64Array(n);
    for (let i = 0; i < n - 1; i++) { h[i] = points[i + 1][0] - points[i][0]; d[i] = (points[i + 1][1] - points[i][1]) / h[i]; }
    if (n === 2) m[0] = m[1] = d[0];
    else {
      const edge = (h0, h1, d0, d1) => {
        let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
        if (Math.sign(v) !== Math.sign(d0)) v = 0;
        else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(v) > Math.abs(3 * d0)) v = 3 * d0;
        return v;
      };
      m[0] = edge(h[0], h[1], d[0], d[1]); m[n - 1] = edge(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
      for (let i = 1; i < n - 1; i++) if (d[i - 1] * d[i] > 0) {
        const a = 2 * h[i] + h[i - 1], b = h[i] + 2 * h[i - 1]; m[i] = (a + b) / (a / d[i - 1] + b / d[i]);
      }
    }
    const lut = new Float32Array(256); let j = 0;
    for (let x = 0; x < 256; x++) {
      if (x <= points[0][0]) { lut[x] = points[0][1]; continue; }
      if (x >= points[n - 1][0]) { lut[x] = points[n - 1][1]; continue; }
      while (j < n - 2 && x > points[j + 1][0]) j++;
      const t = (x - points[j][0]) / h[j], t2 = t * t, t3 = t2 * t;
      lut[x] = clamp((2 * t3 - 3 * t2 + 1) * points[j][1] + (t3 - 2 * t2 + t) * h[j] * m[j] + (-2 * t3 + 3 * t2) * points[j + 1][1] + (t3 - t2) * h[j] * m[j + 1]);
    }
    return lut;
  }
  function parametricLut(s) {
    const boundaries = [0, s.curveSplit1 ?? 25, s.curveSplit2 ?? 50, s.curveSplit3 ?? 75, 100];
    const amounts = [s.curveShadows || 0, s.curveDarks || 0, s.curveLights || 0, s.curveHighlights || 0], lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 255; let delta = 0;
      for (let j = 0; j < 4; j++) {
        const center = (boundaries[j] + boundaries[j + 1]) / 200, span = Math.max(.08, (boundaries[j + 1] - boundaries[j]) / 100);
        delta += amounts[j] / 100 * Math.exp(-.5 * ((x - center) / span) ** 2) * .28 * Math.sin(Math.PI * x);
      }
      lut[i] = clamp((x + delta) * 255);
    }
    return lut;
  }
  function sampleLut(lut, x) {
    const lo = clamp(Math.floor(x)), hi = Math.min(255, lo + 1); return lut[lo] + (lut[hi] - lut[lo]) * (x - lo);
  }
  function combinedLuts(s) {
    const master = curveLut(s.curves.rgb), region = parametricLut(s);
    return keys.slice(1).map(key => {
      const channel = curveLut(s.curves[key]), out = new Float32Array(256);
      for (let i = 0; i < 256; i++) out[i] = sampleLut(channel, sampleLut(master, region[i])); return out;
    });
  }
  function applyPixels(original, output, tables) {
    for (let p = 0; p < original.length; p += 4) {
      output[p] = tables[0][original[p]]; output[p + 1] = tables[1][original[p + 1]]; output[p + 2] = tables[2][original[p + 2]]; output[p + 3] = original[p + 3];
    }
  }
  // UI enhancement starts only after same-origin photo pixels are available.
  const root = document.querySelector(".curves-demo");
  if (!root) return;
  const photo = root.querySelector("img"), canvas = root.querySelector("canvas"), controls = root.querySelector(".curves-controls");
  const graph = root.querySelector(".curves-graph"), line = root.querySelector(".curves-line"), histogram = root.querySelector(".curves-histogram"), pointLayer = root.querySelector(".curves-points");
  const choose = root.querySelector("#curves-point"), input = root.querySelector("#curves-in"), output = root.querySelector("#curves-out");
  const remove = root.querySelector(".curves-remove"), add = root.querySelector(".curves-add"), resetChannel = root.querySelector(".curves-reset-channel");
  const channelButtons = [...root.querySelectorAll("[data-channel]")], regionInputs = [...root.querySelectorAll("[data-region]")];
  const state = { curves: identity(), curveSplit1: 25, curveSplit2: 50, curveSplit3: 75 };
  state.curves.rgb[0][1] = 18;
  const names = { rgb: "RGB", red: "Red", green: "Green", blue: "Blue", tone: "Tone" };
  let channel = "rgb", selected = 0, gesture = null, pending = 0, original, result, context;
  const points = () => state.curves[channel === "tone" ? "rgb" : channel];
  function bounded(index, x, y) {
    const list = points();
    return [clamp(Math.round(x), index === 0 ? 0 : list[index - 1][0] + 1, index === list.length - 1 ? 255 : list[index + 1][0] - 1), clamp(Math.round(y))];
  }
  function status() {
    const unchanged = keys.every(key => state.curves[key].length === 2 && state.curves[key].every(([x, y], i) => x === i * 255 && y === x)) && !["curveHighlights", "curveLights", "curveDarks", "curveShadows"].some(key => state[key]);
    root.querySelector("#curves-status").textContent = unchanged ? "Original photograph." : channel === "rgb" && state.curves.rgb[0][0] === 0 && state.curves.rgb[0][1] > 0 ? "RGB shadows gently lifted." : `${names[channel]} curve adjusted.`;
    canvas.setAttribute("aria-label", unchanged ? "Original yellow flower photograph" : "Yellow flower photograph with the displayed curve adjustments");
  }
  function draw() {
    const list = points(), tone = channel === "tone"; selected = Math.min(selected, list.length - 1);
    root.dataset.channel = channel;
    channelButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.channel === channel)));
    root.querySelector(".curves-values").hidden = tone; root.querySelector(".curves-regions").hidden = !tone; resetChannel.hidden = tone; pointLayer.hidden = tone;
    resetChannel.setAttribute("aria-label", `Reset ${names[channel]} curve`);
    const lut = tone ? parametricLut(state) : curveLut(list);
    line.setAttribute("d", Array.from(lut, (y, x) => `${x ? "L" : "M"}${x * 256 / 255},${(255 - y) * 128 / 255}`).join(""));
    const focused = document.activeElement, focusedIndex = focused?.dataset?.point;
    while (pointLayer.children.length > list.length) pointLayer.lastChild.remove();
    list.forEach(([x, y], i) => {
      let button = pointLayer.children[i];
      if (!button) { button = document.createElement("button"); button.type = "button"; button.className = "curves-point"; button.dataset.point = String(i); pointLayer.append(button); }
      button.style.left = `${x / 255 * 100}%`; button.style.top = `${(255 - y) / 255 * 100}%`;
      button.setAttribute("aria-label", `${names[channel]} point ${i + 1}, input ${x}, output ${y}. Arrow keys adjust; Shift adjusts by ten.`);
      button.setAttribute("aria-pressed", String(i === selected));
    });
    if (focusedIndex !== undefined && !tone && focused?.isConnected === false) pointLayer.children[selected]?.focus({ preventScroll: true });
    while (choose.children.length > list.length) choose.lastChild.remove();
    list.forEach((_, i) => { const option = choose.children[i] || document.createElement("option"); option.value = i; option.textContent = i + 1; if (!option.parentNode) choose.append(option); });
    choose.value = selected; input.value = list[selected][0]; output.value = list[selected][1];
    add.disabled = list.length >= 12 || !list.some((p, i) => i < list.length - 1 && list[i + 1][0] - p[0] >= 2); remove.disabled = selected === 0 || selected === list.length - 1;
    regionInputs.forEach(slider => { slider.value = state[slider.dataset.region] || 0; slider.previousElementSibling.value = slider.value; });
  }
  function render() {
    pending = 0;
    const tables = combinedLuts(state); applyPixels(original, result.data, tables); context.putImageData(result, 0, 0);
    const bins = new Float64Array(256), channelIndex = keys.indexOf(channel) - 1;
    for (let p = 0; p < result.data.length; p += 4) {
      const alpha = result.data[p + 3] / 255; if (!alpha) continue;
      if (channelIndex >= 0) bins[result.data[p + channelIndex]] += alpha;
      else for (let c = 0; c < 3; c++) bins[result.data[p + c]] += alpha / 3;
    }
    const max = Math.max(1, ...bins);
    histogram.setAttribute("d", "M0,128" + Array.from(bins, (count, x) => `L${x * 256 / 255},${128 - Math.sqrt(count / max) * 119}`).join("") + "L256,128Z");
  }
  function schedule() { if (!pending) pending = requestAnimationFrame(render); }
  function changePoint(index, x, y) { selected = index; points()[index] = bounded(index, x, y); draw(); schedule(); }
  function finish() { gesture = null; status(); }
  function location(event, rect) { return [(event.clientX - rect.left) * 255 / rect.width, 255 - (event.clientY - rect.top) * 255 / rect.height]; }
  function insertPoint(x, y) {
    const list = points(); x = clamp(Math.round(x), 1, 254);
    if (list.length >= 12 || list.some(point => Math.abs(point[0] - x) < 1)) return;
    let index = list.findIndex(point => point[0] > x); if (index < 0) index = list.length;
    list.splice(index, 0, [x, clamp(Math.round(y))]); selected = index; draw(); schedule(); status();
  }
  function attach() {
    channelButtons.forEach(button => button.addEventListener("click", () => { finish(); channel = button.dataset.channel; selected = 0; draw(); schedule(); }));
    choose.addEventListener("change", () => { finish(); selected = Number(choose.value); draw(); });
    resetChannel.addEventListener("click", () => { finish(); state.curves[channel] = [[0, 0], [255, 255]]; selected = 0; draw(); schedule(); status(); });
    root.querySelector(".curves-reset-all").addEventListener("click", () => {
      finish(); state.curves = identity(); ["curveHighlights", "curveLights", "curveDarks", "curveShadows"].forEach(key => state[key] = 0);
      [state.curveSplit1, state.curveSplit2, state.curveSplit3] = [25, 50, 75]; selected = 0; draw(); schedule(); status();
    });
    root.querySelector(".curves-soft-fade").addEventListener("click", () => {
      finish(); state.curves = identity(); state.curves.rgb[0][1] = 18;
      ["curveHighlights", "curveLights", "curveDarks", "curveShadows"].forEach(key => state[key] = 0);
      [state.curveSplit1, state.curveSplit2, state.curveSplit3] = [25, 50, 75]; channel = "rgb"; selected = 0; draw(); schedule(); status();
    });
    add.addEventListener("click", () => {
      finish(); const list = points(); if (list.length >= 12) return; let i = 0;
      for (let j = 1; j < list.length - 1; j++) if (list[j + 1][0] - list[j][0] > list[i + 1][0] - list[i][0]) i = j;
      const x = Math.round((list[i][0] + list[i + 1][0]) / 2); if (x > list[i][0] && x < list[i + 1][0]) insertPoint(x, curveLut(list)[x]);
    });
    remove.addEventListener("click", () => { finish(); if (selected === 0 || selected === points().length - 1) return; points().splice(selected, 1); selected--; draw(); schedule(); status(); });
    pointLayer.addEventListener("focusin", event => { const button = event.target.closest("[data-point]"); if (button) { selected = Number(button.dataset.point); draw(); } });
    pointLayer.addEventListener("keydown", event => {
      const button = event.target.closest("[data-point]"), delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowDown: [0, -1], ArrowUp: [0, 1] }[event.key];
      if (!button || !delta || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault(); const i = Number(button.dataset.point), p = points()[i], step = event.shiftKey ? 10 : 1;
      changePoint(i, p[0] + delta[0] * step, p[1] + delta[1] * step);
    });
    pointLayer.addEventListener("keyup", status);
    graph.addEventListener("pointerdown", event => {
      if (channel === "tone" || event.button !== 0 || event.isPrimary === false || gesture) return;
      const rect = graph.getBoundingClientRect(), button = event.target.closest("[data-point]"), i = button ? Number(button.dataset.point) : -1;
      const [x, y] = location(event, rect); gesture = { id: event.pointerId, i, rect, x, y, sx: event.clientX, sy: event.clientY, origin: i >= 0 ? [...points()[i]] : null, moved: false };
      if (button) { event.preventDefault(); selected = i; button.focus({ preventScroll: true }); draw(); }
      try { graph.setPointerCapture(event.pointerId); } catch (_) { finish(); }
    });
    graph.addEventListener("pointermove", event => {
      const g = gesture; if (!g || g.id !== event.pointerId) return;
      if (!g.moved && Math.hypot(event.clientX - g.sx, event.clientY - g.sy) < 6) return;
      g.moved = true; if (g.i < 0) { finish(); return; }
      event.preventDefault(); const [x, y] = location(event, g.rect); changePoint(g.i, g.origin[0] + x - g.x, g.origin[1] + y - g.y);
    });
    function end(event) {
      const g = gesture; if (!g || g.id !== event.pointerId) return;
      if (event.type === "pointerup" && g.i < 0 && !g.moved && Math.hypot(event.clientX - g.sx, event.clientY - g.sy) < 6) insertPoint(g.x, g.y);
      finish(); try { if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(name => graph.addEventListener(name, end));
    ["blur", "resize", "pagehide"].forEach(name => window.addEventListener(name, finish));
    document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });
    regionInputs.forEach(slider => {
      slider.addEventListener("input", () => {
        const key = slider.dataset.region; let value = Number(slider.value);
        if (key === "curveSplit1") value = Math.min(value, state.curveSplit2 - 5, 90);
        if (key === "curveSplit2") value = Math.max(state.curveSplit1 + 5, Math.min(state.curveSplit3 - 5, value));
        if (key === "curveSplit3") value = Math.max(state.curveSplit2 + 5, value, 15);
        state[key] = value; draw(); schedule();
      }); slider.addEventListener("change", status);
    });
  }
  function unavailable(message) { root.querySelector(".curves-note").textContent = message; }
  function initialize() {
    if (!photo.naturalWidth || original) return;
    try {
      canvas.width = photo.naturalWidth; canvas.height = photo.naturalHeight;
      context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Canvas unavailable");
      context.drawImage(photo, 0, 0); result = context.getImageData(0, 0, canvas.width, canvas.height); original = new Uint8ClampedArray(result.data);
      draw(); render(); attach(); canvas.hidden = false; photo.hidden = true; controls.hidden = false;
    } catch (_) { original = null; unavailable("Flower photograph · Interactive Curves preview unavailable in this browser."); }
  }
  photo.addEventListener("load", initialize, { once: true });
  photo.addEventListener("error", () => unavailable("The preview photograph could not load. Please reload to try again."), { once: true });
  if (photo.complete) initialize();
})();
