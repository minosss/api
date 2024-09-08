import { describe, it, expect, jest } from "bun:test";
import { replaceUrlParams } from "../src/replaceUrlParams.js";
import { createApi } from "../src/createApi.js";

describe("apiClient", () => {
  it("create a api client", async () => {
    const httpFn = jest.fn(async () => {});

    const api = createApi({
      http: httpFn,
    });

    const getUsers = api.get("/users");
    const createUser = api.post("/users");
    const updateUser = api.put("/users");
    const deleteUser = api.delete("/users");
    const patchUser = api.patch("/users");

    expect(getUsers).toBeInstanceOf(Function);
    expect(createUser).toBeInstanceOf(Function);
    expect(updateUser).toBeInstanceOf(Function);
    expect(deleteUser).toBeInstanceOf(Function);
    expect(patchUser).toBeInstanceOf(Function);

    await getUsers();
    expect(httpFn).toHaveBeenCalledWith({
      method: "GET",
      url: "/users",
      params: undefined,
    });

    await createUser();
    expect(httpFn).toHaveBeenCalledWith({
      method: "POST",
      url: "/users",
      data: undefined,
    });

    await updateUser();
    await deleteUser();
    await patchUser();

    expect(httpFn).toHaveBeenCalledTimes(5);
  });

  it("api client with middlewares", async () => {
    const order: number[] = [];

    const httpFn = jest.fn(async () => {
      order.push(1);
    });
    const loggerFn = jest.fn(async (_, next) => {
      order.push(2);
      await next();
      order.push(3);
    });
    const authFn = jest.fn(async (_, next) => {
      order.push(4);
      await next();
      order.push(5);
    });

    const api = createApi({
      http: httpFn,
      middlewares: [loggerFn, authFn],
    });

    await api.get("/users")();

    expect(order).toEqual([2, 4, 1, 5, 3]);

    expect(httpFn).toHaveBeenCalledWith({
      method: "GET",
      url: "/users",
      params: undefined,
    });
    expect(loggerFn).toHaveBeenCalled();
    expect(authFn).toHaveBeenCalled();
  });

  it("with validator and selector", async () => {
    const httpFn = jest.fn(async ({ params }) => {
      return { ...params, name: "John" };
    });

    const api = createApi({
      http: httpFn,
    });

    const getUser = api
      .get("/users")
      .validator((input: { id: string }) => input)
      .selector((user: { name: string }) => user.name);

    expect(await getUser({ id: "1" })).toBe("John");

    expect(httpFn).toHaveBeenCalledWith({
      method: "GET",
      url: "/users",
      params: { id: "1" },
    });
  });

  it("extends api client with middlewares", async () => {
    const httpFn = jest.fn(async () => {});
    const loggerFn = jest.fn((_, next) => next());
    const authFn = jest.fn((_, next) => next());

    const api = createApi({
      http: httpFn,
      middlewares: [loggerFn],
    });

    await api.get("/users")();

    const productApi = api.use(authFn);
    await productApi.get("/users")();

    expect(loggerFn).toHaveBeenCalledTimes(2);
    expect(authFn).toHaveBeenCalledTimes(1);
  });

  it("handle error", async () => {
    const httpFn = jest.fn(async () => {
      throw new Error("Bad request");
    });
    let run = false;
    const once = jest.fn((_, next) => {
      if (run) {
        throw new Error("Something went wrong");
      }
      run = true;
      return next();
    });

    const api = createApi({
      http: httpFn,
      middlewares: [once],
    });

    expect(api.get("/users")()).rejects.toThrowError("Bad request");
    expect(once).toHaveBeenCalled();

    // middleware error
    expect(api.get("/users")()).rejects.toThrowError("Something went wrong");
  });

  it("replace url params", async () => {
    const httpFn = jest.fn(async () => {});

    const api = createApi({
      http: httpFn,
      middlewares: [replaceUrlParams({ removePathParams: true })],
    });

    const getUser = api
      .get("/users/:id")
      .validator((input: { id: string }) => input);

    await getUser({ id: "1" });
    expect(httpFn).toHaveBeenCalledWith({
      method: "GET",
      url: "/users/1",
      params: {},
    });

    await getUser({ id: "2" });
    expect(httpFn).toHaveBeenCalledWith({
      method: "GET",
      url: "/users/2",
      params: {},
    });
  });
});
