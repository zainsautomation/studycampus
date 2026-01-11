import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  posts_enabled: boolean;
  qa_enabled: boolean;
  requests_enabled: boolean;
  downloads_enabled: boolean;
}

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
      };
      
      data?.forEach((setting: { key: string; value: unknown }) => {
        if (setting.key in settingsMap) {
          settingsMap[setting.key as keyof AppSettings] = setting.value as boolean;
        }
      });
      
      return settingsMap;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: value })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });

  return {
    settings: settings ?? {
      posts_enabled: true,
      qa_enabled: true,
      requests_enabled: true,
      downloads_enabled: true,
    },
    isLoading,
    updateSetting,
    postsEnabled: settings?.posts_enabled ?? true,
    qaEnabled: settings?.qa_enabled ?? true,
    requestsEnabled: settings?.requests_enabled ?? true,
    downloadsEnabled: settings?.downloads_enabled ?? true,
  };
}
