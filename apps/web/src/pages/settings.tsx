import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAccessToken, apiClient } from '../lib/auth';
import { useSync } from '../lib/useSync';
import { performSync } from '../lib/sync';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface Preferences {
  aiCategorization: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { isSyncing } = useSync();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileError, setProfileError] = useState('');

  // Password state
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '' });

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    aiCategorization: true,
    emailNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileData, categoriesData, preferencesData] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getCategories(),
        apiClient.getPreferences(),
      ]);

      setProfile({ name: profileData.data.name, email: profileData.data.email });
      setCategories(categoriesData.data);
      setPreferences(preferencesData.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileError('');

    try {
      await apiClient.updateProfile(profile);
      alert('Profile updated successfully!');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password.new !== password.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (password.new.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await apiClient.changePassword({
        currentPassword: password.current,
        newPassword: password.new,
      });
      alert('Password changed successfully!');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;

    try {
      const category = await apiClient.createCategory(newCategory);
      setCategories([...categories, category.data]);
      setNewCategory({ name: '', description: '', color: '' });
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category');
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      const updated = await apiClient.updateCategory(category.id, {
        name: category.name,
        description: category.description,
        color: category.color,
      });
      setCategories(categories.map((c) => (c.id === category.id ? updated.data : c)));
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await apiClient.deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const handleUpdatePreferences = async (updates: Partial<Preferences>) => {
    try {
      const updated = await apiClient.updatePreferences(updates);
      setPreferences(updated.data);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await performSync();
      alert('Sync completed successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
                  required
                />
              </div>
              {profileError && (
                <div className="text-red-600 dark:text-red-400 text-sm">{profileError}</div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Change Password
          </h2>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
                  required
                />
              </div>
              {passwordError && (
                <div className="text-red-600 dark:text-red-400 text-sm">{passwordError}</div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Categories Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Categories
          </h2>

          {/* Create Category Form */}
          <form onSubmit={handleCreateCategory} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2"
              />
              <input
                type="color"
                value={newCategory.color || '#4F46E5'}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 rounded-md h-10"
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              Add Category
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                {editingCategory?.id === category.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, name: e.target.value })
                      }
                      className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-2 py-1"
                    />
                    <input
                      type="text"
                      value={editingCategory.description || ''}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, description: e.target.value })
                      }
                      className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-2 py-1"
                    />
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingCategory.color || '#4F46E5'}
                        onChange={(e) =>
                          setEditingCategory({ ...editingCategory, color: e.target.value })
                        }
                        className="border border-gray-300 dark:border-gray-600 rounded-md h-8"
                      />
                      <button
                        onClick={() => handleUpdateCategory(editingCategory)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {category.color && (
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="text-gray-900 dark:text-white">{category.name}</span>
                      {category.description && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {category.description}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-indigo-600 dark:text-indigo-400 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 dark:text-red-400 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  AI Categorization
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically categorize transactions using AI
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.aiCategorization}
                  onChange={(e) =>
                    handleUpdatePreferences({ aiCategorization: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive email notifications
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) =>
                    handleUpdatePreferences({ emailNotifications: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive push notifications
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.pushNotifications}
                  onChange={(e) =>
                    handleUpdatePreferences({ pushNotifications: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Sync Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sync</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {isSyncing
                  ? 'Syncing in background...'
                  : 'Manually sync your data across all devices'}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || isSyncing}
              className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
            >
              {syncing || isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
