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
        <aside className="fixed left-0 top-0 h-full w-52 bg-[#0a0a0a] flex flex-col">
          <div className="p-5 border-b border-white/10">
            <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-1">Admin</div>
            <div className="text-white text-sm font-semibold">채널 운영 지표</div>
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
        <main className="ml-52 min-h-screen bg-[#f5f5f5] p-8">{children}</main>
      </body>
    </html>
  );
}
