"use client";

import { ConnectButton } from "@/components/connect-button";
import Link from "next/link";
import Image from "next/image";

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none md:flex">
      <div className="w-full max-w-md border-b bg-background/80 backdrop-blur-xl pointer-events-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95 shrink-0">
            <Image
              src="/logo.png"
              alt="Sendease Logo"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-base tracking-tight text-foreground whitespace-nowrap">Sendease</span>
          </Link>
          <div className="flex items-center gap-1.5 overflow-hidden">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
