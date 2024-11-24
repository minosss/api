import { expectType, expectAssignable } from 'tsd';
import { z } from 'zod';
import type { ApiRequest, ExtractRequestConfig } from '../src/types.js';
import { createClient } from '../src/client/index.js';

declare const req: ApiRequest;

expectType<string>(req.method);
expectType<string>(req.url);
expectType<unknown>(req.input);
expectType<unknown>(req.parsedInput);

type CustomRequest = ApiRequest & {
  headers: {
    foo: string;
  };
};

const config: ExtractRequestConfig<CustomRequest> & {
  [key: string]: unknown;
} = {
  headers: {
    foo: 'bar',
  },
};

expectType<{ foo: string }>(config.headers);
// biome-ignore lint/complexity/useLiteralKeys: <explanation>
expectType<unknown>(config['method']);

const client = createClient({
  action: async () => {},
});

const getUsers = client.get('/users').validator(
  z.object({
    page: z.number(),
    pageSize: z.number(),
  }),
);

expectAssignable<
  (input: { page: number; pageSize: number }) => Promise<unknown>
>(getUsers);

const createUser = client
  .post('/users')
  .validator(
    z.object({
      name: z.string(),
    }),
  )
  .T<{ id: string }>();

expectAssignable<(input: { name: string }) => Promise<{ id: string }>>(
  createUser,
);
