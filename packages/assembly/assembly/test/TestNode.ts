import { wasi_Date } from "@assemblyscript/wasi-shim/assembly/wasi_date";
import { Message, Maybe, Box, MaybeResolutionStatus, MaybeCallbackContext, MaybeResolution} from "as-lunatic/assembly";
import { VoidCallback, __envyAfterAll, __envyAfterEach, __envyBeforeAll, __envyBeforeEach, __envyLogs, __envyTestNodes, __envyTodos, __envyMaybeContext } from "./setup";

export enum TestNodeType {
  Test,
  Group,
};

export abstract class TestNodeEvent {
  constructor() {}

  abstract handle(ctx: TestNodeContext, msg: Message<TestNodeEvent>): bool;
}

/** Represents the result of a test node's completion. */
export class TestNodeResult {
  children: TestNodeResult[] = [];

  public constructor(
    public start: u64,
    public end: u64,
    public pass: bool,
    public logs: Object[],
    public todos: string[],
    public message: string | null,
  ) {}

  collect(maybes: Maybe<TestNodeResult, TestNodeResult>[]): void {
    
    // The node passes if every single maybe resolves to a passed NodeStats
    for (let i = 0; i < maybes.length; i++) {
      let maybe = maybes[i];
      let value = maybe.value;
      if (value.status == MaybeResolutionStatus.Resolved) {
        // if they aren't explicitly resolved, we have a problem
        let resolved = value.resolved!.value;
        this.children.push(resolved);
      } else {
        // in the case the child rejection happens with an unreachable, it won't reject to a value
        this.pass = false;
        // in the case where it doesn't reject to a node, we can't do much
        if (value.rejected) {
          // We usually expect every resolution to pass, using the `assert()` macro
          let rejected = value.rejected!.value;
          this.children.push(rejected);
        } 
      }
    }
  }
}

/** Represents the test node itself. */
export class TestNode {
  type: TestNodeType = TestNodeType.Test;
  nodeId: u64 = 0;
  name: string = ""; 
  result: TestNodeResult | null = null;

  afterAll: VoidCallback[] = [];
  afterEach: VoidCallback[] = [];
  beforeAll: VoidCallback[] = [];
  beforeEach: VoidCallback[] = [];
  callback: VoidCallback = () => {};
}

export class TestNodeContext {
  static from(node: TestNode): TestNodeContext {
    let ctx = new TestNodeContext();
    ctx.afterAll = node.afterAll.slice();
    ctx.afterEach = node.afterEach.slice();
    ctx.beforeAll = node.beforeAll.slice();
    ctx.beforeEach = node.beforeEach.slice();
    ctx.callback = node.callback;
    return ctx;
  }

  afterAll: VoidCallback[] = [];
  afterEach: VoidCallback[] = [];
  beforeAll: VoidCallback[] = [];
  beforeEach: VoidCallback[] = [];
  callback: VoidCallback = () => {};
}

function executeAll(callbacks: VoidCallback[]): void {
  for (let i = 0; i < callbacks.length; i++) {
    let callback = callbacks[i];
    callback();
  }
}

export function completeTestNodeMaybe(node: TestNode): Maybe<TestNodeResult, TestNodeResult> {
  return Maybe.resolve<TestNodeContext, i32>(TestNodeContext.from(node))
    .then<TestNodeResult, TestNodeResult>((ctxBox: Box<TestNodeContext> | null, maybeCtx: MaybeCallbackContext<TestNodeResult, TestNodeResult>) => {
      // we want our custom assert function to work, so we need to do something with the maybeCtx the moment
      // we receive it
      __envyMaybeContext.value = maybeCtx;
      // obtain the contest
      let ctx = ctxBox!.value;

      // execute all the before functions
      executeAll(ctx.beforeAll);
      executeAll(ctx.beforeEach);
      
      // start the timer
      let start = wasi_Date.now();
      ctx.callback();
      let end = wasi_Date.now();
      // end the timer

      // execute all the after functions
      executeAll(ctx.afterEach);
      executeAll(ctx.afterAll);

      let maybes = new Array<Maybe<TestNodeResult, TestNodeResult>>();

      // now we need to make a new TestNode for each subtest and resolve it
      for (let i = 0; i < __envyTestNodes.length; i++) {
        // all the callbacks that need to be execute are now declared
        // we need to update each test node's setup steps
        let node = __envyTestNodes[i];
        node.afterAll = ctx.afterAll.concat(__envyAfterAll);
        node.afterEach = ctx.afterEach.concat(__envyAfterEach);
        node.beforeAll = ctx.beforeAll.concat(__envyBeforeAll);
        node.beforeEach = ctx.beforeEach.concat(__envyBeforeEach);

        maybes.push(completeTestNodeMaybe(node));
      }

      // create the return value
      let result = new TestNodeResult(start, end, true, __envyLogs, __envyTodos, null);
      result.collect(maybes);

      if (result.pass) {
        maybeCtx.resolve(result);
      } else {
        maybeCtx.reject(result);
      }
    });
}
