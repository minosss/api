// Inspired by hono/logger

import type { Middleware } from '../compose.js';
import type { HttpRequest } from '../types.js';

type LoggerFn = (message: string, ...others: string[]) => void;

const prefixSet = {
  Incoming: '<--',
  Outgoing: '-->',
};

const now = () => performance.now();

function time(start: number) {
  const delta = now() - start;
  return delta < 1000 ? `${delta}ms` : `${Math.round(delta / 1000)}s`;
}

function log(
  fn: LoggerFn,
  prefix: string,
  method: string,
  url: string,
  status?: number,
  time?: string,
) {
  const message =
    prefix === prefixSet.Incoming
      ? `${prefix} ${method} ${url}`
      : `${prefix} ${method} ${url} ${status} ${time}`;
  fn(message);
}

export function logger(fn: LoggerFn = console.log): Middleware<any, any> {
  return async (opts) => {
    const { req } = opts as unknown as { req: HttpRequest };
    const { method = 'unknown', url = 'unknown' } = req;
    const start = now();

    log(fn, prefixSet.Outgoing, method, url);

    await opts.next();

    log(fn, prefixSet.Incoming, method, url, 0, time(start));
  };
}
