import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pickletrip — Find Pickleball Games While Traveling',
  description: 'Find pickleball games at your level for any city and date range.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        {children}
      </body>
    </html>
  );
}
