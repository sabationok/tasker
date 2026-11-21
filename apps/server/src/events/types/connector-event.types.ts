/** What tasker tells the hub (`POST <api_keys.events_url>`), contract §6 + `reminder.due`. */
export type DraftUpdatedEvent = { connector: 'tasker'; type: 'draft.updated'; draftId: string; batchId: string; status: 'saved' | 'discarded' | 'expired'; itemId?: string; label?: string; outcome?: 'accepted' | 'edited' | 'dismissed'; changes?: { field: string; from: unknown; to: unknown }[]; reason?: 'wrong_connector' | 'wrong_tool' | 'wrong_values' };
/** On an agent's to-do: what that agent should do now, so it acts without another call. */
export type ReminderAssignment = { agent: string; connector: string | null; connectorTools: string[] | null; instructions: string | null };
export type ReminderDueEvent = { connector: 'tasker'; type: 'reminder.due'; reminderId: string; itemId?: string; habitId?: string; title: string; at: string; late: boolean; assignment?: ReminderAssignment };
export type ConnectorEvent = DraftUpdatedEvent | ReminderDueEvent;
