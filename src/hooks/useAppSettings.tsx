import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface AppSettings {
  posts_enabled: boolean;
  qa_enabled: boolean;
  requests_enabled: boolean;
  downloads_enabled: boolean;
  anonymous_posts_enabled: boolean;
  default_storage_type: 'supabase' | 'google_drive';
  google_drive_default_folder_id: string | null;
  google_drive_default_folder_name: string | null;
  google_drive_auto_organize_by_subject: boolean;
  post_images_storage_type: 'supabase' | 'google_drive';
  post_images_google_drive_folder_id: string | null;
}

type SettingValue = boolean | string | null;

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settingsMap: AppSettings = {
        posts_enabled: true,
        qa_enabled: true,
        requests_enabled: true,
        downloads_enabled: true,
        anonymous_posts_enabled: true,
        default_storage_type: 'supabase',
        google_drive_default_folder_id: null,
        google_drive_default_folder_name: null,
        google_drive_auto_organize_by_subject: true,
        post_images_storage_type: 'supabase',
        post_images_google_drive_folder_id: null,
      };
      
      data?.forEach((setting: { key: string; value: Json }) => {
        const key = setting.key as keyof AppSettings;
        if (key in settingsMap) {
          // Handle values directly - they're stored as proper JSON types now
          const value = setting.value;
          if (value === null) {
            (settingsMap as any)[key] = null;
          } else if (typeof value === 'string') {
            // Check if it's a JSON-encoded string (legacy data with extra quotes)
            if (value.startsWith('"') && value.endsWith('"')) {
              try {
                (settingsMap as any)[key] = JSON.parse(value);
              } catch {
                (settingsMap as any)[key] = value;
              }
            } else {
              (settingsMap as any)[key] = value;
            }
          } else {
            (settingsMap as any)[key] = value;
          }
        }
      });
      
      return settingsMap;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: SettingValue }) => {
      // Store the value properly - null stays as null, strings get quoted, booleans stay as-is
      let jsonValue: Json;
      if (value === null) {
        jsonValue = null;
      } else if (typeof value === 'string') {
        jsonValue = value; // Store strings directly without extra quotes
      } else {
        jsonValue = value;
      }
      
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: jsonValue })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ key, value: jsonValue });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });

  const defaultSettings: AppSettings = {
    posts_enabled: true,
    qa_enabled: true,
    requests_enabled: true,
    downloads_enabled: true,
    anonymous_posts_enabled: true,
    default_storage_type: 'supabase',
    google_drive_default_folder_id: null,
    google_drive_default_folder_name: null,
    google_drive_auto_organize_by_subject: true,
    post_images_storage_type: 'supabase',
    post_images_google_drive_folder_id: null,
  };

  return {
    settings: settings ?? defaultSettings,
    isLoading,
    updateSetting,
    postsEnabled: settings?.posts_enabled ?? true,
    qaEnabled: settings?.qa_enabled ?? true,
    requestsEnabled: settings?.requests_enabled ?? true,
    downloadsEnabled: settings?.downloads_enabled ?? true,
    anonymousPostsEnabled: settings?.anonymous_posts_enabled ?? true,
    defaultStorageType: settings?.default_storage_type ?? 'supabase',
    googleDriveDefaultFolderId: settings?.google_drive_default_folder_id ?? null,
    googleDriveDefaultFolderName: settings?.google_drive_default_folder_name ?? null,
    googleDriveAutoOrganize: settings?.google_drive_auto_organize_by_subject ?? true,
    postImagesStorageType: settings?.post_images_storage_type ?? 'supabase',
    postImagesGoogleDriveFolderId: settings?.post_images_google_drive_folder_id ?? null,
  };
}
