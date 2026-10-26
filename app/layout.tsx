import type { Metadata } from 'next';
import { IBM_Plex_Sans_KR, JetBrains_Mono } from 'next/font/google';
import { NavLink } from '@/components/ui/NavLink';
import { LayoutDashboard, PencilLine } from 'lucide-react';
import './globals.css';

const sans = IBM_Plex_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '채널 운영 지표 대시보드',
};

const navItems = [
  { href: '/', label: '대시보드', Icon: LayoutDashboard },
  { href: '/entry', label: '수동 입력', Icon: PencilLine },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <aside className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-[#14161f] flex-col">
          <div className="p-5 border-b border-white/10">
            <div className="text-white/35 text-[11px] font-mono tracking-[0.2em] uppercase mb-1">Briefing</div>
            <div className="text-white text-sm font-semibold tracking-tight">채널 운영 지표</div>
          </div>
          <nav className="flex flex-col py-2 flex-1">
            {navItems.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href}>
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <header className="md:hidden sticky top-0 z-10 bg-[#14161f] text-white px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">채널 운영 지표</div>
          <nav className="flex items-center gap-4">
            {navItems.map(({ href, label }) => (
              <a key={href} href={href} className="text-xs text-white/70 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
        </header>

        <main className="md:ml-52 min-h-screen bg-[var(--paper)] p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
