import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { BottomNav } from '@/components/bottom-nav';
import { TopBar } from '@/components/top-bar';
import { WalletProvider } from "@/components/wallet-provider";
import { ChatProvider } from "@/context/chat-context";
import { CurrencyProvider } from "@/context/currency-context";
import { ToastProvider } from "@/context/toast-context";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sendease',
  description: 'Scheduled recurring stablecoin remittance on Celo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground min-h-screen`} suppressHydrationWarning>
        <WalletProvider>
          <CurrencyProvider>
            <ToastProvider>
              <ChatProvider>
                <div className="min-h-screen flex flex-col items-center">
                  <div className="w-full max-w-md min-h-screen flex flex-col bg-white border-x border-slate-100 relative">
                    <TopBar />
                    <main className="flex-1 pt-20 pb-24 px-4 overflow-y-auto">
                      {children}
                    </main>
                    <BottomNav />
                  </div>
                </div>
              </ChatProvider>
            </ToastProvider>
          </CurrencyProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
