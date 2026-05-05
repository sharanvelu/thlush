'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {Config} from "@/config";
import {UserRole} from "@/types/user";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [adminSubmenuOpen, setAdminSubmenuOpen] = useState<boolean>(false);
  const [mobileAdminSubmenuOpen, setMobileAdminSubmenuOpen] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname: string = usePathname();
  const applicationName: string = Config.app_name;
  const {data: session} = useSession();
  const isSuperAdmin: boolean = session?.user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node) &&
        mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);


  // Don't render Navbar on login page
  if (pathname === '/login') return null;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut({callbackUrl: '/login'});
  };

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname === href;
  };

  const linkClass = (href: string): string =>
    isActive(href)
      ? 'text-[#ff7a18] px-3 py-2 text-sm font-medium rounded-lg bg-orange-50 dark:bg-gray-800 transition duration-150'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150';

  const mobileLinkClass = (href: string): string =>
    isActive(href)
      ? 'text-[#ff7a18] block px-3 py-2 rounded-xl text-base font-medium bg-orange-50 dark:bg-gray-800 transition duration-150'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white block px-3 py-2 rounded-xl text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150';

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-90 z-50 backdrop-blur-sm py-1 shadow-sm">
      <div className="md:px-[2%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white">
              <Image src="/icon-192x192.png" alt={applicationName} width={32} height={32} className="rounded-lg" />
              {applicationName}
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <Link href="/billing" className={linkClass('/billing')}>
                Billing
              </Link>
              <Link href="/menu" className={linkClass('/menu')}>
                Manage Menu
              </Link>
              <Link href="/categories" className={linkClass('/categories')}>
                Manage Category
              </Link>
              <Link href="/billing/history" className={linkClass('/billing/history')}>
                Billing History
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); if (userMenuOpen) setAdminSubmenuOpen(false); }}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150 border-none cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setUserMenuOpen(false); setAdminSubmenuOpen(false); }} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition no-underline"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                      {isSuperAdmin && (
                        <div className="border-t border-gray-100 dark:border-gray-700">
                          <button
                            onClick={() => setAdminSubmenuOpen(!adminSubmenuOpen)}
                            className="flex items-center justify-between w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-none bg-transparent cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Admin
                            </span>
                            <svg className={`w-3.5 h-3.5 transition-transform ${adminSubmenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {adminSubmenuOpen && (
                            <div className="bg-gray-50 dark:bg-gray-900">
                              <Link
                                href="/admin/users"
                                onClick={() => { setUserMenuOpen(false); setAdminSubmenuOpen(false); }}
                                className="flex items-center gap-2 pl-10 pr-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition no-underline"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Users
                              </Link>
                              <Link
                                href="/admin/customers"
                                onClick={() => { setUserMenuOpen(false); setAdminSubmenuOpen(false); }}
                                className="flex items-center gap-2 pl-10 pr-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition no-underline"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Customers
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => { setUserMenuOpen(false); setAdminSubmenuOpen(false); handleSignOut(); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 transition border-none bg-transparent cursor-pointer text-left"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, toggle based on menu state */}
      <div ref={mobileMenuRef} className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-900 shadow-md rounded-b-2xl">
          <Link href="/billing" className={mobileLinkClass('/billing')}>
            Billing
          </Link>
          <Link href="/menu" className={mobileLinkClass('/menu')}>
            Manage Menu
          </Link>
          <Link href="/categories" className={mobileLinkClass('/categories')}>
            Manage Category
          </Link>
          <Link href="/billing/history" className={mobileLinkClass('/billing/history')}>
            Billing History
          </Link>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center gap-2 px-3 py-2 rounded-xl text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150 no-underline"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setMobileAdminSubmenuOpen(!mobileAdminSubmenuOpen)}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center justify-between w-full px-3 py-2 rounded-xl text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150 border-none bg-transparent cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${mobileAdminSubmenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileAdminSubmenuOpen && (
                  <>
                    <Link
                      href="/admin/users"
                      onClick={() => { setMobileMenuOpen(false); setMobileAdminSubmenuOpen(false); }}
                      className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-2 pl-10 pr-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150 no-underline"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Users
                    </Link>
                    <Link
                      href="/admin/customers"
                      onClick={() => { setMobileMenuOpen(false); setMobileAdminSubmenuOpen(false); }}
                      className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-2 pl-10 pr-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150 no-underline"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Customers
                    </Link>
                  </>
                )}
              </>
            )}
            <button
              onClick={handleSignOut}
              className="text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl text-base font-medium hover:bg-red-50 dark:hover:bg-gray-800 transition duration-150 border-none bg-transparent cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}