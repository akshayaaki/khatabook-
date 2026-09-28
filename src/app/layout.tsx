import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Personal Khata — Digital Money Ledger',
  description: 'Private single-owner personal money ledger and customer khata tracking system.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#EB5E28',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#EB5E28',
          borderRadius: '0.75rem',
        },
      }}
    >
      <html lang="en" className="bg-slate-50">
        <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-[#EB5E28] selection:text-white">
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
