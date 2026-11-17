/** `saving` = claimed by one save while its tool runs (never sent out). */
export type DraftStatus = 'draft' | 'saving' | 'saved' | 'discarded' | 'expired';
/** How the user answered a draft — the training signal for recognition. */
export type DraftOutcome = 'accepted' | 'edited' | 'dismissed';
export type DismissReason = 'wrong_connector' | 'wrong_tool' | 'wrong_values';
export type DraftFieldChange = { field: string; from: unknown; to: unknown };
export type DraftFeedback = { outcome?: DraftOutcome | null; changes?: DraftFieldChange[] | null; reason?: DismissReason | null };
export type DraftChange = { draftId: string; batchId: string; status: DraftStatus; resultId: string | null; resultLabel: string | null; apiKeyId: string | null; tool: string } & DraftFeedback;
