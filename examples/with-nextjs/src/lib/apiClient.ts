'use client';

import { createClient } from '@yme/api/client';
import { replacePathParams } from '@yme/api/client';
import { logger } from '@yme/api/middleware';
import { z } from 'zod';

export const api = createClient<{
  Req: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
  };
}>({
  action: async ({ req }) => {
    const url = new URL(`/api/${req.url}`, window.location.origin);
    let body: any = null;

    if (req.method === 'GET') {
      if (req.parsedInput) {
        for (const [key, value] of Object.entries(req.parsedInput)) {
          url.searchParams.append(key, String(value));
        }
      }
    } else {
      body = JSON.stringify(req.parsedInput);
    }

    const res = await fetch(url, {
      method: req.method,
      signal: req.signal,
      headers: req.headers,
      body,
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }

    return await res.json();
  },
  middlewares: [logger(), replacePathParams()],
});

export type NoteType = {
  id: number;
  title: string;
  content: string;
};

//
export const notesApi = {
  list: api
    .get('notes')
    .validator(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(10),
      }),
    )
    .T<{ page: number; pageSize: number; records: NoteType[] }>(),
  create: api
    .post('notes')
    .validator(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1).max(1024),
      }),
    )
    .T<NoteType>(),
  delete: api
    .delete('notes')
    .validator(
      z.object({
        id: z.number().int(),
      }),
    )
    .T<void>(),
};
