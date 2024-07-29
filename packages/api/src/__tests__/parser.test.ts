import { getParser } from '../parser';

describe('getParser', () => {
  test('should return identity function if value is null', () => {
    const parser = getParser(null);
    expect(parser('test')).toBe('test');
  });

  test('should return the value itself if it is a function', () => {
    const value = (input: string) => input.toUpperCase();
    const parser = getParser(value);
    expect(parser('test')).toBe('TEST');
  });

  test('should return the parse function if it exists', () => {
    const value = {
      parse: (input: string) => input.toUpperCase(),
    };
    const parser = getParser(value);
    expect(parser('test')).toBe('TEST');
  });

  test('should throw an error for invalid parser', () => {
    const value = 'invalid';
    expect(() => getParser(value)).toThrowError('Invalid parser: invalid');
  });
});
