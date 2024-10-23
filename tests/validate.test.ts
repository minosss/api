import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { validate } from '../src/validate.js';

describe('validate', () => {
  describe('validate', () => {
    it('should validate a zod schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John', age: 30 };
      const result = await validate(schema, data);

      expect(result).toEqual(data);
    });

    it('should throw an error for invalid zod schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John', age: 'thirty' };

      expect(validate(schema, data)).rejects.toThrow();
    });

    it('should validate using a generic function', async () => {
      const transform = (data: any) => {
        if (typeof data === 'string') {
          return data.toUpperCase();
        }
        throw new Error('Invalid data');
      };

      const data = 'hello';
      const result = await validate(transform, data);

      expect(result).toBe('HELLO');
    });

    it('should throw an error for invalid transform', async () => {
      const transform = {} as any;
      const data = 123;

      expect(validate(transform, data)).rejects.toThrow(/^Invalid transform/);
    });
  });
})
