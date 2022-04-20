@external("test", "imported")
declare function imported(): i32;

test("A test", () => {
  assert(true, "a test");
});

describe("A block", () => {
  test("a test", () => {
    assert(42 == 42, "this test fails");
  });
});

describe("imports", () => {
  assert(imported() == 42, "imports should work");
});