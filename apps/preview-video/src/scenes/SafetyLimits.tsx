import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SafetyLimits: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity1 = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const opacity2 = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const opacity3 = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <div className="flex flex-col w-full h-full bg-[#09090B] text-white font-sans p-20 justify-between border-[16px] border-[#09955F] border-solid">
      {/* Header */}
      <div>
        <span className="text-[#EF4444] text-lg font-bold tracking-widest uppercase">Safety First</span>
        <h2 className="text-5xl font-extrabold mt-2 text-[#EF4444]">Limit & Safety Engine</h2>
      </div>

      {/* Feature Bullet Points */}
      <div className="flex flex-col gap-8 my-auto max-w-4xl">
        <div style={{ opacity: opacity1 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#EF4444] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">1</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Monthly Spending Caps</h3>
            <p className="text-zinc-400 text-lg">
              Define maximum monthly limits (`maxMonthlyAmount`) directly inside the smart contracts to secure your funds.
            </p>
          </div>
        </div>

        <div style={{ opacity: opacity2 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#EF4444] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">2</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Automatic Halted State</h3>
            <p className="text-zinc-400 text-lg">
              The AI execution engine automatically evaluates spending and pauses the schedule if it attempts to cross the limit.
            </p>
          </div>
        </div>

        <div style={{ opacity: opacity3 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#EF4444] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">3</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Push Alerts</h3>
            <p className="text-zinc-400 text-lg">
              Triggers notifications instantly, warning users of reached spending thresholds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
