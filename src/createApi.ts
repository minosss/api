import { Api } from "./api.js";
import type { HttpRequest, MiddlewareFn } from "./types.js";

export function createApi<H extends HttpRequest>(options: {
  http: H;
  middlewares?: MiddlewareFn[];
}) {
  return new Api(options);
}
