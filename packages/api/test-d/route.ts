import { expectType } from 'tsd';
import type { PathParams } from '../src/next/index.js';

declare const a: PathParams<'app/blog/[slug]/page.js'>;
declare const b: PathParams<'app/shop/[...slug]/page.js'>;
declare const c: PathParams<'app/shop/[[...slug]]/page.js'>;
declare const d: PathParams<'app/[categoryId]/[itemId]/page.js'>;

expectType<{ slug: string }>(a);
expectType<{ slug: string[] }>(b);
expectType<{ slug?: string[] }>(c);
expectType<{ categoryId: string; itemId: string }>(d);
