import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Transacoes',
  description: 'Dashboard de transacoes financeiras',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
