import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { host } from '@/lib/host';

/** Full-screen forms and the drafts review: no tab bar. */
export function FormLayout() {
  useEffect(() => host.ready(), []);
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pt-4 pb-10">
      <Outlet />
    </div>
  );
}
