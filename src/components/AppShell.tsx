'use client';

import {useEffect, useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {signOut, useSession} from "next-auth/react";
import {Config} from "@/config";
import {UserRole} from "@/types/user";
import Icon, {IconName} from "@/components/Icon";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Counter',
    items: [
      {href: '/', label: 'Dashboard', icon: 'dashboard'},
      {href: '/billing', label: 'New Bill', icon: 'receipt'},
      {href: '/billing/history', label: 'Bill History', icon: 'history'},
    ],
  },
  {
    label: 'Catalog',
    items: [
      {href: '/menu', label: 'Menu Items', icon: 'utensils'},
      {href: '/categories', label: 'Categories', icon: 'tag'},
    ],
  },
];

const ADMIN_NAV: NavItem[] = [
  {href: '/admin/customers', label: 'Customers', icon: 'users'},
  {href: '/admin/users', label: 'Users', icon: 'shield'},
];

type Theme = 'light' | 'dark';

export default function AppShell({children}: { children: React.ReactNode }) {
  const pathname: string = usePathname();
  const {data: session} = useSession();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>('light');

  const isSuperAdmin: boolean = session?.user?.role === UserRole.SUPER_ADMIN;
  const userName: string = session?.user?.name || session?.user?.email || 'Account';
  const initials: string = userName.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate persisted prefs after mount to avoid SSR mismatch */
    try {
      setCollapsed(localStorage.getItem('thlush:collapsed') === '1');
      const saved = localStorage.getItem('thlush:theme') as Theme | null;
      const resolved: Theme = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(resolved);
    } catch {
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('thlush:theme', next);
    } catch {
    }
  };

  const toggleCollapsed = () => {
    setCollapsed((c: boolean) => {
      try {
        localStorage.setItem('thlush:collapsed', c ? '0' : '1');
      } catch {
      }
      return !c;
    });
  };

  if (pathname === '/login') return <>{children}</>;

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    if (href === '/billing') return pathname === '/billing';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderLink = (item: NavItem, compact: boolean) => {
    const active: boolean = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={compact ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 h-9 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 ${
          active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-sunken hover:text-ink'
        } ${compact ? 'justify-center px-0' : ''}`}
      >
        {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-accent"/>}
        <Icon name={item.icon} size={17}/>
        {!compact && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={`flex items-center h-14 shrink-0 ${compact ? 'justify-center' : 'px-4 gap-2.5'}`}>
        <div className="grid place-items-center size-8 rounded-[9px] bg-accent text-accent-ink font-semibold text-[15px] tracking-tight">
          {Config.app_name.charAt(0)}
        </div>
        {!compact && (
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-[-0.01em]">{Config.app_name}</div>
            <div className="text-[11px] text-ink-3">Billing counter</div>
          </div>
        )}
      </div>

      {/* Primary action */}
      <div className={`py-2 ${compact ? 'px-3' : 'px-3'}`}>
        <Link
          href="/billing"
          title="New bill"
          className={`btn btn-primary w-full ${compact ? 'btn-icon' : ''}`}
        >
          <Icon name="plus" size={16}/>
          {!compact && 'New bill'}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-1">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4">
            {!compact && <div className="eyebrow px-2.5 mb-1.5">{group.label}</div>}
            <div className="flex flex-col gap-0.5">{group.items.map((i: NavItem) => renderLink(i, compact))}</div>
          </div>
        ))}
        {isSuperAdmin && (
          <div className="mb-4">
            {!compact && <div className="eyebrow px-2.5 mb-1.5">Admin</div>}
            {compact && <hr className="rule-dash my-2"/>}
            <div className="flex flex-col gap-0.5">{ADMIN_NAV.map((i: NavItem) => renderLink(i, compact))}</div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-line p-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className={`btn btn-ghost ${compact ? 'btn-icon' : 'justify-start'}`}
          title="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16}/>
          {!compact && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>
        <div className={`flex items-center gap-2.5 rounded-lg ${compact ? 'justify-center py-1' : 'px-1.5 py-1.5'}`}>
          <Link href="/profile" title="Profile" className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="grid place-items-center size-8 shrink-0 rounded-full bg-sunken text-ink-2 text-[11px] font-semibold shadow-ring">
              {initials || <Icon name="user" size={14}/>}
            </div>
            {!compact && (
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-medium">{userName}</div>
                <div className="text-[11px] text-ink-3">{isSuperAdmin ? 'Super Admin' : 'Billing'}</div>
              </div>
            )}
          </Link>
          {!compact && (
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => signOut({callbackUrl: '/login'})}
            >
              <Icon name="logout" size={15}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar: same canvas as content, hairline divider */}
      <aside
        className="hidden lg:block fixed inset-y-0 left-0 z-30 border-r border-line bg-canvas transition-[width] duration-200"
        style={{width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)', transitionTimingFunction: 'var(--ease-out)'}}
      >
        {sidebar(collapsed)}
      </aside>

      {/* Mobile topbar */}
      <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur">
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <Icon name="menu" size={20}/>
        </button>
        <div className="text-[14px] font-semibold tracking-[-0.01em]">{Config.app_name}</div>
        <Link href="/billing" className="btn btn-primary btn-icon" aria-label="New bill"><Icon name="plus" size={16}/></Link>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}/>
          <div className="pop absolute inset-y-0 left-0 w-[272px] bg-canvas border-r border-line" style={{transformOrigin: 'left center'}} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMobileOpen(false); }}>
            {sidebar(false)}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="transition-[padding] duration-200 lg:pl-[var(--pl)]"
        style={{['--pl' as string]: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)', transitionTimingFunction: 'var(--ease-out)'}}
      >
        <div className="hidden lg:flex h-14 items-center px-6">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name="panel" size={16}/>
          </button>
        </div>
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:pt-0 pt-5">
          {children}
        </main>
      </div>
    </div>
  );
}
