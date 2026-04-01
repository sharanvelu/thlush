'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
            <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
              Food Order Billing
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
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
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
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
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
        </div>
      </div>
    </nav>
  );
}