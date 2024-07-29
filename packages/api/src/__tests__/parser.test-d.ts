import { describe, test } from 'vitest';
import { expectTypeOf } from 'vitest';
import { getParser } from '../parser';
import type { AnyParser } from '../parser';

describe('typeof getParser', () => {
  test('should returns fallback AnyParser', () => {
    expectTypeOf(getParser(null)).toMatchTypeOf<AnyParser>();
  });

  test('custom parser function should be AnyParser', () => {
    expectTypeOf(getParser(() => {})).toMatchTypeOf<AnyParser>();
  });

  test('custom parser object should be AnyParser', () => {
    expectTypeOf(getParser({ parse: () => {} })).toMatchTypeOf<AnyParser>();
  });
});
