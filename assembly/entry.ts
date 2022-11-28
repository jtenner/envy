import { Maybe } from "as-lunatic/assembly/index";
import { __envyLogs, __envyTestNodes, __envyTodos } from "./test/setup";
import { completeTestNodeMaybe, TestNodeResult } from "./test/TestNode";
import { wasi_Date } from "@assemblyscript/wasi-shim/assembly/wasi_date";

export function __start(): void {
  // the entry of every test application is simple

  // create a list of maybes to resolve
  let maybes = new Array<Maybe<TestNodeResult, TestNodeResult>>();
  
  // start the timer
  let start = wasi_Date.now();

  // for every test node that needs to be resolved, resolve it
  for (let i = 0; i < __envyTestNodes.length; i++) {
    let node = __envyTestNodes[i];
    maybes.push(completeTestNodeMaybe(node));
  }
  
  // end the timer
  let end = wasi_Date.now();

  let result = new TestNodeResult("root", start, end, true, __envyLogs, __envyTodos, null);
  result.collect(maybes);
  
}