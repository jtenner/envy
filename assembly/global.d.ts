export {}

declare global {
  function test(name: string, callback: () => void): void;
  function describe(name: string, callback: () => void): void;
}

