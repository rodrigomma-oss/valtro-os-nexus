import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/debug-headers')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = Object.fromEntries(request.headers.entries());
        return new Response(JSON.stringify(headers), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
})
