import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getAccessToken, apiClient } from '../src/lib/auth';
import { useTheme } from '../src/lib/useTheme';
import { createThemedStyles } from '../src/lib/createThemedStyles';
import { performSync } from '../src/lib/sync';
import { useSync } from '../src/lib/useSync';

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

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isSyncing } = useSync();
  const styles = getStyles(colors);
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
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#4F46E5' });
  const [showNewCategory, setShowNewCategory] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    aiCategorization: true,
    emailNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/screens/LoginScreen');
        return;
      }
      await fetchData();
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      apiClient.setAccessToken(token);

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

  const handleUpdateProfile = async () => {
    setSaving(true);
    setProfileError('');

    try {
      await apiClient.updateProfile(profile);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
      Alert.alert('Error', profileError);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (password.new !== password.confirm) {
      setPasswordError('New passwords do not match');
      Alert.alert('Error', passwordError);
      return;
    }

    if (password.new.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      Alert.alert('Error', passwordError);
      return;
    }

    setSaving(true);
    try {
      await apiClient.changePassword({
        currentPassword: password.current,
        newPassword: password.new,
      });
      Alert.alert('Success', 'Password changed successfully!');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
      Alert.alert('Error', passwordError);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    try {
      const category = await apiClient.createCategory(newCategory);
      setCategories([...categories, category.data]);
      setNewCategory({ name: '', description: '', color: '#4F46E5' });
      setShowNewCategory(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create category');
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
      Alert.alert('Error', 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert('Delete Category', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteCategory(id);
            setCategories(categories.filter((c) => c.id !== id));
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete category');
          }
        },
      },
    ]);
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
      Alert.alert('Success', 'Sync completed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
          {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Update Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={password.current}
              onChangeText={(text) => setPassword({ ...password, current: text })}
              secureTextEntry
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={password.new}
              onChangeText={(text) => setPassword({ ...password, new: text })}
              secureTextEntry
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={password.confirm}
              onChangeText={(text) => setPassword({ ...password, confirm: text })}
              secureTextEntry
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Changing...' : 'Change Password'}</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity
              onPress={() => setShowNewCategory(!showNewCategory)}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {showNewCategory && (
            <View style={styles.newCategoryContainer}>
              <TextInput
                style={styles.input}
                placeholder="Category name"
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
                placeholderTextColor={colors.inputPlaceholder}
              />
              <TextInput
                style={styles.input}
                placeholder="Description (optional)"
                value={newCategory.description}
                onChangeText={(text) => setNewCategory({ ...newCategory, description: text })}
                placeholderTextColor={colors.inputPlaceholder}
              />
              <View style={styles.colorPickerContainer}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorPickerRow}>
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: newCategory.color },
                    ]}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newCategory.color}
                    onChangeText={(text) => setNewCategory({ ...newCategory, color: text })}
                    placeholder="#4F46E5"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                </View>
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowNewCategory(false);
                    setNewCategory({ name: '', description: '', color: '#4F46E5' });
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleCreateCategory}>
                  <Text style={styles.buttonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              {editingCategory?.id === category.id ? (
                <View style={styles.editCategoryContainer}>
                  <TextInput
                    style={styles.input}
                    value={editingCategory.name}
                    onChangeText={(text) =>
                      setEditingCategory({ ...editingCategory, name: text })
                    }
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <TextInput
                    style={styles.input}
                    value={editingCategory.description || ''}
                    onChangeText={(text) =>
                      setEditingCategory({ ...editingCategory, description: text })
                    }
                    placeholder="Description"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setEditingCategory(null)}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={() => handleUpdateCategory(editingCategory)}
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    {category.color && (
                      <View
                        style={[styles.colorDot, { backgroundColor: category.color }]}
                      />
                    )}
                    <View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      {category.description && (
                        <Text style={styles.categoryDescription}>{category.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      onPress={() => setEditingCategory(category)}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(category.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>AI Categorization</Text>
              <Text style={styles.preferenceDescription}>
                Automatically categorize transactions using AI
              </Text>
            </View>
            <Switch
              value={preferences.aiCategorization}
              onValueChange={(value) => handleUpdatePreferences({ aiCategorization: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.backgroundSecondary}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Email Notifications</Text>
              <Text style={styles.preferenceDescription}>Receive email notifications</Text>
            </View>
            <Switch
              value={preferences.emailNotifications}
              onValueChange={(value) => handleUpdatePreferences({ emailNotifications: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.backgroundSecondary}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Push Notifications</Text>
              <Text style={styles.preferenceDescription}>Receive push notifications</Text>
            </View>
            <Switch
              value={preferences.pushNotifications}
              onValueChange={(value) => handleUpdatePreferences({ pushNotifications: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.backgroundSecondary}
            />
          </View>
        </View>

        {/* Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync</Text>
          <Text style={styles.syncDescription}>
            {isSyncing
              ? 'Syncing in background...'
              : 'Manually sync your data across all devices'}
          </Text>
          <TouchableOpacity
            style={[styles.button, (syncing || isSyncing) && styles.buttonDisabled]}
            onPress={handleSync}
            disabled={syncing || isSyncing}
          >
            <Text style={styles.buttonText}>
              {syncing || isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    padding: 20,
    paddingBottom: 10,
  },
  section: {
    backgroundColor: colors.card,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.inputText,
    backgroundColor: colors.input,
  },
  button: {
    height: 48,
    backgroundColor: colors.button,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  newCategoryContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  colorPickerContainer: {
    marginBottom: 12,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  categoryDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCategoryContainer: {
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 14,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: colors.buttonSecondary,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  syncDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
}));
