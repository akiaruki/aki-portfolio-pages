# Motion and interaction decisions

This is original Aki Studio marketing work. Apple is a design-quality reference, not an endorsement, certification, hardware model or asset provider.

## Purposeful, reversible presentation

Apple's [Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/) explains continuity of position and velocity, including retargeting during a gesture. The page uses one critically damped scroll-progress value for all chapters and media time. Reversing the scroll retargets that value without replacing the native page scroll. It settles to a stop instead of running an idle animation loop.

The Blender scene uses quintic easing with continuous position, velocity and acceleration at its endpoints. Each tool presentation follows the same lift-out, hold and return path in either scroll direction. Only one floating panel is visible at a time. Every visible panel vertex stays in front of the handset's nearest surface. A per-frame geometry audit checks this depth separation and camera framing across all 480 frames. A screen capture already contains its own perimeter, so the backing matches that perimeter instead of adding another outer frame.

The original, unbranded handset has a 2.40-unit body width and 2.354-unit display width: a 0.023-unit side margin. These are artistic model dimensions, not measurements of a commercial phone.

## Direct manipulation, faithful appearance

The interactive preview follows Aki Studio's actual four-column, three-row glyph-and-label surface. Its glyph images are rasterized from the app's rendered artwork. There are no individual square cards or grip handles. The app's existing katakana artwork is used in the header.

Following the continuity and feedback principles in Apple's [drag and drop guidance](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop), a stationary 420 ms touch hold picks up the original icon and label. Moving more than 8 px before touch pickup keeps native scrolling. A mouse drag starts after an 8 px movement or the stationary hold; pointer capture retains the gesture outside the original button. These thresholds are tuning decisions, not Apple requirements. The original item remains the same shape, the preview follows the pointer, neighbors move to show insertion, and dropping inside the grid commits the order. Dropping outside restores it. DOM reordering and compensating transforms commit in the same task, preventing a one-frame jump. Edge scrolling applies to the tool container only when it has overflow.

[Pointer Events](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property) determines allowed native gestures at contact start. The implementation therefore installs a narrowly scoped, non-passive touch-move gate before contact and prevents scrolling only after a stationary pickup. Ordinary swipes remain native scrolling. It does not attempt to claim a gesture by changing `touch-action` after a hold.

[WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) requires a single-pointer alternative to dragging, separately from keyboard access. A visitor can tap one tool, then tap its destination. Keyboard interaction supports Space, arrow keys, Enter and Escape with retained focus and live announcements. Optional local storage remembers only this website demonstration.

## Rendering and performance

Blender renders the original geometry, then Remotion composites the frames into the final media. The 60 fps export provides more temporal samples for seeking; it is not a claim of physical-device frame rate. H.264 and VP9 variants support codec fallback. Media seeks are serialized and coalesced. Where available, [requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) drives the visible chapter from the presented media time and records it for QA; `currentTime` alone is not treated as proof of presentation.

Following [web.dev animation guidance](https://web.dev/articles/animations-guide), the organizer caches its geometry once at pickup and animates only transforms. Its DOM order changes once on drop. Neighbor springs preserve their current velocity when retargeted. The scroll scene likewise caches layout geometry and refreshes it after resizing instead of reading geometry on every frame.

Reduced motion, data saving, unavailable media and disabled JavaScript preserve static chapters and working links. Direct controls retain their meaning without decorative movement. Testing includes reverse and fast scrolling, tap and keyboard access, touch swipe versus hold, cancellation, overflow autoscroll, storage failure and the actual deployed page. Automated browser results do not replace physical-device testing.

The screen is one opaque composited material, preventing coplanar depth flicker. Transitions clear the source before showing a detached panel. Blender [blended surface rendering](https://docs.blender.org/api/current/bpy.types.Material.html#bpy.types.Material.surface_render_method) avoids stochastic visibility on the floating panels. Image selection decodes replacements offscreen before committing matching pixels and labels, following the browser [decode API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode).
