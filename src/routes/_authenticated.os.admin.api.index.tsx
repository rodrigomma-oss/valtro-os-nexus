import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/os/admin/api/')({
  beforeLoad: () => {
    throw redirect({ to: '/os/admin/api/applications' });
  },
});
