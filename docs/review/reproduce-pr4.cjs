// Isolated source-level reproductions; not a substitute for browser tests.
// Run: NODE_PATH=/path/to/node_modules node docs/review/reproduce-pr4.cjs /path/to/pr4/index.html
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),espree=require('espree');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
const ast=espree.parse(code,{ecmaVersion:'latest',range:true});
const nodes=[];const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration')nodes.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)};walk(ast);
const fn=name=>{const n=nodes.find(n=>n.id.name===name);assert(n,name);return code.slice(...n.range)};
const noop=()=>{};const light={position:{set:noop},target:{position:{set:noop}}};
const c={save:{cur:'golf',owned:['golf','mini'],rec:{},ghost:{}},curId:'tt',P:{x:0,z:0,h:0},pc:null,
 testDrive:{id:'tt',prev:'st0',damage:0},headLight:light,fillLight:light,repairWarnLevel:0,
 getCar:()=>({G:{visible:true,add:noop},front_z:2}),showDamageSmoke:noop,show:noop,damageWarnTier:()=>0,openDealer:noop};
vm.createContext(c);vm.runInContext(fn('attachCar')+'\n'+fn('finishTestDrive'),c);c.finishTestDrive(false);
assert.equal(c.save.cur,'st0');console.log('CONFIRMED: returning a dealer test drive writes save.cur=st0');
Object.assign(c,{curId:'st0',ev:{E:{id:'oldtown',type:'tt',rewards:[0,0,0,0],route:{len:100}},tg:{gold:20,silver:30,bronze:40},t:10,rec:[0,0,0,0,1,1,0,10]},fmtT:String,fmtCr:String,persist:noop,earn:noop,beep:noop,$:()=>({classList:{remove:noop}})});
vm.runInContext(fn('finishEvent'),c);c.finishEvent(10);
assert.equal(c.save.ghost.oldtown.c,'st0');console.log('CONFIRMED: time-trial record writes ghost car st0 (not a CARS id; rejected at load)');
