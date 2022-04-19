test("A test", () => {
  assert(true, "a test");
});

describe("A block", () => {
  test("a test", () => {
    assert(false, "this test fails");
  });
});
