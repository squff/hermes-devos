import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Hermes-DevOS',
  description: 'AI-Native Development Operating System - 8 Engines for intelligent software development',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="main-layout">
          {children}
        </main>
      </body>
    </html>
  );
}
