import { supabase } from '../shared/lib/supabase/client';

export const StorageService = {
  async upload(bucket: string, path: string, file: Blob | ArrayBuffer | FormData) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return data;
  },

  getPublicUrl(bucket: string, path: string) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  async remove(bucket: string, paths: string[]) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  },
};
