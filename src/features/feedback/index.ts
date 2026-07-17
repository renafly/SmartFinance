import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/shared/lib/supabase/client";
import { addFeedbackReply, createFeedback, listAdminFeedback, listMyFeedback, updateAdminFeedback, withdrawFeedback } from "./service";

const key = ["feedback"] as const;
export function useMyFeedback() {
  const query = useQuery({ queryKey: [...key, "mine"], queryFn: listMyFeedback });
  useEffect(() => { const channel = supabase.channel("feedback-mine").on("postgres_changes", { event: "*", schema: "public", table: "app_feedback" }, () => void query.refetch()).on("postgres_changes", { event: "*", schema: "public", table: "feedback_messages" }, () => void query.refetch()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [query.refetch]);
  return query;
}
export function useAdminFeedback(filters?: { search?: string; status?: string; priority?: string; kind?: string; assignment?: string }) {
  return useQuery({
    queryKey: [...key, "admin", filters],
    queryFn: async () => {
      const items = await listAdminFeedback();
      return items.filter((item) => {
        const search = filters?.search?.trim().toLowerCase();
        return (!search || `${item.title} ${item.description}`.toLowerCase().includes(search))
          && (!filters?.status || filters.status === "all" || item.status === filters.status)
          && (!filters?.priority || filters.priority === "all" || item.priority === (filters.priority === "medium" ? "normal" : filters.priority))
          && (!filters?.kind || filters.kind === "all" || item.kind === filters.kind);
      });
    },
  });
}
export function usePlatformAdminAccess() { return useQuery({ queryKey: [...key, "admin-access"], queryFn: async () => { const { data, error } = await (supabase as any).rpc("is_platform_admin"); if (error) throw error; return Boolean(data); } }); }
export function useCreateFeedback() { const qc = useQueryClient(); return useMutation({ mutationFn: createFeedback, onSuccess: () => void qc.invalidateQueries({ queryKey: key }) }); }
export function useWithdrawFeedback() { const qc = useQueryClient(); return useMutation({ mutationFn: withdrawFeedback, onSuccess: () => void qc.invalidateQueries({ queryKey: key }) }); }
export function useAddFeedbackReply() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ feedbackId, body, isInternal }: { feedbackId: string; body: string; isInternal?: boolean }) => addFeedbackReply(feedbackId, body, isInternal), onSuccess: () => void qc.invalidateQueries({ queryKey: key }) }); }
export function useUpdateAdminFeedback() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ feedbackId, ...input }: { feedbackId: string; status?: string; priority?: string; assignedAdminId?: string | null; assigneeId?: string | null; resolvedReleaseId?: string | null; resolvedInRelease?: string | null; duplicateOfId?: string | null }) => updateAdminFeedback(feedbackId, input), onSuccess: () => void qc.invalidateQueries({ queryKey: key }) }); }
export const useUpdateFeedback = useUpdateAdminFeedback;
