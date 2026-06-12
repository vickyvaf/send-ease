import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const ProblemSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacityLeft = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const opacityRight = spring({ frame: frame - 25, fps, config: { damping: 12 } });

  return (
    <div className="flex flex-col w-full h-full bg-[#09090B] text-white font-sans p-20 justify-between">
      {/* Header */}
      <div>
        <span className="text-[#09955F] text-lg font-bold tracking-widest uppercase">Overview</span>
        <h2 className="text-5xl font-extrabold mt-2">The Problem & Solution</h2>
      </div>

      {/* Content Grid */}
      <div className="flex gap-12 my-auto">
        {/* Left: Problem */}
        <div 
          style={{ opacity: opacityLeft }}
          className="flex-1 bg-zinc-900 p-8 rounded-2xl border-2 border-red-500/20 flex flex-col gap-4"
        >
          <span className="text-red-500 font-bold text-xl uppercase tracking-wider">The Problem</span>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Sending periodic remittances to family manually is repetitive, time-consuming, and prone to human errors or forgotten dates.
          </p>
          <ul className="list-disc pl-5 text-zinc-400 flex flex-col gap-2">
            <li>Manual execution every single month</li>
            <li>Risk of forgetting crucial payments</li>
            <li>Lack of automated self-custodial options</li>
          </ul>
        </div>

        {/* Right: Solution */}
        <div 
          style={{ opacity: opacityRight }}
          className="flex-1 bg-zinc-900 p-8 rounded-2xl border-2 border-[#09955F]/20 flex flex-col gap-4"
        >
          <span className="text-[#09955F] font-bold text-xl uppercase tracking-wider">The Solution</span>
          <p className="text-zinc-400 text-lg leading-relaxed">
            **Sendease** introduces decentralized scheduled transfers using stablecoins, fully automated on-chain via AI execution agents.
          </p>
          <ul className="list-disc pl-5 text-zinc-400 flex flex-col gap-2">
            <li>Set-and-forget recurrence triggers</li>
            <li>Non-custodial smart contracts on Celo</li>
            <li>Gasless/Autonomous agent execution</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
