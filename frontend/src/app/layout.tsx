import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CyberGuard Dashboard',
  description: 'Distributed Security Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', background: '#0b1020', color: '#e6eefc' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ margin: 0 }}>CyberGuard</h1>
            <div style={{ opacity: 0.8 }}>Real-time Security Dashboard</div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
