import { HttpResponseInit } from '@azure/functions';

export function jsonResponse(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(err: unknown): HttpResponseInit {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const e = err as { status: number; body: unknown };
    return jsonResponse(e.status, e.body);
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonResponse(500, { message: 'Internal server error', detail: message });
}
