/** `me` = the user; otherwise an agent's slug. Items' `assignee` and `createdBy` take it. */
export const USER_ASSIGNEE = 'me';
export const AGENT_SLUG = /^[a-z][a-z0-9-]{0,31}$/;
/** A hub connector's slug (fintrack, gmail, …): what an agent's to-do is about. Tasker does not know the list. */
export const CONNECTOR_SLUG = /^[a-z][a-z0-9_-]{0,63}$/;
/** A tool name of that connector (MCP `tools/list`). */
export const CONNECTOR_TOOL = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/;

/** An agent as REST returns it (no credential). */
export type AgentView = { slug: string; name: string; icon: string | null; color: string | null; description: string | null };
