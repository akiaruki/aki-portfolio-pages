(() => {
  "use strict";
  // Native akiSelective / selectiveReference equations. Canvas pixels are
  // encoded sRGB; the app's selective stage works in linear Display-P3/OKLab.
  const STOPS = [29, 53, 110, 145, 195, 264, 300, 330, 389];
  const SRGB_XYZ = [506752/1228815,87881/245763,12673/70218,87098/409605,175762/245763,12673/175545,7918/409605,87881/737289,1001167/1053270];
  const XYZ_SRGB = [12831/3959,-329/214,-1974/3959,-851781/878810,1648619/878810,36519/878810,705/12673,-2585/12673,705/667];
  const P3_XYZ = [608311/1250200,189793/714400,198249/1000160,35783/156275,247089/357200,198249/2500400,0,32229/714400,5220557/5000800];
  const XYZ_P3 = [446124/178915,-333277/357830,-72051/178915,-14852/17905,63121/35810,423/17905,11844/330415,-50337/660830,316169/330415];
  const XYZ_LMS = [.819022438,.361906260,-.128873782,.032983654,.929286862,.036144666,.048177189,.264239532,.633547828];
  const LMS_LAB = [.210454268,.793617775,-.004072043,1.977998532,-2.428592242,.450593710,.025904042,.782771712,-.808675755];
  const LAB_LMS = [1,.396337777,.215803757,1,-.105561346,-.063854173,1,-.089484178,-1.291485548];
  const LMS_XYZ = [1.226879876,-.557814994,.281391046,-.040575745,1.112286803,-.071711058,-.076372937,-.421493332,1.586924020];
  function multiplyMatrices(a, b) {
    const out = new Float64Array(9);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) for (let k = 0; k < 3; k++) out[row * 3 + col] += a[row * 3 + k] * b[k * 3 + col];
    return out;
  }
  // Compose the fixed native color-space steps once, retaining their exact
  // coefficients while avoiding redundant matrix operations for every pixel.
  const SRGB_LMS = multiplyMatrices(XYZ_LMS, multiplyMatrices(P3_XYZ, multiplyMatrices(XYZ_P3, SRGB_XYZ)));
  const LMS_SRGB = multiplyMatrices(XYZ_SRGB, multiplyMatrices(P3_XYZ, multiplyMatrices(XYZ_P3, LMS_XYZ)));
  const dot = (matrix, row, x, y, z) => matrix[row] * x + matrix[row + 1] * y + matrix[row + 2] * z;
  const clamp = n => Math.max(0, Math.min(1, n));
  const decode = n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  const encode = n => n <= .0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - .055;
  // A 65,536-segment transfer table avoids three expensive powers per pixel.
  // Linear interpolation differs by less than .001 of an 8-bit code value;
  // quantization can differ by at most one byte from the direct formula.
  const TRANSFER_SIZE = 65536, transfer = new Float64Array(TRANSFER_SIZE + 1);
  for (let i = 0; i <= TRANSFER_SIZE; i++) transfer[i] = encode(i / TRANSFER_SIZE) * 255;
  function encodeByte(value) {
    if (value <= 0) return 0; if (value >= 1) return 255;
    const position = value * TRANSFER_SIZE, index = position | 0;
    return transfer[index] + (transfer[index + 1] - transfer[index]) * (position - index);
  }
  function smooth(lo, hi, value) { const t = clamp((value - lo) / (hi - lo)); return t * t * (3 - 2 * t); }
  function preparePixels(original) {
    const count = original.length / 4;
    const cache = { light: new Float64Array(count), chroma: new Float64Array(count), hue: new Float64Array(count), a: new Float64Array(count), b: new Float64Array(count), band: new Uint8Array(count), blend: new Float64Array(count), weight: new Float64Array(count) };
    for (let p = 0, k = 0; p < original.length; p += 4, k++) {
      const r = decode(original[p] / 255), g = decode(original[p + 1] / 255), b = decode(original[p + 2] / 255);
      const l = Math.cbrt(dot(SRGB_LMS, 0, r, g, b)), m = Math.cbrt(dot(SRGB_LMS, 3, r, g, b)), s = Math.cbrt(dot(SRGB_LMS, 6, r, g, b));
      const light = dot(LMS_LAB, 0, l, m, s), a = dot(LMS_LAB, 3, l, m, s), labB = dot(LMS_LAB, 6, l, m, s), chroma = Math.hypot(a, labB);
      let hue = chroma < 1e-8 ? 29 : Math.atan2(labB, a) * 180 / Math.PI; if (hue < 29) hue += 360;
      let band = 0; while (band < 7 && hue >= STOPS[band + 1]) band++;
      cache.light[k] = light; cache.chroma[k] = chroma; cache.hue[k] = hue; cache.a[k] = a; cache.b[k] = labB; cache.band[k] = band;
      cache.blend[k] = smooth(STOPS[band], STOPS[band + 1], hue); cache.weight[k] = smooth(.00001, .04, chroma);
    }
    return cache;
  }
  function renderPixels(original, output, cache, values) {
    let changed = false;
    for (let c = 0; c < 8; c++) if (values[c][0] || values[c][1] || values[c][2]) { changed = true; break; }
    if (!changed) { output.set(original); return; }
    // All pixel work uses cached scalars and existing buffers; no per-pixel
    // arrays, objects, or image readbacks are allocated during interaction.
    for (let p = 0, k = 0; p < original.length; p += 4, k++) {
      const band = cache.band[k], next = (band + 1) % 8, t = cache.blend[k], w = cache.weight[k];
      const hueChange = (values[band][0] * (1 - t) + values[next][0] * t) / 100;
      const satChange = (values[band][1] * (1 - t) + values[next][1] * t) / 100;
      const lumChange = (values[band][2] * (1 - t) + values[next][2] * t) / 100;
      output[p + 3] = original[p + 3];
      if (!original[p + 3] || !w || (!hueChange && !satChange && !lumChange)) {
        output[p] = original[p]; output[p + 1] = original[p + 1]; output[p + 2] = original[p + 2]; continue;
      }
      const angle = (cache.hue[k] + hueChange * 30 * w) * Math.PI / 180;
      const gain = Math.max(0, 1 + satChange * w), chroma = cache.chroma[k] * gain, baseLight = cache.light[k];
      const light = baseLight + lumChange * .2 * w * Math.max(0, 4 * baseLight * (1 - baseLight));
      const a = hueChange ? Math.cos(angle) * chroma : cache.a[k] * gain, b = hueChange ? Math.sin(angle) * chroma : cache.b[k] * gain;
      const lb = dot(LAB_LMS, 0, light, a, b), mb = dot(LAB_LMS, 3, light, a, b), sb = dot(LAB_LMS, 6, light, a, b);
      const l = lb * lb * lb, m = mb * mb * mb, s = sb * sb * sb;
      output[p] = encodeByte(dot(LMS_SRGB, 0, l, m, s));
      output[p + 1] = encodeByte(dot(LMS_SRGB, 3, l, m, s));
      output[p + 2] = encodeByte(dot(LMS_SRGB, 6, l, m, s));
    }
  }
  // UI enhancement: native equations, with browser sRGB output and controls.
  const root = document.querySelector(".color-mixer-demo"); if (!root) return;
  const photo = root.querySelector("img"), canvas = root.querySelector("canvas"), controls = root.querySelector(".mixer-controls");
  const buttons = [...root.querySelectorAll("[data-channel]")], sliders = [...root.querySelectorAll("input[type=range]")];
  const names = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"], values = names.map(() => [0, 0, 0]);
  const resetAll = root.querySelector(".mixer-reset"), resetChannel = root.querySelector(".mixer-reset-channel");
  let selected = 2, pending = 0, original, cache, result, context;
  const signed = n => n > 0 ? `+${n}` : String(n);
  function sync() {
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === selected)));
    root.querySelector("#mixer-channel").textContent = names[selected];
    sliders.forEach((input, i) => {
      input.value = values[selected][i]; input.previousElementSibling.value = signed(values[selected][i]);
      const axis = ["Hue", "Saturation", "Luminance"][i]; input.setAttribute("aria-label", `${names[selected]} ${axis}`); input.setAttribute("aria-valuetext", signed(values[selected][i]));
    });
    if (resetChannel) resetChannel.setAttribute("aria-label", `Reset ${names[selected]} channel`);
  }
  function render() { pending = 0; renderPixels(original, result.data, cache, values); context.putImageData(result, 0, 0); }
  function schedule() { if (!pending) pending = requestAnimationFrame(render); }
  function update(input, axis) {
    const value = Number(input.value); if (!Number.isFinite(value)) return;
    values[selected][axis] = Math.max(-100, Math.min(100, value)); input.previousElementSibling.value = signed(values[selected][axis]); input.setAttribute("aria-valuetext", signed(values[selected][axis])); schedule();
  }
  function initialize() {
    if (!photo.naturalWidth || original) return;
    try {
      canvas.width = Math.min(640, photo.naturalWidth); canvas.height = Math.round(canvas.width * photo.naturalHeight / photo.naturalWidth);
      context = canvas.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" }); if (!context) throw new Error("Canvas unavailable");
      context.drawImage(photo, 0, 0, canvas.width, canvas.height); result = context.getImageData(0, 0, canvas.width, canvas.height); original = new Uint8ClampedArray(result.data);
      cache = preparePixels(original);
      buttons.forEach((button, i) => button.addEventListener("click", () => { selected = i; sync(); }));
      sliders.forEach((input, i) => { input.addEventListener("input", () => update(input, i)); input.addEventListener("change", () => update(input, i)); });
      resetAll.addEventListener("click", () => { values.forEach(value => value.fill(0)); sync(); schedule(); });
      if (resetChannel) resetChannel.addEventListener("click", () => { values[selected].fill(0); sync(); schedule(); });
      sync(); render(); canvas.hidden = false; photo.hidden = true; controls.hidden = false;
    } catch (_) {
      original = null; root.querySelector(".mixer-note").textContent = "Flower photograph · Interactive preview unavailable in this browser.";
    }
  }
  photo.addEventListener("load", initialize, { once: true });
  photo.addEventListener("error", () => { root.querySelector(".mixer-note").textContent = "The preview photograph could not load. Please reload to try again."; }, { once: true });
  if (photo.complete) initialize();
})();
