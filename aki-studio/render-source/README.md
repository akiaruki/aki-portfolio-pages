# Aki Studio render sources

This is the original authoring pipeline for the landing-page animation. It is not loaded by the website. It contains no application source code.

## Production

- Blender 5.2.2 LTS, EEVEE: original beveled black handset, individual glass-backed app panels, an Aki photograph, area lighting and perspective camera.
- 192 frames at 1280 × 1280, 24 fps. Texture surfaces use emission materials and the Standard view transform to retain interface colors.
- Remotion 4.0.532: composites the Blender frames with a restrained atmospheric background and edge treatment into an eight-second sequence.
- Desktop H.264: 1080 × 1080. Mobile H.264: 720 × 720. Both use CRF 18 and a six-frame GOP for responsive seeking.
- FFmpeg produces VP9 alternatives for browsers whose H.264 decoder is unavailable. The page loads one size and tries an alternative codec only if needed.
- The five WebP posters come from the same Remotion composition at frames 0, 44, 86, 122 and 164.

The website maps ordinary scroll position to the video's time. It does not play the sequence continuously, intercept wheel/touch scrolling, or render 3D geometry on the visitor's device.

## Reproduce

Run from this directory with Node.js, Blender, Python and Pillow installed:

```sh
npm ci
blender -b --python blender_scene.py -- --size 1280
node render.mjs
python finish_assets.py
```

Set `CHROME_PATH` and `FFMPEG_PATH` if the Windows defaults in `render.mjs` do not apply. On Windows, pass the installed Blender executable's complete path when `blender` is not on PATH. Rendering writes large temporary frame files to `public/frames`; only the compressed final media belongs in `../assets/`.

For a quick Blender inspection:

```sh
blender -b --python blender_scene.py -- --preview --frame 86 --size 800
```

For the editable Remotion preview:

```sh
npx remotion studio src/index.ts --no-open
```

## Capture provenance and rights

The supplied textures are marketing captures of Aki Studio, with PRO badges hidden at Aki's request. They contain no recording status indicator. The handset screen combines a real app capture with Aki's authorized photograph in the image area. The photograph and the UI panels are the same materials used by the landing page; they are not simulated output comparisons.

The Adaptive Looks examples elsewhere on the site were captured directly from the app's rendered canvas after selecting Daylight, Original, Soft Portrait and Summit. They are separate genuine app results, not CSS color filters or generated before/after images.

The geometry, code and composition are original work for Aki Studio. The photographs and app imagery remain Aki's material. No stock models, fonts, music or external artwork are used.

Blender is available under the [GNU GPL](https://www.blender.org/about/license/). Remotion has its [own license](https://www.remotion.dev/license); review its current terms for your team before modifying the render pipeline. The website includes the rendered outputs, not Blender or Remotion runtimes. No renderer service or paid hosting is required.
