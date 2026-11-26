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
  box.children = [btn("tkGift"), btn("bye"), ...["flowers","coffee","book","gadget","back"].map(id => btn("tk-" + id,id))];
  const ctx = { $: id => buttons[id], TALK: { p: {}, person: { trait, id: 1, name: "Jo" }, busy: 0, n: 0, end: 0 },
    tabIdle: false, save: { cr: 500, gift: { day: -1, ids: [] } }, Date, xp: 0, writes: 0, wants: [],
    r: { f: 13, n: 2 }, rel: () => ctx.r, relSet: (_, f, n) => { ctx.r = { f,n }; },
    skillFactor: () => 1, skillAward: (_, xp) => { ctx.xp += xp; }, updateMoney() {}, NS: { t: 1, social: {} },
    needsAdd() {}, emote() {}, RIDE_AT: 40, wantEvent: k => ctx.wants.push(k),
    talkShow() {}, persist: () => ctx.writes++, talkClose() {} };
  vm.createContext(ctx);
  vm.runInContext(block("const GIFTS=", "// Spoken lines") + block("function talkKey(", "// knocking someone"), ctx);
  return {ctx, run: s => vm.runInContext(s,ctx)};
}
for (const [trait,fav,disliked] of [["cheerful","flowers","gadget"],["grumpy","coffee","flowers"],
  ["joker","gadget","book"],["chatty","book","coffee"],["shy","flowers","coffee"],["busy","coffee","flowers"]]) {
  test(trait + " reacts to four priced gifts and can receive one per UTC day", () => {
    for (const [id,price] of Object.entries({ flowers:250, coffee:120, book:180, gadget:400 })) {
      const { ctx,run } = game(trait);
      expect(run('talkGift("' + id + '")')).toBe(true);
      expect(ctx.r.f).toBe(13 + Math.round((id===fav ? 15 : id===disliked ? 4 : 10)*(1-13/125)));
      expect([ctx.save.cr,ctx.xp,ctx.writes,ctx.wants]).toEqual([500-price,3,1,["gift","friendly"]]);
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
  expect(run('tkButtons().map(b=>b.id)')).toEqual(["tk-coffee","tk-book","tk-back"]);
  run("talkPad(i=>i===15);talkPad(i=>i===0)"); expect(ctx.clicked).toBe("tk-book");
  run("talkPad(i=>i===1)"); expect(ctx.focus).toBe("tkGift");
  run('talkKey("9");talkKey("4");talkKey("escape")'); expect(ctx.writes).toBe(0);
  run('talkKey("9");talkKey("3")'); expect([ctx.writes,ctx.save.cr]).toEqual([1,20]);
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
