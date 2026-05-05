'use client';

import {useEffect, useState} from "react";
import {signOut} from "next-auth/react";
import {AdminUser as TypeAdminUser, UserRole, UserRoleLabels} from "@/types/user";
import {ApiResponse as TypeApiResponse} from "@/types/global";

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

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">

        <h1 className="m-0 mb-8 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Profile
        </h1>

        {/* User Info */}
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="m-0 mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Details</h2>

          {isLoading ? (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">Name</span>
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      className="flex-1 p-2 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-sm focus:outline-none focus:border-[#ff7a18]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isUpdatingName}
                    />
                    <button
                      onClick={handleNameSave}
                      disabled={isUpdatingName}
                      className="text-sm font-semibold text-white bg-[#28a745] border-none rounded-xl px-4 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setIsEditingName(false); setName(user?.name ?? ''); setNameError(''); setNameSuccess(''); }}
                      className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-transparent border-2 border-solid border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-white">{user?.name || '-'}</span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-[#ff7a18] bg-transparent border-none cursor-pointer font-medium hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              {nameError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-2 rounded">
                  <p className="text-sm text-red-700 dark:text-red-300 m-0">{nameError}</p>
                </div>
              )}
              {nameSuccess && (
                <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-2 rounded">
                  <p className="text-sm text-green-700 dark:text-green-300 m-0">{nameSuccess}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">Email</span>
                <span className="text-sm text-gray-900 dark:text-white">{user?.email ?? '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">Role</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                  user?.role === UserRole.SUPER_ADMIN
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {UserRoleLabels[user?.role ?? UserRole.BILLING]}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">Member Since</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})
                    : '-'
                  }
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">Last Sign In</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})
                    : '-'
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="m-0 mb-4 text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>

          {passwordError && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 mb-4 rounded">
              <p className="text-sm text-red-700 dark:text-red-300 m-0">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-3 mb-4 rounded">
              <p className="text-sm text-green-700 dark:text-green-300 m-0">{passwordSuccess}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new_password" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                New Password
              </label>
              <input
                type="password"
                id="new_password"
                placeholder="Enter new password"
                className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isUpdating}
              />
            </div>

            <div>
              <label htmlFor="confirm_password" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm_password"
                placeholder="Confirm new password"
                className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isUpdating}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isUpdating}
                className="border-none rounded-2xl px-6 py-3 text-[15px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
              >
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Sign Out */}
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
          <h2 className="m-0 mb-2 text-lg font-semibold text-gray-900 dark:text-white">Sign Out</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0 mb-4">Sign out from your account on this device.</p>
          <button
            onClick={handleSignOut}
            className="rounded-[14px] px-5 py-2.5 text-[15px] font-semibold border-2 border-solid border-red-400 text-red-600 dark:text-red-400 bg-transparent cursor-pointer hover:bg-red-50 dark:hover:bg-gray-700 transition"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
