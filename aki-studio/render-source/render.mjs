import path from "node:path";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import {
  selectComposition,
  renderMedia,
  renderStill,
} from "@remotion/renderer";
const browserExecutable =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  onProgress: (p) => {
    if (p % 25 === 0) console.log("Bundle", p);
  },
});
const destination = path.resolve("../assets");
await fs.mkdir("stills", { recursive: true });
for (const [id, filename] of [
  ["AkiStudioStory", "aki-story-desktop.mp4"],
  ["AkiStudioStoryMobile", "aki-story-mobile.mp4"],
]) {
  const composition = await selectComposition({
    serveUrl,
    id,
    browserExecutable,
  });
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    browserExecutable,
    codec: "h264",
    outputLocation: path.join(destination, filename),
    crf: 18,
    gopSize: 6,
    x264Preset: "slow",
    concurrency: 3,
    imageFormat: "png",
    pixelFormat: "yuv420p",
    onProgress: (p) => {
      const step = Math.floor(p.progress * 4);
      if (step !== last) {
        last = step;
        console.log(id, step * 25 + "%");
      }
    },
  });
  console.log("Rendered", filename);
  if (id === "AkiStudioStory")
    for (const [index, frame] of [0, 44, 86, 122, 164].entries()) {
      await renderStill({
        composition,
        serveUrl,
        browserExecutable,
        output: path.resolve(`stills/story-${index}.png`),
        frame,
        imageFormat: "png",
      });
      console.log("Poster", index, frame);
    }
}

const ffmpeg =
  process.env.FFMPEG_PATH ||
  path.resolve("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
for (const variant of ["desktop", "mobile"]) {
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      path.join(destination, `aki-story-${variant}.mp4`),
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      variant === "desktop" ? "26" : "27",
      "-g",
      "6",
      "-row-mt",
      "1",
      "-cpu-used",
      "4",
      "-an",
      path.join(destination, `aki-story-${variant}.webm`),
    ],
    { stdio: "inherit" },
  );
}
