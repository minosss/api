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
[input] -> [validator, middlewares, action, selector] -> [output]
```

## Quick Start

```ts
import { ApiClient } from '@yme/api';
import { logger, replaceUrlParams } from '@yme/api/middleware';

const api = new ApiClient({
  action: async (config, context) => {
    // make http request and return data
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: JSON.stringify(config.input),
    });
    // check status or others
    return response.json();
  },
  middlewares: [
    logger(),
    // replace route params from input. e.g. /users/:id to /users/1
    replaceUrlParams(),
  ],
  // handle error and return fallback data
  onError: async () => {
    return {
      message: 'Something went wrong',
      code: 233,
    };
  },

  // how to merge request config, custom for supports deep merge.
  // mergeConfig: (target, source) => {}
});

const createUser = api.post('/users', {
  // initial request config, like headers
})
  .validator(
    // input schema
    z.object({
      name: z.string(),
      age: z.number(),
    }),
  )
  .T<{ id: string; name: string; }>()
  // output schema
  .selector((user) => user.id);

const newUserId = await createUser({
  name: 'Alice',
  age: 18,
}, {
  // request config
});
```

## License

MIT
