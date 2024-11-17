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
[input] -> [middlewares, action] -> [output]
```

## Quick Start

```ts
import { ApiClient, replacePathParams } from "@yme/api/client";
import { logger } from "@yme/api/middleware";

const api = new ApiClient({
  action: async ({ req }) => {
    // make http request and return data
    const response = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(req.input),
    });
    // check status or others
    return response.json();
  },
  middlewares: [
    logger(),
    // replace path params from input. e.g. /users/[id] to /users/1
    replacePathParams(),
  ],
});

const createUser = api
  .post("/users", {
    // initial request config, like headers
  })
  .validator(
    // input schema
    z.object({
      name: z.string(),
      age: z.number(),
    })
  )
  .T<{ id: string; name: string }>()
  // output schema
  .selector((user) => user.id);

const newUserId = await createUser(
  {
    name: "Alice",
    age: 18,
  },
  {
    // request config
  }
);
```

Use Next.js (Server Action)

```ts
import { NextAction } from "@yme/api/next";
const api = new NextAction({
  middlewares: [],
  // throwing an error will make the server return status 500
  // we can handle it in the error handler. e.g. returns a fallback data with error message
  handleError: async (err, opts) => {
    return {
      message: err.message,
      code: err.code,
    };
  },
});

const updateUser = api
  .post({
    // ...initial,
    actionName: "updateUser",
  })
  .validator(
    z.object({
      name: z.string(),
    })
  )
  .bindArgs([z.string()])
  .action(async ({ req }) => {
    const {
      parsedBindArgs: [id],
      parsedInput: { name },
      actionName, // "updateUser"
    } = req;
    return true;
  }); // updateUser(id: string, input: { name: string } | FormData): Promise<boolean>

// use state
const createUser = api
  .post()
  .validator(
    z.object({
      name: z.string(),
    })
  )
  .state<{ message: string }>()
  .action(async ({ req }) => {
    // { state, parsedInput: { name } }
    return { message: "ok" };
  }); // createUser(state: { message: string }, input: { name: string } | FormData): Promise<{ message: string }>

const [state, action, isPending] = useFormState(createUser, {
  message: "",
});
```

## License

MIT
