'use client';

import {useEffect, useState} from "react";
import {
  AdminUser as TypeAdminUser,
  CreateUserDto as TypeCreateUserDto,
  UpdateUserDto as TypeUpdateUserDto,
  UserRole,
  UserRoleLabels
} from "@/types/user";
import {
  ApiListResponse as TypeApiListResponse,
  ApiResponse as TypeApiResponse,
  ApiDeleteResponse as TypeApiDeleteResponse
} from "@/types/global";
import {useSession} from "next-auth/react";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import Link from "next/link";
import SelectField from "@/components/Inputs/Select";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

export default function AdminUsersPage() {
  const {data: session} = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<TypeAdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<TypeAdminUser | null>(null);
  const currentUserId = session?.user?.id ?? null;

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.BILLING);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<TypeAdminUser | null>(null);

  const isEditingSelf = editingUser?.id === currentUserId;

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
    fetchUsers().then();
  }, []);

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole(UserRole.BILLING);
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const openCreate = () => {
    clearForm();
    setIsFormOpen(true);
  };

  const startEdit = (user: TypeAdminUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setIsFormOpen(true);
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
        if (role !== editingUser.role && !isEditingSelf) dto.role = role;

        if (!dto.name && !dto.email && !dto.password && !dto.role) {
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

        const dto: TypeCreateUserDto = {name, email, password, role};

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

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const user = userToDelete;
    setUserToDelete(null);
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

  const initial = (user: TypeAdminUser): string => (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage who can sign in and what they can do."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={16}/>
            Add user
          </button>
        }
      />

      <div className="card overflow-hidden rise">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
                <div className="skeleton size-9 shrink-0 !rounded-full"></div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skeleton h-3.5 w-40"></div>
                  <div className="skeleton h-3 w-56 max-w-full"></div>
                </div>
                <div className="skeleton hidden h-6 w-20 sm:block"></div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="empty">
            <Icon name="users" size={28} className="text-ink-4"/>
            <p className="font-medium text-ink-2">No users found</p>
            <p className="text-[13px]">Add the first user to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th className="hidden sm:table-cell">Role</th>
                  <th className="hidden md:table-cell">Created</th>
                  <th className="hidden md:table-cell">Last login</th>
                  <th className="r"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: TypeAdminUser) => {
                  const isRemoving = deletingUserId === user.id;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
                            {initial(user)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-ink">{user.name || user.email}</span>
                              {user.id === currentUserId && <span className="badge badge-good">You</span>}
                            </div>
                            {user.name && <div className="truncate text-xs text-ink-3">{user.email}</div>}
                            <span className={`badge mt-1 sm:hidden ${user.role === UserRole.SUPER_ADMIN ? 'badge-accent' : 'badge-info'}`}>{UserRoleLabels[user.role]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className={`badge ${user.role === UserRole.SUPER_ADMIN ? 'badge-accent' : 'badge-info'}`}>
                          {UserRoleLabels[user.role]}
                        </span>
                      </td>
                      <td className="num hidden text-xs text-ink-2 md:table-cell">{formatDate(user.created_at)}</td>
                      <td className="num hidden text-xs text-ink-2 md:table-cell">{formatDate(user.last_sign_in_at)}</td>
                      <td className="r">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/users/${user.id}`} className="btn btn-ghost btn-icon btn-sm hidden sm:inline-flex" title="View user" aria-label="View user">
                            <Icon name="chevronRight" size={15}/>
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit user"
                            aria-label="Edit user"
                            onClick={() => startEdit(user)}
                            disabled={isRemoving}
                          >
                            <Icon name="edit" size={15}/>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setUserToDelete(user)}
                            disabled={isRemoving || user.id === currentUserId}
                          >
                            {isRemoving ? 'Removing…' : (<><Icon name="trash" size={14}/><span className="hidden sm:inline">Remove</span></>)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit slide-over */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/45" onClick={clearForm}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editingUser ? 'Edit user' : 'Add user'}
            className="rise flex h-full w-full max-w-[420px] flex-col bg-raised shadow-pop"
          >
            <div className="card-head">
              <div>
                <div className="eyebrow">{editingUser ? 'Editing' : 'New'}</div>
                <h2 className="text-base font-semibold tracking-[-0.01em]">{editingUser ? 'Edit user' : 'Add user'}</h2>
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={clearForm} aria-label="Close">
                <Icon name="x" size={16}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-4">
                <label htmlFor="name" className="field-label">Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="Enter full name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!editingUser}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="field-label">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter email address"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={!editingUser}
                />
              </div>
              {/* Change Password - only visible on local env (staging/prod use SSO) */}
              {process.env.NEXT_PUBLIC_APP_ENV === 'local' && (
                <div className="mb-4">
                  <label htmlFor="password" className="field-label">
                    Password {editingUser && <span className="font-normal text-ink-3">(leave blank to keep unchanged)</span>}
                  </label>
                  <input
                    type="password"
                    id="password"
                    placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                    className="field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              )}
              <SelectField
                id="category_id"
                title="Role"
                disabled={isEditingSelf}
                titleHelperText={isEditingSelf ? '(You cannot change your own role.)' : ''}
                placeholder="Select Role"
                value={role}
                onchange={(name: string, value: string | number) => setRole(value as UserRole)}
                options={Object.values(UserRole).map((role: UserRole) => {
                  return {value: role, text: UserRoleLabels[role]}
                })}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-4">
              <button type="button" className="btn btn-secondary" onClick={clearForm}>Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                {isSubmitting ? (editingUser ? 'Updating…' : 'Creating…') : <>{editingUser ? 'Update' : 'Create'} user</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!userToDelete}
        title="Remove User"
        message={`Are you sure you want to delete ${userToDelete?.email}?`}
        variant="alert"
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
