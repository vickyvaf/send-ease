"use client";

import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ChevronDown } from "lucide-react";

export function ConnectButton() {
  const [isMinipay, setIsMinipay] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    // @ts-ignore
    if (window.ethereum?.isMiniPay) {
      setIsMinipay(true);
    }
  }, []);

  if (isMinipay && isConnected) {
    return null;
  }

  return (
    <RainbowKitConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold active:scale-95 transition-transform text-sm"
                  >
                    Connect
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-destructive text-destructive-foreground px-4 py-2 rounded-xl font-bold active:scale-95 transition-transform text-sm"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold border border-border"
                  >
                    {chain.hasIcon && (
                      <div
                        className="w-4 h-4 rounded-full overflow-hidden"
                        style={{
                          background: chain.iconBackground,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            className="w-4 h-4"
                          />
                        )}
                      </div>
                    )}
                    <span className="sr-only sm:not-sr-only sm:inline">{chain.name}</span>
                    <ChevronDown size={12} className="opacity-50" />
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold border border-border"
                  >
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    {account.displayName}
                    <ChevronDown size={12} className="opacity-50" />
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowKitConnectButton.Custom>
  );
}
