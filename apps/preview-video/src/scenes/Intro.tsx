import React from "react";
import { spring, useCurrentFrame, useVideoConfig, staticFile } from "remotion";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, config: { damping: 12 } });
  const scale = spring({ frame, fps, from: 0.9, to: 1, config: { damping: 15 } });

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#09090B] text-white font-sans px-12 border-[16px] border-[#09955F] border-solid">
      <div 
        style={{ opacity, transform: `scale(${scale})` }}
        className="flex flex-col items-center text-center"
      >
        <div className="w-24 h-24 mb-6 overflow-hidden rounded-2xl flex items-center justify-center bg-white p-2 border-4 border-[#09955F]">
          <img src={staticFile("logo.png")} alt="Sendease Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-7xl font-extrabold tracking-tight mb-4 text-white">
          Sendease
        </h1>
        <p className="text-2xl text-[#09955F] font-semibold tracking-wide uppercase">
          Decentralized Scheduled Remittances on Celo MiniPay
        </p>
      </div>
    </div>
  );
};
