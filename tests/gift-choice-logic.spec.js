const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), vm = require("node:vm");
const src = fs.readFileSync(require.resolve("../js/life.js"), "utf8");
const block = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
function game(trait) {
  const buttons = {};
  function btn(id, present) {
    const flags = new Set();
    return buttons[id] = { id, disabled: false, dataset: present ? { present } : {},
      hasAttribute: () => !!present, classList: { contains: k => flags.has(k),
        toggle(k, on) { if (on) flags.add(k); else flags.delete(k); } },
      focus() { ctx.focus = id; }, click() { ctx.clicked = id; } };
  }
  const box = btn("tkActs");
  btn("tkLine").textContent = "Jo is glad to see you.";
  box.children = [btn("tkGift"), btn("bye"), ...["flowers","coffee","book","gadget","back"].map(id => btn("tk-" + id,id))];
  const ctx = { $: id => buttons[id], TALK: { p: {}, person: { trait, id: 1, name: "Jo" }, busy: 0, n: 0, end: 0 },
    tabIdle: false, save: { cr: 500, gift: { day: -1, ids: [] }, gifted: [] }, Date: { now: () => 50 * 86400000 },
    xp: 0, writes: 0, wants: [], feelings: [], feel: (id, why) => ctx.feelings.push([id, why]),
    r: { f: 13, n: 2 }, rel: () => ctx.r, relSet: (_, f, n) => { ctx.r = { f,n }; },
    skillFactor: () => 1, skillAward: (_, xp) => { ctx.xp += xp; }, updateMoney() {}, NS: { t: 1, social: {} },
    needsAdd() {}, emote() {}, RIDE_AT: 40, wantEvent: k => ctx.wants.push(k),
    talkShow: (line) => { ctx.line = line; }, persist: () => ctx.writes++, talkClose() {} };
  vm.createContext(ctx);
  vm.runInContext(block("const PEOPLE=", "const TRAIT_LABEL=") + block("const GIFTS=", "// Spoken lines") +
    block("function talkKey(", "// knocking someone"), ctx);
  return {ctx, run: s => vm.runInContext(s,ctx)};
}
test("every UTC cycle schedules exactly one birthday per day, in a fixed resident slot", () => {
  const { run } = game("cheerful");
  expect(run("PEOPLE.map(person => birthdayOf(person.id))")).toEqual(Array.from({ length: 16 }, (_, id) => id));
  for (const start of [0, 48, 20000]) {
    expect(run(`Array.from({length:16}, (_,offset) =>
      PEOPLE.filter(person => isBirthday(person.id, ${start}+offset)).map(person => person.id))`))
      .toEqual(Array.from({ length: 16 }, (_, id) => [id]));
  }
  expect(run('[birthdayOf(-1), birthdayOf(16), birthdayOf("1"), birthdayOf(1.5)]')).toEqual([null,null,null,null]);
  expect(run("[isBirthday(1, 49.5), isBirthday(15, -1), isBirthday(0, Infinity)]")).toEqual([false,false,false]);
});
test("opening a conversation mentions the birthday only on its UTC day", () => {
  const { ctx,run } = game("grumpy");
  Object.assign(ctx, { talkable: () => true, personOf: () => ctx.who, isTouch: true, FOOT: { x: 0, z: 0 }, emote() {}, show() {} });
  ctx.who = ctx.TALK.person;
  vm.runInContext(block("function talkOpen(", "function talkClose("), ctx);
  let clock = 49 * 86400000 - 1;
  ctx.Date = { now: () => clock };
  run("talkOpen({x:1,z:0})");
  expect(ctx.line).toBe("Jo remembers you.");
  clock++;
  run("talkOpen({x:1,z:0})");
  expect(ctx.line).toBe("Jo remembers you. “It's my birthday today.”");
  clock += 86400000;
  expect(run("birthdayLine(1)")).toBe("");
});
test("a birthday doubles the normal rounded gift gain with the same charge, daily limit and Generous record", () => {
  for (const [id,price] of [["coffee",120],["book",180],["flowers",250]]) {
    const ordinary = game("grumpy"), birthday = game("grumpy");
    const { ctx,run } = birthday;
    let clock = 49 * 86400000;
    ctx.Date = { now: () => clock };
    ctx.r.f = ordinary.ctx.r.f = 20;
    expect(ordinary.run(`talkGift("${id}")`)).toBe(true);
    expect(run(`talkGift("${id}")`)).toBe(true);
    expect(ctx.r.f - 20).toBe(2 * (ordinary.ctx.r.f - 20));
    expect([ctx.save.cr,ctx.xp,ctx.writes,ctx.wants]).toEqual([500-price,3,1,["gift"]]);
    expect(ctx.feelings).toEqual(id==="coffee" ? [["happy","Jo loved your gift"]] : []);
    expect(ctx.save).toEqual({ cr: 500-price, gift: { v: 1, day: 49, ids: [1] }, gifted: [1] });
    ctx.TALK.busy = 0;
    expect(run('talkGift("book")')).toBe(false);
    clock += 86400000;
    expect(run('talkGift("book")')).toBe(true);
    expect(ctx.save.gift).toEqual({ v: 1, day: 50, ids: [1] });
    expect(ctx.save.gifted).toEqual([1]);
  }
});
for (const [trait,fav,disliked] of [["cheerful","flowers","gadget"],["grumpy","coffee","flowers"],
  ["joker","gadget","book"],["chatty","book","coffee"],["shy","flowers","coffee"],["busy","coffee","flowers"]]) {
  test(trait + " reacts to four priced gifts and can receive one per UTC day", () => {
    for (const [id,price] of Object.entries({ flowers:250, coffee:120, book:180, gadget:400 })) {
      const { ctx,run } = game(trait);
      expect(run('talkGift("' + id + '")')).toBe(true);
      expect(ctx.r.f).toBe(13 + Math.round((id===fav ? 15 : id===disliked ? 4 : 10)*(1-13/125)));
      expect([ctx.save.cr,ctx.xp,ctx.writes,ctx.wants]).toEqual([500-price,3,1,["gift","friendly"]]);
      // and kept, once, among everyone who has ever had one
      expect(ctx.save.gifted).toEqual([1]);
      // in their own words for a favourite and for one they don't care for; anything else, a polite thank you
      expect(ctx.line).toMatch(id===fav ? /^Jo loves the / : id===disliked ? /^Jo takes the .* politely\. / : /^Jo likes the .*kind of you/);
      ctx.TALK.busy=0;
      expect(run('talkGift("coffee")')).toBe(false);
      expect(ctx.writes).toBe(1);
      ctx.save.gift.day--;
      expect(run('giftGiven(1)')).toBe(false);
    }
  });
}
test("controller, keyboard, cancel and unaffordable choices", () => {
  const { ctx,run } = game("joker");
  ctx.save.cr=200;
  run('talkKey("9")'); expect(ctx.focus).toBe("tk-coffee");
  // the line above asks, and Back puts back what was there
  expect(ctx.$("tkLine").textContent).toBe("What will you give Jo?");
  expect(run('tkButtons().map(b=>b.id)')).toEqual(["tk-coffee","tk-book","tk-back"]);
  run("talkPad(i=>i===15);talkPad(i=>i===0)"); expect(ctx.clicked).toBe("tk-book");
  run("talkPad(i=>i===1)"); expect(ctx.focus).toBe("tkGift");
  expect(ctx.$("tkLine").textContent).toBe("Jo is glad to see you.");
  run('talkKey("9");talkKey("4");talkKey("escape")'); expect(ctx.writes).toBe(0);
  run('talkKey("9");talkKey("3")'); expect([ctx.writes,ctx.save.cr]).toEqual([1,20]);
});
test("a clock put back while playing doesn't reopen today's gifts: the latest day is kept", () => {
  const { ctx, run } = game("grumpy");
  ctx.Date = { now: () => 50 * 86400000 };
  expect(run('talkGift("coffee")')).toBe(true);
  ctx.TALK.busy = 0; ctx.Date = { now: () => 49 * 86400000 };
  expect(run('[giftGiven(1), talkGift("book")]')).toEqual([true, false]);
  // someone else can still have one, kept on the later day
  ctx.TALK.person = { trait: "shy", id: 2, name: "Sam" };
  expect(run('talkGift("flowers")')).toBe(true);
  expect(ctx.save.gift).toEqual({ v: 1, day: 50, ids: [1, 2] });
  ctx.Date = { now: () => 50 * 86400000 }; ctx.TALK.busy = 0;
  expect(run('[giftGiven(1), giftGiven(2), talkGift("gadget")]')).toEqual([true, true, false]);
});
test("today's recipients follow the account on restore or equal-progress sync", () => {
  const core=fs.readFileSync(require.resolve("../js/core.js"),"utf8");
  const day=Math.floor(Date.now()/86400000), rec=(d,ids)=>({v:1,day:d,ids});
  const g=vm.createContext({local:rec(day,[1,3]),remote:rec(day,[2,3])});
  vm.runInContext(core.slice(core.indexOf("function giftClean("),core.indexOf("function photoDayClean(")),g);
  expect(vm.runInContext("giftSync(local,remote,false)",g)).toEqual(rec(day,[1,2,3]));
  expect(vm.runInContext("giftSync(local,remote,true)",g)).toEqual(rec(day,[2,3]));
  g.local.day--;
  expect(vm.runInContext("giftSync(local,remote,false)",g)).toEqual(rec(day,[2,3]));
});

test("correcting the clock in play allows another gift on the next corrected UTC day", () => {
  const { ctx, run } = game("grumpy");
  ctx.save.gift = { v: 1, day: 55, ids: [0] };
  ctx.Date.now = () => 50 * 86400000;
  expect(run('talkGift("coffee")')).toBe(true);
  ctx.Date.now = () => 51 * 86400000;
  ctx.TALK.busy = 0;
  expect(run('talkGift("coffee")')).toBe(true);
});
