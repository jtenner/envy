import { TestNode, TestNodeResult, TestNodeType } from "./TestNode";
import { Box, Maybe, MaybeCallbackContext } from "as-lunatic/assembly/index";
import { wasi_Date } from "@assemblyscript/wasi-shim/assembly/wasi_date";
export type VoidCallback = () => void;

export let __envyAfterAll: VoidCallback[] = [];
export let __envyAfterEach: VoidCallback[] = [];

export let __envyBeforeAll: VoidCallback[] = [];
export let __envyBeforeEach: VoidCallback[] = [];

export let __envyTestNodes: TestNode[] = [];

export let __envyLogs: Object[] = [];
export let __envyTodos: string[] = [];

// the following things must be lazy in order to satisfy compiler errors
@lazy export let __envyMaybeContext: Box<MaybeCallbackContext<TestNodeResult, TestNodeResult> | null>
  = new Box<MaybeCallbackContext<TestNodeResult, TestNodeResult> | null>(null);

@lazy export let __envyCurrentResult: Box<TestNodeResult | null> = new Box<TestNodeResult | null>(null);

export function getCurrentResult(): TestNodeResult {
  return __envyCurrentResult.value!;
}
export function getMaybeContext(): MaybeCallbackContext<TestNodeResult, TestNodeResult> {
  return __envyMaybeContext.value!;
}

@global function __envyAssert<T>(condition: T, message: string | null = null): T {
  if (!condition) {
    let ctx = getMaybeContext();
    let result = getCurrentResult();
    result.pass = false;
    result.end = wasi_Date.now();
    result.message = message;
    ctx.reject(result);
    unreachable();
  }
  return condition;
}

@global export function test(name: string, callback: () => void): void {
  let node = new TestNode();
  node.name = name;
  node.callback = callback;
  __envyTestNodes.push(node);
}

@global export function describe(name: string, callback: () => void): void {
  let node = new TestNode();
  node.type = TestNodeType.Group;
  node.name = name;
  node.callback = callback;
  __envyTestNodes.push(node);
}
