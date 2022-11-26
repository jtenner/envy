import { TestNode, TestNodeResult, TestNodeType } from "./TestNode";
import { Box, MaybeCallbackContext } from "as-lunatic/assembly";
export type VoidCallback = () => void;

@global export const __envyAfterAll: VoidCallback[] = [];
@global export const __envyAfterEach: VoidCallback[] = [];

@global export const __envyBeforeAll: VoidCallback[] = [];
@global export const __envyBeforeEach: VoidCallback[] = [];

@global export const __envyTestNodes: TestNode[] = [];

@global export const __envyLogs: Object[] = [];
@global export const __envyTodos: string[] = [];

@global export const __envyMaybeContext: Box<MaybeCallbackContext<TestNodeResult, TestNodeResult> | null>
  = new Box<MaybeCallbackContext<TestNodeResult, TestNodeResult> | null>(null);

@global function __envyAssert<T>(condition: T, message: string | null = null): T {
  if (!condition) {
    if (!__envyMaybeContext.value) unreachable();
    __envyMaybeContext.value!.reject(new TestNodeResult(0, 0, false, __envyLogs, __envyTodos, message || "No assert message specified."));
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
