# Aki Studio landing page

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
- `app-*.webp` files are rendered interface previews captured from the local Aki Studio application with Aki's authorized Gumamela photograph loaded. These are marketing images, not native-device performance evidence. The hero overlays Aki’s photograph inside the app canvas for an illustrative composition; the workspace illustration combines an app tool-panel capture with a separate Aki photograph. Both are labeled accordingly. Full interactive interface previews retain the original capture.
- PRO labels in previews are existing interface labels; they do not represent a current payment gate or a pricing offer.
- Private application source, original attachments, personal files and credentials are not part of this website.
- The page uses native HTML, CSS and JavaScript, with system fonts and no runtime packages, analytics or external font requests.
- The product stage uses CSS perspective and transforms. It renders without WebGL or JavaScript. Pointer motion is event-driven, bounded, and disabled for reduced motion, coarse pointers, low reported hardware concurrency, data-saving connections, hidden tabs and offscreen content. No continuous animation loop runs while idle.
- Images below the fold load lazily; dimensions reserve space. The interface tabs support arrow keys, Home/End, ARIA selection and a static no-JavaScript preview. Mobile navigation supports Escape and focus return.

## Release verification

Before publishing, check the landing page at 320, 360, 390, 768, 1024, 1440 and 1920 CSS pixels. Check the portfolio navigation at the same breakpoints and at 540/820 pixels. Verify the actual published URLs, no horizontal overflow, all images, in-page links, TestFlight CTA, contact mailto, keyboard tab navigation, mobile menu, FAQ, reduced motion and no-JavaScript fallback. Confirm that the GitHub Pages deployment corresponds to the intended source commit.
