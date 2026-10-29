'use client';

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {AdminUser as TypeAdminUser, UserRole, UserRoleLabels} from "@/types/user";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import Link from "next/link";
import Icon from "@/components/Icon";

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

  const rows: {label: string; value: string}[] = user ? [
    {label: 'Name', value: user.name || '-'},
    {label: 'Email', value: user.email},
    {label: 'Role', value: UserRoleLabels[user.role]},
    {label: 'Created at', value: formatDate(user.created_at)},
    {label: 'Last login', value: formatDate(user.last_sign_in_at)},
  ] : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink">
        <Icon name="chevronLeft" size={15}/>
        Back to users
      </Link>

      {isLoading ? (
        <div className="card card-pad">
          <div className="mb-6 flex items-center gap-3">
            <div className="skeleton size-12 !rounded-full"></div>
            <div className="skeleton h-6 w-48"></div>
          </div>
          <div className="flex flex-col gap-5">
            {Array.from({length: 5}).map((_, i) => (
              <div key={i}>
                <div className="skeleton mb-2 h-3 w-20"></div>
                <div className="skeleton h-4 w-64 max-w-full"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card empty">
          <Icon name="alert" size={26} className="text-bad"/>
          <p className="mb-2 font-medium text-bad">{error}</p>
          <button onClick={() => router.push('/admin/users')} className="btn btn-secondary">
            Go back
          </button>
        </div>
      ) : user && (
        <div className="card rise overflow-hidden">
          <div className="flex items-center gap-3.5 border-b border-line p-5">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
              {(user.name || user.email || '?').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-[-0.02em]">{user.name || user.email}</h1>
              <span className={`badge mt-1 ${user.role === UserRole.SUPER_ADMIN ? 'badge-accent' : 'badge-info'}`}>
                {UserRoleLabels[user.role]}
              </span>
            </div>
          </div>

          <dl className="m-0 divide-y divide-line">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <dt className="eyebrow sm:w-32 sm:shrink-0">{row.label}</dt>
                <dd className="m-0 min-w-0 break-words text-sm text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
