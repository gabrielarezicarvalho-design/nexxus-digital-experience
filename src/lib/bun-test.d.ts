declare module "bun:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function expect(value: unknown): { toBe(expected: unknown): void; toEqual(expected: unknown): void; toBeNull(): void };
  export const mock: {
    <T extends (...args: any[]) => any>(fn: T): T;
    module(path: string, factory: () => unknown): void;
  };
}