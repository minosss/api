> This is v2 of `@yme/api`. If you are looking for v1, please visit [v1 branch](https://github.com/minosss/api/tree/v1).

Hey 👋, `@yme/api` is a package that defines the type-safe API requests. No server required and zero dependencies.

> If you are developing a full-stack web application, you should take a look [tRPC](https://trpc.io/).

[![NPM version](https://img.shields.io/npm/v/@yme/api)](https://www.npmjs.com/package/@yme/api)
[![NPM Downloads](https://img.shields.io/npm/dm/@yme/api)](https://www.npmjs.com/package/@yme/api)
[![Bundle Size](https://badgen.net/bundlephobia/minzip/@yme/api)](https://www.npmjs.com/package/@yme/api)

- **Type-Safe**: Define API requests with TypeScript.
- **Zero Dependencies**: No dependencies.
- **Serverless**: No server required.
- **Customizable**: Use your own HTTP client.
- **Middlewares**: Support middlewares.

```
[input] -> [validator] -> [middlewares, http] -> [selector] -> [output]
```

## Quick Start

```sh
npm i @yme/api@next
```

```ts
import { createApi } from '@yme/api';

const api = createApi(
  async (config, context) => {
    const { data, method, url } = config;
    // fetch data from server. e.g.
    const response = await fetch(url, {
      method,
      body: JSON.stringify(config.data)
    });
    return response.json();
  },
  {}
);

interface User {
  id: string;
  name: string;
  age?: number;
}

const user = {
  list: api.get('/users').T<{ page?: number }, User[]>(),
  delete: api.delete('/users/:id'),
  // Other methods...
  // api.post
  // api.put
  // api.patch
};

user.list({ page: 2 }); // GET /users
user.delete({ id: '1' }); // DELETE /users/1

const createUser = api.post('/users')
  .validator(z.object({
    name: z.string(),
    age: z.number().optional(),
  }))
  .selector((user: { id: string }) => user.id);

const userId = await createUser({ name: 'John', age: 30 });
```

With middlewares:

```ts
import { logger, replaceUrlParams } from '@yme/api/middleware';

const api = createApi(
  async (config) => {},
  {
    middlewares: [
      logger(),
      // replace params from input data to url
      // e.g. /users/:id -> /users/1
      replaceUrlParams()
    ],
  },
);

const getUser = api.get('/users/:id')
  .validator(z.object({
    id: z.string(),
  }))
  .selector((user: { name: string }) => user.name);

// GET /users/1
const userName = await getUser({ id: '1' });
```

## License

MIT
