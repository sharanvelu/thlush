'use client';

import {useEffect, useState} from "react";
import {AdminUser as TypeAdminUser, CreateUserDto as TypeCreateUserDto, UpdateUserDto as TypeUpdateUserDto} from "@/types/user";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse, ApiDeleteResponse as TypeApiDeleteResponse} from "@/types/global";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<TypeAdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<TypeAdminUser | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const response: Response = await fetch('/api/admin/users');
    const data: TypeApiListResponse<TypeAdminUser> = await response.json();

    if (data.success) {
      setUsers(data.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setEditingUser(null);
  };

  const startEdit = (user: TypeAdminUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Update
        const dto: TypeUpdateUserDto = {};
        if (name !== editingUser.name) dto.name = name;
        if (email !== editingUser.email) dto.email = email;
        if (password) dto.password = password;

        if (!dto.name && !dto.email && !dto.password) {
          toast.error('No changes to save');
          setIsSubmitting(false);
          return;
        }

        const response: Response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(dto),
        });
        const data: TypeApiResponse<TypeAdminUser> = await response.json();

        if (!data.success) {
          toast.error(data.error || 'Failed to update user');
          return;
        }

        toast.success('User updated successfully!');
      } else {
        // Create
        if (!name || !email || !password) {
          toast.error('Name, email and password are required');
          setIsSubmitting(false);
          return;
        }

        const dto: TypeCreateUserDto = {name, email, password};

        const response: Response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(dto),
        });
        const data: TypeApiResponse<TypeAdminUser> = await response.json();

        if (!data.success) {
          toast.error(data.error || 'Failed to create user');
          return;
        }

        toast.success('User created successfully!');
      }

      clearForm();
      await fetchUsers();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: TypeAdminUser) => {
    if (!window.confirm(`Are you sure you want to delete ${user.email}?`)) return;

    setDeletingUserId(user.id);

    try {
      const response: Response = await fetch(`/api/admin/users/${user.id}`, {method: 'DELETE'});
      const data: TypeApiDeleteResponse = await response.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to delete user');
        return;
      }

      toast.success('User deleted successfully!');
      await fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Add / Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8"
        >
          <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                Name
              </label>
              <input
                type="text"
                id="name"
                placeholder="Enter full name"
                className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!editingUser}
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter email address"
                className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!editingUser}
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                Password {editingUser && <span className="font-normal text-gray-400">(leave blank to keep unchanged)</span>}
              </label>
              <input
                type="password"
                id="password"
                placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingUser}
                minLength={6}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-5">
            {editingUser && (
              <button
                type="button"
                className="inline-flex items-center bg-red-400 text-white border-none rounded-xl py-2 px-6 font-semibold cursor-pointer"
                onClick={clearForm}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center bg-linear-120 from-[#28a745] to-[#20c997] text-white border-none rounded-xl py-2 px-6 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{boxShadow: "0 8px 20px rgba(40,167,69,.3)"}}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{editingUser ? 'Update' : 'Create'} User</>
              )}
            </button>
          </div>
        </form>

        {/* Users List */}
        <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
          <h2 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Manage Users
          </h2>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({length: 3}).map((_, i) => (
                <div
                  key={i}
                  className="shadow-lg border-2 border-solid border-[#f0e6dd] dark:border-gray-600 rounded-2xl p-4.5 bg-[#fffbf6] dark:bg-gray-950 flex justify-between items-center animate-pulse"
                >
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3.5 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {users.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">No users found.</p>
              )}

              <div className="flex flex-col gap-4">
                {users.map((user: TypeAdminUser) => (
                  <div
                    key={user.id}
                    className="shadow-lg border-2 border-solid border-[#f0e6dd] dark:border-gray-600 rounded-2xl p-4.5 bg-[#fffbf6] dark:bg-gray-950 flex flex-wrap justify-between items-center gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <h4 className="m-0 text-lg text-gray-900 dark:text-white">{user.name || user.email}</h4>
                      {user.name && (
                        <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>Created: {formatDate(user.created_at)}</span>
                        <span>Last login: {formatDate(user.last_sign_in_at)}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        className={`from-[#008559] via-[#006ce0] to-[#6842ff] text-[#dc3545] dark:text-white border-2 border-[#dc3545] rounded-xl px-5 py-2 text-sm font-semibold cursor-pointer hover:scale-105 active:scale-95 hover:bg-linear-to-br hover:text-white ${deletingUserId === user.id ? 'cursor-not-allowed' : ''}`}
                        style={{transition: "transform 0.15s"}}
                        onClick={() => startEdit(user)}
                        disabled={deletingUserId === user.id}
                      >
                        Edit
                      </button>
                      <button
                        className={`flex items-center bg-[#dc3545] text-white border-none rounded-xl px-5 py-2 text-sm font-semibold ${deletingUserId === user.id ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                        style={{transition: "transform 0.15s"}}
                        onClick={() => handleDelete(user)}
                        disabled={deletingUserId === user.id}
                      >
                        {deletingUserId === user.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Removing
                          </>
                        ) : (
                          <>Remove</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
