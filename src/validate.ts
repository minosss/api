import type { z } from "zod";
import type { Transform } from "./types.js";

const is = {
  generic: (value: any): value is Function => typeof value === "function",
  zod: (value: any): value is z.ZodType => "_def" in value,
};

// TODO support other schema

export async function validate(transform: Transform, data: unknown) {
  if (is.zod(transform)) {
    return transform.parseAsync(data);
  }

  if (is.generic(transform)) {
    return transform(data);
  }

  throw new Error(`Invalid transform: ${transform}`);
}
