# Aki Studio — immersive landing page

Static source for the public Aki Studio product page, hosted on GitHub Pages at:

https://akiaruki.github.io/aki-portfolio-pages/aki-studio/

## Editing and deployment

- Edit `index.html`, `studio.css`, `studio.js`, and the selected files in `assets/`.
- The publishing branch is `main`. GitHub Pages publishes this folder at `/aki-studio/`.
- The portfolio's root `index.html` contains the Aki Studio navigation link; its responsive navigation rules are in root `exhibition.css`.
- Use relative asset URLs so the page continues to work under the repository subpath.
- Keep edits scoped to this folder and the intended portfolio navigation. Do not run a legacy whole-portfolio export over the repository: older exporters may not recognize the Aki Studio subtree.
- GitHub stores all required website source and assets. Editing from ChatGPT with the PC off additionally requires an authorized cloud GitHub connection with write access to this repository; a browser login or local Git credential does not establish that connection.

## Product and release copy

The current public direction is an iOS beta through October 15, 2026, with Android coming soon. The only download CTA is the approved TestFlight invite:

https://testflight.apple.com/join/ef48hkdQ

The approved public contact is `akistudio.mobile@gmail.com`. Review the beta date before a future release. Do not add App Store availability, pricing, testimonials, universal RAW support, performance guarantees, camera-emulation guarantees or endorsement claims without verification.

## Assets and implementation

- Botanical photographs belong to Aki and come from the authorized public `inconspicuous` portfolio collection: Gumamela, Alternanthera Brasiliana, Crape Myrtle and Rose. Website copies are compressed WebP derivatives without embedded photo metadata.
- App textures were captured from Aki Studio with the authorized Gumamela photograph loaded. PRO badges were hidden in the marketing capture at Aki's request; no application source or entitlement was changed. No recording indicator appears. The handset screen uses a labeled illustrative photo composition.
- `look-*.webp` previews are actual app-rendered results after selecting Daylight, Original, Soft Portrait and Summit. The website swaps those images; it does not run the editing engine or manufacture before/after results.
- Private application source, original attachments, personal files and credentials are not part of this website.
- The page uses native HTML, CSS and JavaScript, with system fonts and no runtime packages, analytics or external font requests.
- Blender 5.2.2 produced the original handset, lighting and floating 3D panels. Remotion 4.0.532 composited 192 frames into separate desktop and mobile videos. See [render-source](render-source/README.md) for reproducible authoring files, dimensions and licensing notes. No Apple model, logo or brand asset is used.
- Native page scroll scrubs the rendered video across five full-screen chapters. The page uses CSS sticky positioning and semantic HTML copy. It does not intercept wheel/touch scrolling or depend on browser WebGL. The obsolete live WebGL renderer has been removed.
- One coalesced animation frame updates scroll state. Video seeking is bounded to one request at a time and stops offscreen or in hidden tabs. The video stays paused; it does not play continuously when the visitor is idle. There are no runtime frame sequences to decode into JavaScript memory.
- The desktop H.264 video is about 2 MB and the mobile video about 1.2 MB. Smaller VP9 alternatives are available if the browser's primary decoder fails. Only one viewport size is loaded. This is an asset budget, not a physical-device frame-rate claim.
- Reduced motion, data saving, unsupported media or JavaScript disabled reveal all five semantic chapters and their rendered posters in ordinary document flow. There is no empty pinned fallback area. Two reported CPU cores or unavailable WebGL do not disable the rendered story.
- The floating tool demo supports mouse/touch-handle dragging, keyboard selection with Space, arrow-key movement, Enter to place and Escape to cancel. It saves only the demo order in optional browser local storage. Reset restores the initial order. It does not change the app's workspace.
- Below-the-fold images load lazily and dimensions reserve space. Mobile navigation supports Escape and focus return. Icons are inline SVG rather than font-dependent arrows.

## Release verification

Before publishing, check the landing page at 320, 360, 390, 768, 1024, 1440 and 1920 CSS pixels, plus a short mobile viewport. Verify the actual published URLs, no horizontal overflow, all images, in-page links, TestFlight CTA, contact mailto, tool rearrangement, look selection, mobile menu, FAQ, reduced motion and no-JavaScript fallback. Inspect story progress at 0%, 23%, 45%, 64%, 86% and 100%; confirm video time, full-screen sticky visibility and one active chapter. Check paused idle behavior and operation with WebGL disabled and two reported cores. Confirm that the GitHub Pages deployment corresponds to the intended source commit.

For diagnostics, the HTML `data-release` identifies the revision. The story's `data-renderer`, `data-story-mode` and optional `data-fallback-reason` distinguish loaded video, loading and a deliberate static fallback. These attributes are diagnostics only and do not add technical details to the product interface.
