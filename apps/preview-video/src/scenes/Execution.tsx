import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Execution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity1 = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const opacity2 = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const opacity3 = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <div className="flex flex-col w-full h-full bg-[#09090B] text-white font-sans p-20 justify-between">
      {/* Header */}
      <div>
        <span className="text-[#09955F] text-lg font-bold tracking-widest uppercase">Feature Spotlight</span>
        <h2 className="text-5xl font-extrabold mt-2">Autonomous Automation Engine</h2>
      </div>

      {/* Feature Bullet Points */}
      <div className="flex flex-col gap-8 my-auto max-w-4xl">
        <div style={{ opacity: opacity1 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#09955F] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">1</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">On-Chain Monitoring</h3>
            <p className="text-zinc-400 text-lg">
              Active background daemons watch the smart contracts to detect due scheduled payments.
            </p>
          </div>
        </div>

        <div style={{ opacity: opacity2 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#09955F] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">2</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Gasless For Users</h3>
            <p className="text-zinc-400 text-lg">
              The hot-wallet agent signs and executes contract transfers using its own funded Celo account.
            </p>
          </div>
        </div>

        <div style={{ opacity: opacity3 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#09955F] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">3</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Instant Validation</h3>
            <p className="text-zinc-400 text-lg">
              Automatically advances schedule execution timestamps and records transaction outcomes transparently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
