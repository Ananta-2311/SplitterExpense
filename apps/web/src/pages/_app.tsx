'use client';

import type { AppProps } from 'next/app';
import Navbar from '../components/Navbar';
import { SyncProvider } from '../lib/useSync';
import { ThemeProvider } from '../lib/useTheme';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <SyncProvider>
        <Navbar />
        <Component {...pageProps} />
      </SyncProvider>
    </ThemeProvider>
  );
}
