/**
 * The mini app's screens and their page actions (contract §5b): the one authority on names, schemas and `persists`.
 * Mia reads it as `tasker://ui/manifest` server-to-server; the page sends only its live screen and the names it mounted.
 * The app's own assistant will read the same manifest later.
 */
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });
const draftId = { type: 'string', format: 'uuid', title: 'Чернетка', description: 'The draft id, from sections.drafts[].draft_id' };
const reason = { type: 'string', enum: ['wrong_connector', 'wrong_tool', 'wrong_values'], title: 'Причина', description: 'Why it is dismissed; it trains the recognizer' };

export type UiAction = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean };
  /** Saves or changes stored data → the host confirms with the user first. */
  persists: boolean;
  /** `'draft'`: the `values` argument is checked against the open draft's tool inputSchema (snake_case). */
  valuesOf?: 'draft';
};
export type UiScreen = { screen: string; title: string; prompt?: string; params: Record<string, unknown>; actions: UiAction[] };

const discard: UiAction = {
  name: 'page_draft_discard',
  description: 'Dismiss one draft of this batch (nothing is written). Give the reason when known.',
  inputSchema: obj({ draft_id: draftId, reason }, ['draft_id']),
  annotations: { readOnlyHint: false, destructiveHint: true },
  persists: true,
};

export const UI_SCREENS: UiScreen[] = [
  {
    screen: 'drafts.batch',
    title: 'Чернетки пакета',
    prompt: "The user reviews a batch of tasker drafts recognized from their message. sections.drafts lists each draft's fields, state and errors. Open one to edit, dismiss wrong ones with a reason, or save all valid ones.",
    params: obj({ batchId: { type: 'string', format: 'uuid', description: 'The batch' } }, ['batchId']),
    actions: [
      { name: 'page_draft_open', description: 'Open one draft in the edit form (nothing is saved).', inputSchema: obj({ draft_id: draftId }, ['draft_id']), annotations: { readOnlyHint: true, destructiveHint: false }, persists: false },
      discard,
      { name: 'page_batch_save_all', description: 'Save every valid open draft of this batch as is; invalid ones stay with their errors.', inputSchema: obj({}), annotations: { readOnlyHint: false, destructiveHint: false }, persists: true },
    ],
  },
  {
    screen: 'drafts.edit',
    title: 'Редагування чернетки',
    prompt: "The user edits one tasker draft. sections.values holds the form's current values (snake_case, the draft tool's input fields), sections.errors the server's field errors. Fill fields to fix them; the user or page_form_submit saves.",
    params: obj({ batchId: { type: 'string', format: 'uuid', description: 'The batch' }, draftId: { type: 'string', format: 'uuid', description: 'The open draft' } }, ['batchId', 'draftId']),
    actions: [
      {
        name: 'page_form_fill',
        description: "Set fields of the open draft form. Keys are the draft tool's input fields (snake_case, as in sections.values). The user still saves.",
        inputSchema: obj({ values: { type: 'object', title: 'Значення', description: "Field → value, per the draft tool's inputSchema" } }, ['values']),
        annotations: { readOnlyHint: false, destructiveHint: false },
        persists: false,
        valuesOf: 'draft',
      },
      { name: 'page_form_submit', description: 'Save the open draft with the form values (the same as «Зберегти»); the server validates again.', inputSchema: obj({}), annotations: { readOnlyHint: false, destructiveHint: false }, persists: true },
      discard,
      { name: 'page_form_close', description: 'Leave the form without saving, back to the batch.', inputSchema: obj({}), annotations: { readOnlyHint: true, destructiveHint: false }, persists: false },
    ],
  },
];
