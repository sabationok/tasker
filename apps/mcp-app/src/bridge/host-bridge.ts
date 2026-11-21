import { App } from '@modelcontextprotocol/ext-apps';
import type { ToolResult, WidgetBridge } from './tools';

/** Inside a host iframe (Mia, Claude, ChatGPT): MCP Apps over postMessage, via the ext-apps `App`. */
export async function createHostBridge(): Promise<WidgetBridge> {
  const app = new App({ name: 'tasker-review', version: '0.1.0' }, {}, { autoResize: true });
  const resultCbs: ((r: ToolResult) => void)[] = [];
  const hostCbs: (() => void)[] = [];
  let last: ToolResult | null = null;
  // Handlers go on before connect(): the host may send the result right away.
  app.ontoolresult = (r) => {
    last = r as ToolResult;
    resultCbs.forEach((cb) => cb(last!));
  };
  app.onhostcontextchanged = () => hostCbs.forEach((cb) => cb());
  await app.connect();

  return {
    embedded: true,
    callTool: async (name, args) => (await app.callServerTool({ name, arguments: args })) as ToolResult,
    onToolResult: (cb) => {
      resultCbs.push(cb);
      if (last) cb(last);
    },
    tellModel: (text, data) => void app.updateModelContext({ content: [{ type: 'text', text }], structuredContent: data }).catch(() => undefined),
    theme: () => app.getHostContext()?.theme ?? null,
    onHostChange: (cb) => hostCbs.push(cb),
    insets: () => app.getHostContext()?.safeAreaInsets ?? null,
  };
}
