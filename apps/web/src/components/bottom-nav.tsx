"use client";

import { cn } from "@/lib/utils";
import { Bot, CalendarPlus, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Schedule", href: "/create", icon: CalendarPlus },
  { name: "AI Chat", href: "/ai", icon: Bot },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <div className="w-full max-w-md bg-white border-t border-slate-100 pointer-events-auto pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center w-full h-20 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all relative flex-1 h-14",
                  isActive ? "text-[#09955F]" : "text-slate-400"
                )}
              >
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 2}
                  className={cn(
                    "transition-all",
                    isActive && "scale-110"
                  )}
                />
                <span className={cn(
                  "text-xs font-semibold tracking-tight transition-all",
                  isActive ? "opacity-100" : "opacity-80"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
