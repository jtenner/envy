/// <reference path="./global.d.ts" />
import { fd_write } from "wasi";

export function _startTests(): void {
  root.evaluate(new TestNodeReporterContext());
}

class TestNodeReporterContext {
  indent: i32 = 0;
}

function write(str: string): void {
  let buff = String.UTF8.encode(str);
  let iov = memory.data(16);
  store<u32>(iov, changetype<usize>(buff), 0);
  store<u32>(iov, <u32>buff.byteLength, sizeof<usize>());
  let written_ptr = memory.data(8);
  fd_write(1, iov, 1, written_ptr);
}

class TestNode {
  group: bool = false;
  children: TestNode[] = [];
  success: bool = false;
  constructor(
    public name: string,
    public callback: () => void,
  ) {}

  evaluate(ctx: TestNodeReporterContext): void {
    if (this != root) {
      ctx.indent += 2;
      if (this.group) write(" ".repeat(ctx.indent) + "Group: " + this.name + "\n");
      else write(" ".repeat(ctx.indent) + "Test: " + this.name + "\n");
    }

    let parent = current;
    current = this;
    this.callback();

    // once the test is run, children are determined, evaluate them
    let children = this.children;
    let childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      let child = unchecked(children[i]);
      child.evaluate(ctx);
    }

    current = parent;
    if (this != root) {
      ctx.indent -= 2;
    }
  }
}

let root: TestNode = new TestNode("Root", () => {});
let current: TestNode = root;

@global function test(name: string, callback: () => void): void {
  let t = new TestNode(name, callback);
  current.children.push(t);
}

@global function describe(name: string, callback: () => void): void {
  let t = new TestNode(name, callback);
  t.group = true;
  current.children.push(t);
}

