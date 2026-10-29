'use client';

import {useEffect, useState} from "react";
import {signOut} from "next-auth/react";
import {AdminUser as TypeAdminUser, UserRole, UserRoleLabels} from "@/types/user";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

export default function ProfilePage() {
  const [user, setUser] = useState<TypeAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Name edit
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then((data: TypeApiResponse<TypeAdminUser>) => {
        if (data.success && data.data) {
          setUser(data.data);
          setName(data.data.name);
        }
        setIsLoading(false);
      });
  }, []);

  const handleNameSave = async () => {
    setNameError('');
    setNameSuccess('');

    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }

    setIsUpdatingName(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name.trim()}),
      });
      const data: TypeApiResponse<TypeAdminUser> = await response.json();

      if (!data.success) {
        setNameError(data.error || 'Failed to update name');
        return;
      }

      setNameSuccess('Name updated successfully.');
      setIsEditingName(false);
      setUser(data.data);
    } catch {
      setNameError('An unexpected error occurred.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password: newPassword}),
      });
      const data: TypeApiResponse<TypeAdminUser> = await response.json();

      if (!data.success) {
        setPasswordError(data.error || 'Failed to update password');
        return;
      }

      setPasswordSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('An unexpected error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({callbackUrl: '/login'});
  };

  const fmtDate = (d: string | null | undefined, withTime = false): string => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', withTime
      ? {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}
      : {day: '2-digit', month: 'short', year: 'numeric'});
  };

  const initial: string = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and security."/>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Identity */}
        <div className="card rise overflow-hidden">
          <div className="card-head">
            <h2 className="card-title">Account details</h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton size-12 !rounded-full"></div>
                <div className="skeleton h-4 w-40"></div>
              </div>
              <div className="skeleton h-4 w-64 max-w-full"></div>
              <div className="skeleton h-4 w-48"></div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3.5 border-b border-line p-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-[-0.01em]">{user?.name || user?.email || '-'}</div>
                  <span className={`badge mt-1 ${user?.role === UserRole.SUPER_ADMIN ? 'badge-accent' : 'badge-info'}`}>
                    {UserRoleLabels[user?.role ?? UserRole.BILLING]}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-line">
                <div className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="eyebrow sm:w-28 sm:shrink-0">Name</span>
                  {isEditingName ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <input
                        type="text"
                        className="field min-w-0 flex-1"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isUpdatingName}
                      />
                      <button onClick={handleNameSave} disabled={isUpdatingName} className="btn btn-primary">
                        {isUpdatingName ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setIsEditingName(false); setName(user?.name ?? ''); setNameError(''); setNameSuccess(''); }}
                        className="btn btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-ink">{user?.name || '-'}</span>
                      <button onClick={() => setIsEditingName(true)} className="btn btn-ghost btn-icon btn-sm" aria-label="Edit name" title="Edit name">
                        <Icon name="edit" size={14}/>
                      </button>
                    </div>
                  )}
                </div>
                {nameError && (
                  <div className="flex items-center gap-2 bg-bad-soft px-5 py-2.5 text-[13px] text-bad">
                    <Icon name="alert" size={15} className="shrink-0"/>
                    <p>{nameError}</p>
                  </div>
                )}
                {nameSuccess && (
                  <div className="flex items-center gap-2 bg-good-soft px-5 py-2.5 text-[13px] text-good">
                    <Icon name="check" size={15} className="shrink-0"/>
                    <p>{nameSuccess}</p>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="eyebrow sm:w-28 sm:shrink-0">Email</span>
                  <span className="min-w-0 break-words text-sm text-ink">{user?.email ?? '-'}</span>
                </div>
                <div className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="eyebrow sm:w-28 sm:shrink-0">Member since</span>
                  <span className="text-sm text-ink">{fmtDate(user?.created_at)}</span>
                </div>
                <div className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="eyebrow sm:w-28 sm:shrink-0">Last sign in</span>
                  <span className="text-sm text-ink">{fmtDate(user?.last_sign_in_at, true)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="flex flex-col gap-5">
          {/* Change Password - only visible on local env (staging/prod use SSO) */}
          {process.env.NEXT_PUBLIC_APP_ENV === 'local' && (
            <div className="card rise overflow-hidden">
              <div className="card-head">
                <h2 className="card-title">Change password</h2>
                <Icon name="key" size={16} className="text-ink-3"/>
              </div>

              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 p-5">
                {passwordError && (
                  <div className="flex items-center gap-2 rounded-lg bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
                    <Icon name="alert" size={15} className="shrink-0"/>
                    <p>{passwordError}</p>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-good-soft px-3 py-2.5 text-[13px] text-good">
                    <Icon name="check" size={15} className="shrink-0"/>
                    <p>{passwordSuccess}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="new_password" className="field-label">New password</label>
                  <input
                    type="password"
                    id="new_password"
                    placeholder="Enter new password"
                    className="field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdating}
                  />
                </div>

                <div>
                  <label htmlFor="confirm_password" className="field-label">Confirm password</label>
                  <input
                    type="password"
                    id="confirm_password"
                    placeholder="Confirm new password"
                    className="field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isUpdating}
                  />
                </div>

                <div>
                  <button type="submit" disabled={isUpdating} className="btn btn-primary">
                    {isUpdating ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sign Out */}
          <div className="card rise card-pad">
            <h2 className="card-title">Sign out</h2>
            <p className="mb-4 mt-1 text-[13px] text-ink-3">Sign out from your account on this device.</p>
            <button onClick={handleSignOut} className="btn btn-danger">
              <Icon name="logout" size={15}/>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
