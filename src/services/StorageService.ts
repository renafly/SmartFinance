import { supabase } from '../shared/lib/supabase/client';

type UploadFile = Blob | ArrayBuffer | FormData;

export const StorageService = {
  async upload(
    bucket: string,
    path: string,
    file: UploadFile,
    options: { contentType?: string; upsert?: boolean } = {},
  ) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: options.contentType,
      upsert: options.upsert ?? false,
    });
    if (error) throw error;
    return data;
  },

  async createSignedUrl(bucket: string, path: string, expiresInSeconds = 300) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async download(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  },

  async remove(bucket: string, paths: string[]) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  },
};
