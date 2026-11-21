// A stand-in for Firebase's Realtime Database, for the Firebase side of js/net.js. One shared tree for every page
// attached to it; every write is checked against the real database.rules.json by targaryen (an independent
// implementation of the rules language), so a write the published rules would refuse is refused here too. Each page
// gets a small copy of the compat SDK calls the game makes (initializeApp, anonymous sign-in, ref, once, on/off,
// set, remove, onDisconnect, .info/connected, goOnline/goOffline), served in place of the Firebase scripts. Pages
// poll every 40 ms; the real database pushes. drop() cuts a page's connection the way a lost network does: the
// database carries out what that connection asked onDisconnect() to do, without checking the rules again, as
// Firebase's servers do. restore() brings it back.
const crypto = require("crypto");
const targaryen = require("targaryen");
const rules = require("../../database.rules.json");

const PAGE_SDK = `(()=>{"use strict";
const call=m=>window.__rtdb(m),conn=Math.random().toString(36).slice(2);
let uid=null,online=true;const L=[],queue=[];
const clone=v=>v==null?null:JSON.parse(JSON.stringify(v));
// val() as the SDK gives it: an object whose keys are 0, 1, 2… (most of them there) comes back as an array
const arr=v=>{if(!v||typeof v!=="object")return v;const k=Object.keys(v),o={};for(const x of k)o[x]=arr(v[x]);
  if(k.length&&k.every(x=>/^(0|[1-9]\\d*)$/.test(x))){const n=Math.max(...k.map(Number));if(n<2*k.length)return Array.from({length:n+1},(_,i)=>o[i]===undefined?null:o[i])}return o};
const at=(v,p)=>{for(const k of String(p).split("/").filter(Boolean))v=v!=null&&typeof v==="object"?v[k]:null;return v===undefined?null:v};
const snap=(key,v)=>({key,val:()=>arr(clone(v)),exists:()=>v!=null,child:p=>snap(String(p).split("/").pop(),at(v,p)),
  forEach(f){if(v&&typeof v==="object")for(const k of Object.keys(v))if(f(snap(k,v[k])))return true;return false}});
const check=r=>{if(r&&r.denied){const e=new Error("PERMISSION_DENIED: Permission denied");e.code="PERMISSION_DENIED";throw e}return r};
// writes wait while the connection is down, as the SDK's do
const send=m=>new Promise((res,rej)=>{const go=()=>call(Object.assign({conn,uid},m)).then(r=>{if(r&&r.offline){queue.push(go);return}try{res(check(r))}catch(e){rej(e)}},rej);online?go():queue.push(go)});
function ref(path){path=String(path).replace(/^\\/+|\\/+$/g,"");const key=path.split("/").pop()||null;
  return{key,child:p=>ref(path+"/"+p),
    once:()=>call({op:"get",conn,uid,path}).then(check).then(r=>snap(key,r.value)),
    set:v=>send({op:"set",path,value:clone(v)}),remove:()=>send({op:"set",path,value:null}),
    on(type,cb){const l={path,type,cb,last:undefined};L.push(l);
      if(path===".info/connected"){setTimeout(()=>cb(snap("connected",online)),0);return cb}
      call({op:"get",conn,uid,path}).then(r=>{if(!L.includes(l))return;const v=r&&!r.denied?r.value:null;l.last=clone(v);
        if(type==="child_added"&&v&&typeof v==="object")for(const k of Object.keys(v))cb(snap(k,v[k]));if(type==="value")cb(snap(key,v))});return cb},
    off(){for(let i=L.length-1;i>=0;i--)if(L[i].path===path)L.splice(i,1)},
    onDisconnect:()=>({remove:()=>send({op:"ondisc",path}),cancel:()=>send({op:"ondisc-cancel",path})})}}
function diff(l,v){const was=l.last;l.last=clone(v);const a=was&&typeof was==="object"?was:{},b=v&&typeof v==="object"?v:{},same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(l.type==="value"){if(!same(was,v))l.cb(snap(l.path.split("/").pop(),v));return}
  if(l.type==="child_added")for(const k of Object.keys(b))if(!(k in a))l.cb(snap(k,b[k]));
  if(l.type==="child_changed")for(const k of Object.keys(b))if(k in a&&!same(a[k],b[k]))l.cb(snap(k,b[k]));
  if(l.type==="child_removed")for(const k of Object.keys(a))if(!(k in b))l.cb(snap(k,a[k]))}
setInterval(()=>{const paths=[...new Set(L.filter(l=>l.path!==".info/connected"&&l.last!==undefined).map(l=>l.path))];
  call({op:"poll",conn,uid,paths}).then(r=>{if(!r)return;
    if(r.online!==online){online=r.online;for(const l of L.filter(l=>l.path===".info/connected"))l.cb(snap("connected",online));if(online)queue.splice(0).forEach(f=>f())}
    for(const l of L.slice())if(l.path in r.values&&l.last!==undefined)diff(l,r.values[l.path])}).catch(()=>{})},40);
const auth={currentUser:null,signInAnonymously:()=>call({op:"signin",conn}).then(u=>{uid=u;auth.currentUser={uid:u};return{user:auth.currentUser}})};
const database={ref,goOnline:()=>{call({op:"up",conn})},goOffline:()=>{call({op:"down",conn})}};
const apps=[];window.firebase={apps,initializeApp(options,name="[DEFAULT]"){const a={name,options,auth:()=>auth,database:()=>database};apps.push(a);return a}};
})();`;
const FILES = { "firebase-app-compat.js": PAGE_SDK, "firebase-auth-compat.js": "/* in firebase-app-compat.js */", "firebase-database-compat.js": "/* in firebase-app-compat.js */" };
const sri = (s) => "sha384-" + crypto.createHash("sha384").update(s).digest("base64");
const FIREBASE_URL = /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/firebase\/[\d.]+\/(firebase-[a-z]+-compat\.js)$/;

const setIn = (root, path, value) => {
  const keys = path.split("/").filter(Boolean), top = root && typeof root === "object" ? JSON.parse(JSON.stringify(root)) : {};
  let o = top;
  keys.slice(0, -1).forEach((k) => { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; });
  if (value == null) delete o[keys[keys.length - 1]]; else o[keys[keys.length - 1]] = value;
  return top;
};

class FakeRtdb {
  constructor() { this.db = targaryen.database(rules, null); this.conns = new Map(); this.denied = []; this.writes = 0; }
  value(path) { return this.db.snapshot(path).val(); }
  // put data in place without the rules (the other players already in a room)
  seed(path, value) { this.db = targaryen.database(rules, setIn(this.db.snapshot("/").val(), path, value)); }
  auth(uid) { return uid ? { uid, provider: "anonymous" } : null; }
  write(uid, path, value) {
    const r = this.db.as(this.auth(uid)).write(path, value);
    if (!r.allowed) { this.denied.push({ uid, path }); return false; }
    this.db = r.newDatabase; this.writes++; return true;
  }
  // what the database does when a connection goes: the removals it was asked for, rules not checked again
  disconnect(c) { for (const p of c.ondisc) this.seed(p, null); c.ondisc.clear(); c.online = false; }
  drop(uid) { for (const c of this.conns.values()) if (c.uid === uid) this.disconnect(c); }
  restore(uid) { for (const c of this.conns.values()) if (c.uid === uid) c.online = true; }
  handle(user, m) {
    let c = this.conns.get(m.conn);
    if (!c) this.conns.set(m.conn, (c = { uid: null, online: true, ondisc: new Set() }));
    const readable = (p) => this.db.as(this.auth(c.uid)).read(p).allowed;
    switch (m.op) {
      case "signin": c.uid = user; return user;
      case "get": return readable(m.path) ? { value: this.value(m.path) } : { denied: true };
      case "poll": return { online: c.online, values: Object.fromEntries(m.paths.map((p) => [p, readable(p) ? this.value(p) : null])) };
      case "set": if (!c.online) return { offline: true }; return this.write(c.uid, m.path, m.value) ? { ok: true } : { denied: true };
      case "ondisc":
        if (!c.online) return { offline: true };
        // checked when it's asked for, like the real database
        if (!this.db.as(this.auth(c.uid)).write(m.path, null).allowed) { this.denied.push({ uid: c.uid, path: m.path, ondisc: true }); return { denied: true }; }
        c.ondisc.add(m.path); return { ok: true };
      case "ondisc-cancel": for (const p of [...c.ondisc]) if (p === m.path || p.startsWith(m.path + "/")) c.ondisc.delete(p); return { ok: true };
      case "down": this.disconnect(c); return { ok: true };
      case "up": c.online = true; return { ok: true };
    }
    return null;
  }
  // a page plays as `user` against this database: the stand-in SDK is served in place of Firebase's scripts
  async attach(page, user) {
    await page.context().exposeBinding("__rtdb", (_src, m) => this.handle(user, m));
    await page.route(FIREBASE_URL, (r) => r.fulfill({ body: FILES[FIREBASE_URL.exec(r.request().url())[1]], contentType: "text/javascript", headers: { "access-control-allow-origin": "*" } }));
    await page.evaluate((h) => Object.assign(FB_SRI, h), Object.fromEntries(Object.entries(FILES).map(([f, s]) => [f, sri(s)])));
  }
}
module.exports = { FakeRtdb };
