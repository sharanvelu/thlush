'use client';

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {AdminUser as TypeAdminUser, UserRole, UserRoleLabels} from "@/types/user";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import Link from "next/link";

export default function AdminUserViewPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.user_id as string;

  const [user, setUser] = useState<TypeAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const response: Response = await fetch(`/api/admin/users/${userId}`);
        const data: TypeApiResponse<TypeAdminUser> = await response.json();

        if (data.success) {
          setUser(data.data);
        } else {
          setError(data.error || 'Failed to fetch user');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser().then();
  }, [userId]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">

        {/* Back link */}
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 no-underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to Users
        </Link>

        {isLoading ? (
          <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 animate-pulse">
            <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="flex flex-col gap-5">
              {Array.from({length: 5}).map((_, i) => (
                <div key={i}>
                  <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 text-center">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/admin/users')}
              className="inline-flex items-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-none rounded-xl py-2 px-5 font-semibold cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Go Back
            </button>
          </div>
        ) : user && (
          <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <h1 className="m-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {user.name || user.email}
              </h1>
              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                user.role === UserRole.SUPER_ADMIN
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {UserRoleLabels[user.role]}
              </span>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Name
                </span>
                <span className="text-base text-gray-900 dark:text-white">
                  {user.name || '-'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Email
                </span>
                <span className="text-base text-gray-900 dark:text-white">
                  {user.email}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Role
                </span>
                <span className="text-base text-gray-900 dark:text-white">
                  {UserRoleLabels[user.role]}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Created At
                </span>
                <span className="text-base text-gray-900 dark:text-white">
                  {formatDate(user.created_at)}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Last Login
                </span>
                <span className="text-base text-gray-900 dark:text-white">
                  {formatDate(user.last_sign_in_at)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
