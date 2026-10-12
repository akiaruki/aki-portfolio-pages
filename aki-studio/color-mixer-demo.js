(() => {
  "use strict";
  const root = document.querySelector(".color-mixer-demo");
  if (!root) return;
  const photo = root.querySelector("img"), canvas = root.querySelector("canvas");
  const controls = root.querySelector(".mixer-controls");
  const buttons = [...root.querySelectorAll("[data-channel]")];
  const sliders = [...root.querySelectorAll("input[type=range]")];
  const names = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"];
  const centers = [0, 30, 60, 120, 180, 240, 270, 300];
  const values = centers.map(() => [0, 0, 0]);
  let selected = 2, pending = false, original, hsl, weights, result, context;
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const signed = (n) => n > 0 ? `+${n}` : String(n);
  function sync() {
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === selected)));
    root.querySelector("#mixer-channel").textContent = names[selected];
    sliders.forEach((input, i) => {
      input.value = values[selected][i];
      input.previousElementSibling.value = signed(values[selected][i]);
      input.setAttribute("aria-label", `${names[selected]} ${input.labels[0].textContent}`);
    });
  }
  function render() {
    pending = false;
    const out = result.data;
    for (let p = 0, k = 0; p < out.length; p += 4, k++) {
      let dh = 0, ds = 0, dl = 0;
      for (let c = 0; c < 8; c++) {
        const w = weights[k * 8 + c];
        dh += values[c][0] * w; ds += values[c][1] * w; dl += values[c][2] * w;
      }
      if (dh === 0 && ds === 0 && dl === 0) {
        out[p] = original[p]; out[p + 1] = original[p + 1]; out[p + 2] = original[p + 2];
      } else {
        const h = ((hsl[k * 3] + dh * .45) % 360 + 360) % 360;
        const s = clamp(hsl[k * 3 + 1] + ds / 100);
        const l = clamp(hsl[k * 3 + 2] + dl / 200);
        const chroma = (1 - Math.abs(2 * l - 1)) * s;
        const x = chroma * (1 - Math.abs((h / 60) % 2 - 1)), m = l - chroma / 2;
        const rgb = h < 60 ? [chroma,x,0] : h < 120 ? [x,chroma,0] : h < 180 ? [0,chroma,x] : h < 240 ? [0,x,chroma] : h < 300 ? [x,0,chroma] : [chroma,0,x];
        out[p] = (rgb[0] + m) * 255; out[p + 1] = (rgb[1] + m) * 255; out[p + 2] = (rgb[2] + m) * 255;
      }
      out[p + 3] = original[p + 3];
    }
    context.putImageData(result, 0, 0);
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }
  function initialize() {
    if (!photo.naturalWidth || original) return;
    try {
      canvas.width = Math.min(640, photo.naturalWidth);
      canvas.height = Math.round(canvas.width * photo.naturalHeight / photo.naturalWidth);
      context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        root.querySelector(".mixer-note").textContent = "Flower photograph · Interactive preview unavailable in this browser.";
        return;
      }
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      result = context.getImageData(0, 0, canvas.width, canvas.height);
      original = new Uint8ClampedArray(result.data);
      const count = canvas.width * canvas.height;
      hsl = new Float32Array(count * 3); weights = new Float32Array(count * 8);
      for (let p = 0, k = 0; p < original.length; p += 4, k++) {
        const r = original[p] / 255, g = original[p+1] / 255, b = original[p+2] / 255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min, l = (max+min)/2;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2*l-1));
        let h = d === 0 ? 0 : max === r ? 60 * ((g-b)/d % 6) : max === g ? 60 * ((b-r)/d+2) : 60 * ((r-g)/d+4);
        h = (h + 360) % 360;
        hsl[k*3] = h; hsl[k*3+1] = s; hsl[k*3+2] = l;
        let total = 0;
        centers.forEach((center, c) => {
          const distance = Math.min(Math.abs(h-center),360-Math.abs(h-center));
          const w = Math.max(0,1-distance/55); weights[k*8+c] = w*w; total += w*w;
        });
        for (let c = 0; c < 8; c++) weights[k*8+c] = total ? weights[k*8+c] / total * Math.min(1,s*4) : 0;
      }
      buttons.forEach((button, i) => button.addEventListener("click", () => { selected = i; sync(); }));
      sliders.forEach((input, i) => input.addEventListener("input", () => {
        values[selected][i] = Number(input.value);
        input.previousElementSibling.value = signed(input.valueAsNumber); schedule();
      }));
      root.querySelector(".mixer-reset").addEventListener("click", () => { values.forEach((v) => v.fill(0)); sync(); schedule(); });
      sync(); canvas.hidden = false; photo.hidden = true; controls.hidden = false;
    } catch (_) {
      original = null;
      root.querySelector(".mixer-note").textContent = "Flower photograph · Interactive preview unavailable in this browser.";
    }
  }
  photo.addEventListener("load", initialize, { once: true });
  photo.addEventListener("error", () => { root.querySelector(".mixer-note").textContent = "The preview photograph could not load. Please reload to try again."; }, { once: true });
  if (photo.complete) initialize();
})();
