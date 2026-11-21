/** Whether a socket address is this machine (the dev client header and the header keys' sessions accept only these). */
export function isLoopback(address: string | undefined): boolean {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '');
}
