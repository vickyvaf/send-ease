import type { Metadata, Viewport } from 'next';
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
  title: 'Sendease - Automated Stablecoin Remittance on Celo',
  description: 'Automated, scheduled stablecoin remittance for MiniPay. Set up recurring payments on the Celo network easily using natural language prompts.',
  applicationName: 'Sendease',
  keywords: ['Sendease', 'Remittance', 'Celo', 'MiniPay', 'Stablecoin', 'Automated Payments', 'USDm', 'Web3', 'Remittance Agent'],
  authors: [{ name: 'Sendease Team' }],
  creator: 'Sendease',
  publisher: 'Sendease',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Sendease - Automated Stablecoin Remittance on Celo',
    description: 'Automated, scheduled stablecoin remittance for MiniPay. Set up recurring payments on the Celo network easily.',
    url: 'https://sendease.vercel.app',
    siteName: 'Sendease',
    images: [
      {
        url: '/logo.png',
        width: 500,
        height: 500,
        alt: 'Sendease - Automated Remittance on Celo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sendease - Automated Stablecoin Remittance on Celo',
    description: 'Automated, scheduled stablecoin remittance for MiniPay. Set up recurring payments on the Celo network easily.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09955F',
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
                  <div className="w-full max-w-md min-h-screen flex flex-col bg-white border-x border-slate-200 relative">
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
