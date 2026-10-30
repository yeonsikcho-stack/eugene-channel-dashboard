'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface NavGroupItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface NavGroupProps {
  href: string;
  label: string;
  icon: ReactNode;
  items: NavGroupItem[];
}

export function NavGroup({ href, label, icon, items }: NavGroupProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const isActive = pathname === href;
  const hasItems = items.length > 0;

  return (
    <div className="mx-2">
      <div className="flex items-center gap-1">
        <Link
          href={href}
          className={clsx(
            'flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
            isActive
              ? 'bg-white/15 text-white font-medium'
              : 'text-gray-300 hover:bg-white/10 hover:text-white',
          )}
        >
          {icon}
          {label}
        </Link>
        {hasItems && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label={open ? '카테고리 접기' : '카테고리 펼치기'}
            className="p-1.5 rounded-md text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ChevronDown size={14} className={clsx('transition-transform', !open && '-rotate-90')} />
          </button>
        )}
      </div>

      {hasItems && open && (
        <div className="mt-0.5 ml-[22px] pl-2 border-l border-white/10 flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-colors',
                  active
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
