import React from "react";
import { Sequence, Audio, staticFile } from "remotion";
import { Intro } from "./scenes/Intro";
import { ProblemSolution } from "./scenes/ProblemSolution";
import { IntentParsing } from "./scenes/IntentParsing";
import { Execution } from "./scenes/Execution";
import { SafetyLimits } from "./scenes/SafetyLimits";
import { Outro } from "./scenes/Outro";

export const SendeaseComposition: React.FC = () => {
  return (
    <div className="w-full h-full bg-black">
      {/* Backsound (Playing throughout the video, volume set to 15%) */}
      <Audio src={staticFile("backsound.mp3")} volume={0.15} loop />
      {/* 1. Intro Slide (0 - 4.55s) */}
      <Sequence from={0} durationInFrames={137}>
        <Audio src={staticFile("speech-scene-1.mp3")} volume={1.0} />
        <Intro />
      </Sequence>
      {/* 2. Problem & Solution Slide (4.55s - 13.77s) */}
      <Sequence from={137} durationInFrames={277}>
        <Audio src={staticFile("speech-scene-2.mp3")} volume={1.0} />
        <ProblemSolution />
      </Sequence>
      {/* 3. Intent Parsing Slide (13.77s - 21.42s) */}
      <Sequence from={414} durationInFrames={230}>
        <Audio src={staticFile("speech-scene-3.mp3")} volume={1.0} />
        <IntentParsing />
      </Sequence>
      {/* 4. Autonomous Execution Slide (21.42s - 28.13s) */}
      <Sequence from={644} durationInFrames={202}>
        <Audio src={staticFile("speech-scene-4.mp3")} volume={1.0} />
        <Execution />
      </Sequence>
      {/* 5. Safety Limits Slide (28.13s - 35.6s) */}
      <Sequence from={846} durationInFrames={225}>
        <Audio src={staticFile("speech-scene-5.mp3")} volume={1.0} />
        <SafetyLimits />
      </Sequence>
      {/* 6. Outro Slide (35.6s - 41.03s) */}
      <Sequence from={1071} durationInFrames={195}>
        <Audio src={staticFile("speech-scene-6.mp3")} volume={1.0} />
        <Outro />
      </Sequence>
    </div>
  );
};
