# Aki Studio — public product website

Static source for the [Aki Studio product page](https://akiaruki.github.io/aki-portfolio-pages/aki-studio/), hosted on GitHub Pages.

## Editing and deployment

- Edit `index.html`, `studio.css`, `release.css`, `studio.js`, `tools-demo.js`, and the selected files in `assets/`. The support and privacy pages share `policy.css`. The twelve-tool guide is `tools.html` with `tools.css`; legal notices are in `licenses.html`.
- The publishing branch is `main`. GitHub Pages publishes this folder at `/aki-studio/`.
- The portfolio's root `index.html` contains the Aki Studio navigation link; its responsive navigation rules are in root `exhibition.css`.
- Use relative asset URLs so the page continues to work under the repository subpath. Update versioned CSS and JavaScript URLs when their contents change.
- Keep edits scoped to this folder and the intended portfolio navigation. Do not run a legacy whole-portfolio export over the repository: older exporters may not recognize the Aki Studio subtree.
- GitHub stores the required website source and public assets. Remote editing requires an authorized GitHub connection with write access to this repository.

## Product and release status

As of October 6, 2026, Aki Studio version 1.8.3, build 70 is available for testing through TestFlight. The public App Store release is forthcoming; do not display a live App Store badge or imply it is already published. The current installation CTA is the approved [TestFlight invitation](https://testflight.apple.com/join/ef48hkdQ). Access depends on available spaces and compatible devices. Android remains coming soon.

All built-in Looks and all twelve editing tools are free, with no subscriptions, in-app purchases, or paid feature tiers. The page presents the Aki, Film, Cinematic, Daily, and B&W collections, retains the original Japanese Aki Look names, and describes the movable glass panels and customizable workspace.

Build 70 uses Google test ads. An ad may appear only after a confirmed successful save to Photos; a cooldown and frequency limit mean it does not appear after every save, and an unavailable ad does not block the save. Commercial advertising is planned for the public release, with live AdMob approval still pending. Keep public ad and data-practice descriptions aligned with the app and the [Privacy Policy](privacy.html) and [Support](support.html) pages.

The approved public contact is [akistudio.mobile@gmail.com](mailto:akistudio.mobile@gmail.com). RAW compatibility varies by camera, file, and device. Imported creative `.cube` LUTs are intended for supported SDR/sRGB workflows. Signed, encrypted `.aki` packages are supported; this is not an anti-piracy guarantee. Do not add unverified availability, testimonials, universal compatibility, performance, camera-emulation, or endorsement claims.

## Current page implementation

- The page uses native HTML, CSS, and JavaScript, system fonts, inline SVG, and local image assets. It has no runtime packages, analytics, external font requests, or advertising SDK. App advertising described on the page is separate from the website.
- Five semantic story chapters preserve the flower photograph and product narrative. The phone and floating controls are lightweight HTML/CSS illustrations, explicitly captioned as illustrative interface compositions. They are not device screenshots or a pixel-exact app simulator. Decorative controls inside them are not interactive app tools.
- On sufficiently large screens with ordinary motion enabled, CSS sticky positioning and scroll-driven chapter selection provide the story. Native wheel and touch scrolling are not intercepted. Scroll updates are coalesced with `requestAnimationFrame`, with no continuous idle animation loop or video decoding.
- Narrow screens, short screens, reduced-motion preferences, and JavaScript-disabled browsing retain the chapters in ordinary document flow. Core copy and installation links remain available without JavaScript.
- The separate twelve-tool organizer is an independent web demonstration using the existing rasterized app glyph artwork. Hold-and-drag, tap-then-tap, and keyboard controls provide alternatives. Optional local storage remembers only the demo arrangement; unavailable storage leaves it usable for the visit.
- The [Tools Guide](tools.html) explains each of the twelve tools with anchored navigation, existing tool glyphs, actual controls, and practical uses. Its descriptions were checked against the current app's tool catalog and UI controls. It uses static HTML/CSS and remains readable without JavaScript. The home page's About section introduces the product; [Licenses](licenses.html) contains public copyright, license, and disclosure information.
- The Look selector swaps pre-rendered images; it does not ship or execute the app's Look recipes. Below-the-fold images load lazily, and explicit dimensions reserve space. Mobile navigation supports Escape and focus return.

## Asset provenance

- Botanical photographs belong to Aki and come from the authorized public `inconspicuous` portfolio collection: Gumamela, Alternanthera Brasiliana, Crape Myrtle, and Rose. Website copies are compressed WebP derivatives without embedded photo metadata.
- The current `look-v3-*.webp` previews use the same user-selected yellow-flower JPEG. They comprise five native Aki Looks—Kurumi (`aki.kurumi.v2`), Shirayuki (`aki.shirayuki.v2`), Wakaba (`aki.wakaba.v2`), Kogane (`aki.kogane.v2`), and Shigure (`aki.shigure.v2`)—plus Original without a Look.
- As documented in [render-source](render-source/README.md), those pixels were produced offline using the unchanged native Android shader, Java adaptive analysis, and Look recipes in an isolated WebGL2 rendering harness. They are not physical-device captures or a claim of exact iOS/Android parity. Each Look was rendered three times with identical hashes; the recorded independent native CPU reference differed by no more than 1/255 per RGB channel. Lossless WebP preserves the outputs. See [look-provenance.json](render-source/look-provenance.json) for the recorded input and output hashes.
- Only rendered pixels, public names, IDs, and provenance records are included. Private application source, Look recipes, content keys, credentials, original attachments, and personal files are not part of this website.
- The website retains the existing katakana brand mark and app glyph artwork. The illustrated phone framing and interface layouts are website presentation, not a commercial phone model or Apple endorsement.

## Historical rendered story assets

The Blender/Remotion story videos, `story-v4-*.webp` posters, and their earlier generations are historical assets. The October 6 release refresh replaces their baked-in toolbar imagery with the current HTML/CSS illustrated story. Retained files and authoring records do not indicate that these older interface captures are the current app UI.

The [render-source directory](render-source/README.md) preserves the earlier production and licensing record: Blender 5.2.2 produced an original thin-bezel handset, lighting, and floating panels; Remotion 4.0.532 composited 480 frames at 60 fps into desktop and mobile videos. Its geometry checks, texture captures, panel layout, toolbar-composition records, and reproduction instructions describe that historical rendered presentation. No Blender or Remotion runtime is loaded by the current page.

The earlier app textures used actual browser-UI captures. PRO badges were hidden in those marketing captures at the user's request, without changing the private application's source or entitlements. Their histograms and thumbnails were genuine app outputs, and the original Daily thumbnails were illustrative UI imagery separate from the five native Aki previews. The still-older `look-v2-*.webp` set featured Daylight, Original, Soft Portrait, and Summit; “Original” there was a named Look and must not be confused with the no-Look baseline in the active v3 preview set.

## Release verification

Before publishing, check the page at 320, 360, 390, 768, 1024, 1440, and 1920 CSS pixels, plus a short mobile viewport. Verify no horizontal overflow, readable illustrations, loaded images, in-page links, the TestFlight CTA, support and privacy navigation, contact links, tool rearrangement, Look selection, the mobile menu, and FAQ controls. Check all five desktop story chapters, reduced motion, keyboard navigation, and the no-JavaScript fallback. Confirm that the published URLs and GitHub Pages deployment correspond to the intended source commit.

The HTML `data-release` identifies the website revision. With JavaScript enabled, the story reports `data-renderer="html-illustration"`, `data-story-mode="motion"` or `"static"`, and the selected `data-chapter` during the enhanced desktop story. These attributes are diagnostics and do not add implementation details to the product interface.
