// Codex's review of cd5bbf9, input findings. A pinch in the garage can start with a finger on a Customise button (a
// panel of its own over the view, so its touches never reached the garage screen's listener). A pointer the view can't
// capture any more isn't counted as a finger. And a controller's stick scrolls a list inside a card that scrolls too:
// the card used to take all of it.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  vm = require("node:vm");
function part(file, from, to) {
  const s = fs.readFileSync(require.resolve("../js/" + file + ".js"), "utf8"),
    a = s.indexOf(from),
    b = s.indexOf(to, a);
  if (a < 0 || b < 0) throw Error(from);
  return s.slice(a, b);
}
function garage() {
  const all = {},
    nodes = {};
  const node = (id) =>
    (nodes[id] ??= {
      id,
      events: {},
      addEventListener(t, f) {
        this.events[t] = f;
      },
      setPointerCapture() {},
    });
  const g = {
    $: node,
    GO: { ptr: new Map(), btn: null, zoom: 1 },
    state: "GARAGE",
    addEventListener(t, f) {
      all[t] = f;
    },
  };
  vm.createContext(g);
  vm.runInContext(
    part("screens", 'const cv=$("c");', 'cv.addEventListener("wheel"'),
    g,
  );
  const fire = (t, id, holder) => {
    const e = {
      pointerId: id,
      clientX: id * 22,
      clientY: 10,
      pointerType: "touch",
      target: { closest: (q) => (q === "button,a,input" ? {} : null) },
    };
    all[t]?.(e);
    node(holder).events[t]?.(e);
  };
  return { g, fire };
}

test("a finger on a Customise button, then one on the view, is a pinch", () => {
  expect(fs.readFileSync("index.html", "utf8")).toMatch(
    /<\/div>\s*<div id="cust"/,
  );
  const { g, fire } = garage();
  fire("pointerdown", 1, "cust");
  fire("pointerdown", 2, "c");
  expect(g.GO.ptr.size).toBe(2);
});

test("a pointer the view can't capture isn't counted as a finger", () => {
  const { g, fire } = garage();
  fire("pointerdown", 1, "gui");
  fire("lostpointercapture", 1, "gui");
  g.$("c").setPointerCapture = (id) => {
    if (id === 1) throw Error("pointer no longer active");
  };
  fire("pointerdown", 2, "c");
  expect([...g.GO.ptr.keys()]).toEqual([2]);
  // and with capture refused while the button's finger is still noted
  const second = garage();
  second.fire("pointerdown", 1, "gui");
  second.g.$("c").setPointerCapture = (id) => {
    if (id === 1) throw Error("pointer no longer active");
  };
  second.fire("pointerdown", 2, "c");
  expect([...second.g.GO.ptr.keys()]).toEqual([2]);
});

test("the stick scrolls a list in a card that scrolls too, once the card is at its end", () => {
  const box = (clientHeight, scrollHeight) => ({
    clientHeight,
    scrollHeight,
    top: 0,
    get scrollTop() {
      return this.top;
    },
    set scrollTop(n) {
      this.top = Math.max(
        0,
        Math.min(n, this.scrollHeight - this.clientHeight),
      );
    },
  });
  const card = box(180, 240),
    list = box(80, 400);
  card.scrollTop = 60;
  const sub = {
    classList: { contains: () => false },
    querySelectorAll: () => [card, list],
  };
  const g = {
    PAUSE_SUBS: [["passport"]],
    $: () => sub,
    getComputedStyle: () => ({ overflowY: "auto" }),
  };
  vm.runInNewContext(
    part("cars", "function padScroll(", "function pollPad(") +
      ";padScroll({axes:[0,1]})",
    g,
  );
  expect(list.scrollTop).toBeGreaterThan(0);
  // a list inside the card goes first
  card.contains = (el) => el === list;
  card.scrollTop = 0;
  list.scrollTop = 0;
  vm.runInNewContext(
    part("cars", "function padScroll(", "function pollPad(") +
      ";padScroll({axes:[0,1]})",
    g,
  );
  expect([card.scrollTop, list.scrollTop]).toEqual([0, 14]);
});
