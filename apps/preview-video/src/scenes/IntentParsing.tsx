import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const IntentParsing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity1 = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const opacity2 = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const opacity3 = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <div className="flex flex-col w-full h-full bg-[#09090B] text-white font-sans p-20 justify-between border-[16px] border-[#09955F] border-solid">
      {/* Header */}
      <div>
        <span className="text-[#09955F] text-lg font-bold tracking-widest uppercase">Feature Spotlight</span>
        <h2 className="text-5xl font-extrabold mt-2">Natural Language Intent Parsing</h2>
      </div>

      {/* Feature Bullet Points */}
      <div className="flex flex-col gap-8 my-auto max-w-4xl">
        <div style={{ opacity: opacity1 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#09955F] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">1</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Colloquial Setup</h3>
            <p className="text-zinc-400 text-lg">
              Simply type your request: <span className="text-white font-mono bg-zinc-800 px-2 py-0.5 rounded">"Kirim 100 USDm ke Ana tiap tanggal 1"</span>.
            </p>
          </div>
        </div>

        <div style={{ opacity: opacity2 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#09955F] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">2</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Advanced NLP Extraction</h3>
            <p className="text-zinc-400 text-lg">
              Sendease Agent parses instructions instantly to extract amount, currency, recipient, and frequency.
            </p>
          </div>
        </div>

        <div style={{ opacity: opacity3 }} className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-[#09955F] flex items-center justify-center font-bold text-xl flex-shrink-0 text-white">3</div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Zero Forms Friction</h3>
            <p className="text-zinc-400 text-lg">
              Auto-fills the configuration screen. All the user does is review and click sign.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
