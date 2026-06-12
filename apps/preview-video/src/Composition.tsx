import React from "react";
import { Sequence } from "remotion";
import { Intro } from "./scenes/Intro";
import { ProblemSolution } from "./scenes/ProblemSolution";
import { IntentParsing } from "./scenes/IntentParsing";
import { Execution } from "./scenes/Execution";
import { SafetyLimits } from "./scenes/SafetyLimits";
import { Outro } from "./scenes/Outro";

export const SendeaseComposition: React.FC = () => {
  return (
    <div className="w-full h-full bg-black">
      {/* 1. Intro Slide (0 - 5s, 0 - 150 frames) */}
      <Sequence from={0} durationInFrames={150}>
        <Intro />
      </Sequence>

      {/* 2. Problem & Solution Slide (5s - 10s, 150 - 300 frames) */}
      <Sequence from={150} durationInFrames={150}>
        <ProblemSolution />
      </Sequence>

      {/* 3. Intent Parsing Slide (10s - 15s, 300 - 450 frames) */}
      <Sequence from={300} durationInFrames={150}>
        <IntentParsing />
      </Sequence>

      {/* 4. Autonomous Execution Slide (15s - 20s, 450 - 600 frames) */}
      <Sequence from={450} durationInFrames={150}>
        <Execution />
      </Sequence>

      {/* 5. Safety Limits Slide (20s - 25s, 600 - 750 frames) */}
      <Sequence from={600} durationInFrames={150}>
        <SafetyLimits />
      </Sequence>

      {/* 6. Outro Slide (25s - 30s, 750 - 900 frames) */}
      <Sequence from={750} durationInFrames={150}>
        <Outro />
      </Sequence>
    </div>
  );
};
