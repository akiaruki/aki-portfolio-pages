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
python compose_screens.py
blender -b --python blender_scene.py -- --size 1280
node render.mjs
python finish_assets.py
```

Set `CHROME_PATH` and `FFMPEG_PATH` if the Windows defaults do not apply. Intermediate frames go to `public/frames-v4/`; publish only compressed final media in `../assets/`. The generated `.blend` remains a local working file because it stores local texture paths.

For quick inspection and editable preview:

```sh
blender -b --python blender_scene.py -- --audit
blender -b --python blender_scene.py -- --preview --frame 110 --size 800
npx remotion studio src/index.ts --no-open
```

## Capture provenance

The interactive preview uses five current native Aki Looks: Kurumi (aki.kurumi.v2), Shirayuki (aki.shirayuki.v2), Wakaba (aki.wakaba.v2), Kogane (aki.kogane.v2), and Shigure (aki.shigure.v2), plus Original without a Look. All six use the same user-selected JPEG. The unchanged native Android shader, Java adaptive analysis, and Look recipes were executed offline in an isolated WebGL2 rendering harness. This is not a physical-device capture or a claim of cross-platform parity. Each Look was rendered three times with identical hashes; an independent native CPU reference differed by no more than 1/255 per RGB channel. Lossless WebP retains the outputs. Only rendered pixels, IDs, names and provenance hashes are public; private source and recipes are excluded. See `look-provenance.json`.

The hero interface textures were captured from the application's browser UI. Its original Daily collection thumbnails remain illustrative UI imagery, separate from the five native Aki previews. The screen is now a single opaque surface whose textures are composited before rendering. This removes coplanar transparent geometry, depth flicker and doubled labels during transitions.

The phone uses an actual app capture. Floating controls are captures of the app's real interface, isolated against its neutral background so the photograph behind the glass is not baked into a detached panel. Histograms and Look thumbnails remain genuine app outputs. `panel-layout.json` records their measured screen positions. PRO badges were hidden in marketing captures at the user's request; no recording status indicator is present. The private app was not modified or copied here.

The organizer is an independent web demonstration of the app's four-column glyph-and-label surface, using rasterized rendered app artwork. The header uses the app's existing katakana mark. See [motion and interaction decisions](MOTION-NOTES.md) for research, accessibility and performance details.

Geometry, animation and web code are original work for Aki Studio. Supplied photographs and app imagery remain their owners' materials. No stock models, music, external fonts or Apple brand assets are used. Apple is a quality reference, not an endorsement or certification.

Blender uses the [GNU GPL](https://www.blender.org/about/license/); Remotion has its [own license](https://www.remotion.dev/license). The website serves rendered outputs without either runtime. No paid rendering service or hosting is required.

## v4 black toolbar refinement

The current screen texture includes the actual app header recaptured on black. Only the marketing capture background changed; the logo, icons and disabled Undo/Redo states remain app-rendered. All v4 videos and five posters use this texture. Timing stays 480 frames at 60 fps (eight seconds), with six-frame keyframes to retain compact downloads and short seek dependencies.

The full reproduction above renders all frames normally. When the original v3 lossless `frames-v2` sequence is available, the equivalent toolbar-only route avoids redundant rendering:

```sh
python compose_screens.py
blender -b --python blender_scene.py -- --start 0 --end 75 --size 1280
python compose_toolbar_frames.py --original-frames /path/to/original/frames-v2
node render.mjs
python finish_assets.py
```

The handset reaches its final pose at frame 75. The compositor requires identical projected bounds thereafter and allows at most one 8-bit code value of stationary-header quantization variation in the original sequence. It replaces only the recorded header rectangle. `toolbar-composition-evidence.json` records all 480 original and composed frame hashes and proves exact RGBA equality outside those rectangles before video encoding. Compression can change final decoded pixels slightly. Geometry, photography, panel animation and screen contents below the header are retained.
