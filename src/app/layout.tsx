import type { Metadata, Viewport } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PRDin — Visual PRD & Business Flow Studio',
  description:
    'Bantu user awam dan UI/UX Designer menyusun PRD, UX Research, dan struktur flow kerja bisnis dari 5 pertanyaan adaptif hingga workspace interaktif.',
};

export const viewport: Viewport = {
  themeColor: '#0E0E0E',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${interTight.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-dvh bg-[#0E0E0E] font-sans text-white antialiased selection:bg-[#2F6BFF]/35 selection:text-white">
        {children}
      </body>
    </html>
  );
}
