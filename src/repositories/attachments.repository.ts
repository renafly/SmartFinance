import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export class AttachmentsRepository extends BaseRepository<"attachments"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "attachments");
  }

  async listForTransaction(
    transactionId: string,
  ): Promise<RepoResult<Attachment[]>> {
    const { data, error } = await this.client
      .from("attachments")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /**
   * Uploads a file to the given storage bucket and records the resulting
   * attachment row. Pass storagePath as the path *within* the bucket
   * (e.g. `${householdId}/${transactionId}/${fileName}`).
   */
  async uploadAndCreate(params: {
    bucket: string;
    storagePath: string;
    file: Blob | ArrayBuffer | File;
    transactionId: string;
    uploadedBy: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<RepoResult<Attachment>> {
    const { error: uploadError } = await this.client.storage
      .from(params.bucket)
      .upload(params.storagePath, params.file, {
        contentType: params.mimeType,
      });

    if (uploadError) return { data: null, error: uploadError };

    return this.create({
      transaction_id: params.transactionId,
      uploaded_by: params.uploadedBy,
      file_name: params.fileName,
      file_size: params.fileSize,
      mime_type: params.mimeType,
      storage_path: params.storagePath,
    });
  }

  /** Deletes the attachment row and removes the underlying file from storage. */
  async deleteWithFile(id: string, bucket: string): Promise<RepoResult<null>> {
    const { data: attachment, error: findError } = await this.findById(id);
    if (findError) return { data: null, error: findError };

    const { error: storageError } = await this.client.storage
      .from(bucket)
      .remove([attachment.storage_path]);
    if (storageError) return { data: null, error: storageError };

    return this.delete(id);
  }
}
