// Inspired by hono/logger
import { MiddlewareFn } from '../types.js';

type LoggerFn = (message: string, ...others: string[]) => void;

const prefixSet = {
  Incoming: '<--',
  Outgoing: '-->',
}

function time(start: number) {
  const delta = Date.now() - start;
  return delta < 1000 ? `${delta}ms` : `${Math.round(delta / 1000)}s`;
}

function log(
  fn: LoggerFn,
  prefix: string,
  method: string,
  url: string,
  // TODO support status
  status?: number,
  time?: string
) {
  const message = prefix === prefixSet.Incoming
    ? `${prefix} ${method} ${url}`
    : `${prefix} ${method} ${url} ${status} ${time}`;
  fn(message);
}

export function logger(fn: LoggerFn = console.log): MiddlewareFn {
  return async function logger(ctx, next) {
    const { method, url } = ctx.config;
    const start = Date.now();

    log(fn, prefixSet.Incoming, method, url);

    await next();

    log(fn, prefixSet.Outgoing, method, url, 0, time(start));
  }
}
