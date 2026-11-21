/** BullMQ connection options from a `redis://` URL. */
export function redisConnection(url: string): { host: string; port: number; username?: string; password?: string; db?: number } {
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 6379), ...(u.username && { username: u.username }), ...(u.password && { password: decodeURIComponent(u.password) }), ...(u.pathname.length > 1 && { db: Number(u.pathname.slice(1)) }) };
}
