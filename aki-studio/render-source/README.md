# Aki Studio render sources

Original, reproducible authoring files for the public landing page. This directory is not loaded by the website and contains no application source code.

## Production

- Blender 5.2.2 LTS, EEVEE: an original thin-bezel, unbranded handset, one glass interface presentation at a time, area lighting and a fixed perspective camera.
- 480 frames at 1280 × 1280, 60 fps. Emission textures and the Standard view transform retain captured interface colors.
- Each panel lifts forward, moves outward, holds, and returns by the same path. Its matching screen region fades away during presentation. Quintic easing is continuous in position, velocity and acceleration at endpoints.
- `geometry-audit.json` records all 480 frames: one visible floating panel at most, no handset intersections, and no camera clipping. Artistic model dimensions are not measurements of a commercial phone.
- Remotion 4.0.532 composites the frames into an eight-second sequence. Desktop output is 1080 × 1080; mobile output is 720 × 720. H.264 uses CRF 18 and a six-frame GOP. VP9 is the alternate codec.
- Five WebP posters are rendered at frames 0, 110, 215, 306 and 412.

The page maps ordinary scrolling to a paused video's time. It never intercepts page scrolling or renders 3D geometry on the visitor's device. Export frame rate is not a physical-device performance claim. Reduced motion, data saving, unavailable codecs and disabled JavaScript retain static chapters and working links.

## Reproduce

With Node.js, Blender, Python and Pillow installed, run from this directory:

```sh
npm ci
blender -b --python blender_scene.py -- --size 1280
node render.mjs
python finish_assets.py
```

Set `CHROME_PATH` and `FFMPEG_PATH` if the Windows defaults do not apply. Intermediate frames go to `public/frames-v2/`; publish only compressed final media in `../assets/`. The generated `.blend` remains a local working file because it stores local texture paths.

For quick inspection and editable preview:

```sh
blender -b --python blender_scene.py -- --audit
blender -b --python blender_scene.py -- --preview --frame 110 --size 800
npx remotion studio src/index.ts --no-open
```

## Capture provenance

The user-selected yellow-flower JPEG is identified by its SHA256 in `capture-provenance.json`. Four Adaptive Looks—Daylight, Original, Soft Portrait and Summit—were captured directly from Aki Studio's rendered canvas using the same input. “Original” is a named Look, not an unedited-baseline claim. No CSS grading or generated before/after results are used.

The phone uses an actual app capture. Floating controls are captures of the app's real interface, isolated against its neutral background so the photograph behind the glass is not baked into a detached panel. Histograms and Look thumbnails remain genuine app outputs. `panel-layout.json` records their measured screen positions. PRO badges were hidden in marketing captures at the user's request; no recording status indicator is present. The private app was not modified or copied here.

The organizer is an independent web demonstration of the app's four-column glyph-and-label surface, using rasterized rendered app artwork. The header uses the app's existing katakana mark. See [motion and interaction decisions](MOTION-NOTES.md) for research, accessibility and performance details.

Geometry, animation and web code are original work for Aki Studio. Supplied photographs and app imagery remain their owners' materials. No stock models, music, external fonts or Apple brand assets are used. Apple is a quality reference, not an endorsement or certification.

Blender uses the [GNU GPL](https://www.blender.org/about/license/); Remotion has its [own license](https://www.remotion.dev/license). The website serves rendered outputs without either runtime. No paid rendering service or hosting is required.
