# Migration from v1 to v2

- Removed package `@yme/react-api`
- Initial client from `createApi` to `new ApiClient()`

```ts
// Before
import { createApi } from "@yme/api";
const api = createApi({
  http,
});

// After
import { ApiClient } from "@yme/api/client";
const api = new ApiClient({
  action,
});
```

- Change path params define from `:param` to `[param]`

```ts
// Before
const api = createApi({
  routes: {
    users: {
      one: r.get("/users/:id"),
    },
  },
});

// After
const api = new ApiClient({});
const users = {
  one: api.get("/users/[id]"),
};
```

- Returns a pure function instead of a route configuration

```ts
// Before
const api = new ApiClient({
  routes: {
    users: {
      one: r.get("/users/[id]"),
    },
  },
});
api.users.one({ id: 1 });

// After
const api = new ApiClient({});
const users = {
  one: api.get("/users/[id]"),
};
users.one({ id: 1 });
```

- Move path params replacement to the middleware `replacePathParams`

```ts
// Before
const api = createApi({ ... });
api.users.one({ id: 1 }); // /users/1

// After
const api = new ApiClient({
  // ...
  middlewares: [
    replacePathParams(),
  ],
});
const users = {
  one: api.get("/users/[id]"),
};
users.one({ id: 1 }); // /users/1
```

- Add middleware support

```ts
import { logger } from "@yem/api/middleware";
import { replacePathParams } from "@yem/api/client";

const api = new ApiClient({
  middlewares: [
    logger(),
    replacePathParams(),
    // ...
  ],
});
```

- Add server action for next.js.

```ts
import { NextAction } from "@yme/api/next";
const action = new NextAction({
  middlewares: [
    // ...
  ],
});

const createUser = action
  .post({
    // initial
  })
  .bindArgs([z.string()])
  .validator(
    z.object({
      name: z.string().min(1).max(255),
    })
  )
  .action(async (req) => {
    //           ^type: { input, parsedInput: { name: string }, parsedBindArgs: [string] }
    // do some logic and return response
    return { id: "1" };
  });

const createUserWithOrg = createUser.bind(null, "Organization");
createUserWithOrg({ name: "John" }); // { id: '1' }
```
