/** `saving` = claimed by one save while its tool runs (never sent out). */
export type DraftStatus = 'draft' | 'saving' | 'saved' | 'discarded' | 'expired';
export type DraftChange = { draftId: string; batchId: string; status: DraftStatus; resultId: string | null; resultLabel: string | null; apiKeyId: string | null; tool: string };
