import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Composition,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const RenderedStory: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#080a09", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 54%, #343d3928 0%, #171c1922 32%, transparent 67%)",
          opacity: interpolate(
            frame,
            [0, 110, 350, 479],
            [0.4, 0.75, 0.7, 0.6],
          ),
        }}
      />
      <CanvasImage
        src={staticFile(`frames-v2/${String(frame).padStart(4, "0")}.png`)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 65%, #080a09 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

export const MyComposition: React.FC = () => (
  <>
    <Composition
      id="AkiStudioStory"
      component={RenderedStory}
      durationInFrames={480}
      fps={60}
      width={1080}
      height={1080}
    />
    <Composition
      id="AkiStudioStoryMobile"
      component={RenderedStory}
      durationInFrames={480}
      fps={60}
      width={720}
      height={720}
    />
  </>
);
