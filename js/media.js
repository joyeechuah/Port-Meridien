// Port Meridien: Sound effects, music and Photo Mode.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ AUDIO */
let AC=null,AU=null;
function audioInit(){
  if(AC)return;
  try{
    // ?audio=safe in the address asks for a larger sound buffer, ?audio=fast for the default small one: a switch for
    // comparing them on a phone. Without it nothing changes
    const ACtor=window.AudioContext||window.webkitAudioContext,aq=/[?&]audio=(fast|safe)/.exec(location.search);
    try{AC=new ACtor(aq&&aq[1]==="safe"?{latencyHint:"playback"}:undefined)}catch(e){AC=new ACtor()}
    perfAudio(AC);
    const master=AC.createGain();master.gain.value=0;master.connect(AC.destination);
    const o1=AC.createOscillator();o1.type="sawtooth";const o2=AC.createOscillator();o2.type="square";
    const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.value=700;const eg=AC.createGain();eg.gain.value=0;
    o1.connect(f);o2.connect(f);f.connect(eg);eg.connect(master);o1.start();o2.start();
    const buf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;
    o1.frequency.value=60;o2.frequency.value=30;
    const ns=AC.createBufferSource();ns.buffer=buf;ns.loop=true;
    // one noise source feeds four layers: tyre squeal on asphalt, tyre rumble and gravel
    // crunch off the road, and a scrape for sliding along walls and guardrails
    const chan=(type,fq,q)=>{const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=fq;if(q)fl.Q.value=q;const g=AC.createGain();g.gain.value=0;ns.connect(fl);fl.connect(g);g.connect(master);return g};
    const sg=chan("bandpass",2300,1.3),rg=chan("lowpass",230),cg=chan("bandpass",1150,.8),scg=chan("bandpass",1700,2.2);
    ns.start();
    AU={master,o1,o2,f,eg,sg,rg,cg,scg,buf};
  }catch(e){AC=null}
}
// wake the audio clock: "suspended" here, or "interrupted" on an iPhone after a call, Siri or an alarm
function acResume(){if(tabIdle||!AC||AC.state==="running"||AC.state==="closed")return;try{const p=AC.resume();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
function audioOn(on){if(!AU)return;if(on)acResume();AU.master.gain.setTargetAtTime(on&&save.sound?1:0,AC.currentTime,.12)}
// surf: 0 on asphalt, 1 on the gravel verge, 2 on grass and dirt
// vol: how much of the engine is heard (0 with the engine off, on foot). wash: water along a boat's hull
function audioUpd(rpm,gear,thr,slip,surf,speed,scrape,vol=1,wash=0){if(!AU)return;const t=AC.currentTime,sp=pc&&pc.mods&&pc.mods.exhS?1:0,base=(50+rpm*175+gear*6)*(sp?.88:1);
  AU.o1.frequency.setTargetAtTime(base,t,.05);AU.o2.frequency.setTargetAtTime(base*.5,t,.05);
  AU.f.frequency.setTargetAtTime(380+rpm*2400+thr*500+sp*350,t,.08);AU.eg.gain.setTargetAtTime((.02+thr*.035+rpm*.025)*(sp?1.45:1)*vol,t,.08);
  AU.sg.gain.setTargetAtTime(surf?0:clamp((slip-2.5)*.012,0,.08),t,.06);
  AU.rg.gain.setTargetAtTime(surf?Math.min(.24,speed*.008):Math.min(.2,wash*.011),t,.08);
  AU.cg.gain.setTargetAtTime(surf?Math.min(.06,speed*.0022)*(surf===1?1.4:.7):0,t,.08);
  AU.scg.gain.setTargetAtTime(Math.min(.12,(scrape||0)*.12),t,.04)}
function playBrush(v){if(!AU||!save.sound||state!=="DRIVE")return;const s=AC.createBufferSource();s.buffer=AU.buf;const f=AC.createBiquadFilter();f.type="bandpass";f.frequency.value=700;f.Q.value=.7;const g=AC.createGain();
  g.gain.setValueAtTime(.05+.08*v,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.28);s.connect(f);f.connect(g);g.connect(AU.master);s.start(0,Math.random()*.5);s.stop(AC.currentTime+.3)}
function playThump(v){if(!AU||!save.sound)return;const s=AC.createBufferSource();s.buffer=AU.buf;const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.value=320;const g=AC.createGain();
  g.gain.setValueAtTime(Math.min(.6,v*.03),AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.35);s.connect(f);f.connect(g);g.connect(AU.master);s.start();s.stop(AC.currentTime+.4)}
function beep(fq){if(!AU||!save.sound)return;const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=fq;o.type="triangle";g.gain.setValueAtTime(.12,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.25);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+.3)}

/* ================================================================ MUSIC
   Two original tracks, composed here and played live through Web Audio, so there are no audio
   files and nothing to license:
     "Cala Lounge"  92 BPM, a slow electric-piano groove for the garage and the dealership
     "Coast Road"  118 BPM, sunny Balearic house for driving, in a 32-bar arrangement
   A small step sequencer schedules sixteenth notes a fraction of a second ahead of the audio
   clock. makeMusic works on any audio context, so the same code can be rendered offline. */
const mtof=n=>440*Math.pow(2,(n-69)/12);
function makeMusic(ctx,out){
  const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);{const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  // shared output: a gentle compressor keeps the peaks in check, and one short room reverb
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=10;comp.ratio.value=3;comp.attack.value=.008;comp.release.value=.25;comp.connect(out);
  const rev=ctx.createConvolver();{const n=Math.floor(ctx.sampleRate*2.1),b=ctx.createBuffer(2,n,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3)}rev.buffer=b}
  const revOut=ctx.createGain();revOut.gain.value=.42;rev.connect(revOut);revOut.connect(comp);

  // a bus per track: its own level, a tone filter and a dotted-eighth echo
  function makeBus(bpm){
    const B={in:ctx.createGain(),out:ctx.createGain(),tone:ctx.createBiquadFilter(),rv:ctx.createGain(),dl:ctx.createGain()};
    B.tone.type="lowpass";B.tone.frequency.value=18000;B.tone.Q.value=.5;
    B.in.connect(B.tone);B.tone.connect(B.out);B.out.connect(comp);B.out.gain.value=0;
    B.rv.connect(rev);
    const d=ctx.createDelay(2),fb=ctx.createGain(),lp=ctx.createBiquadFilter(),dOut=ctx.createGain();
    d.delayTime.value=60/bpm*.75;lp.type="lowpass";lp.frequency.value=2400;fb.gain.value=.36;dOut.gain.value=.5;
    B.dl.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(dOut);dOut.connect(B.tone);
    B.kill=()=>{for(const k of ["in","out","tone","rv","dl"])B[k].disconnect();d.disconnect();lp.disconnect();fb.disconnect();dOut.disconnect()};
    return B;
  }
  const send=(src,dst,amt)=>{if(amt>0){const g=ctx.createGain();g.gain.value=amt;src.connect(g);g.connect(dst)}};

  // ---- instruments (t is the start time on the audio clock)
  function kick(B,t,v){const o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(46,t+.1);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.36);
    o.connect(g);g.connect(B.in);o.start(t);o.stop(t+.4)}
  function hit(B,t,v,type,fq,q,dec,rv){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=noise;f.type=type;f.frequency.value=fq;f.Q.value=q;
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dec);
    s.connect(f);f.connect(g);g.connect(B.in);send(g,B.rv,rv||0);s.start(t,Math.random()*.8);s.stop(t+dec+.02)}
  function bass(B,t,n,dur,v,cut){const o=ctx.createOscillator(),s=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),gs=ctx.createGain();
    o.type="sawtooth";o.frequency.value=mtof(n);s.frequency.value=mtof(n);gs.gain.value=.7;
    f.type="lowpass";f.Q.value=3;f.frequency.setValueAtTime(cut*2.4,t);f.frequency.exponentialRampToValueAtTime(cut,t+.12);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.setValueAtTime(v,t+dur*.75);g.gain.exponentialRampToValueAtTime(.001,t+dur+.06);
    o.connect(f);f.connect(g);s.connect(gs);gs.connect(g);g.connect(B.in);o.start(t);s.start(t);o.stop(t+dur+.1);s.stop(t+dur+.1)}
  // two-operator FM: a bright bell-like attack that mellows out, the classic electric-piano sound
  function epiano(B,t,n,dur,v,rv){const c=ctx.createOscillator(),m=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain(),f=mtof(n);
    c.frequency.value=f;m.frequency.value=f;
    mg.gain.setValueAtTime(f*1.4,t);mg.gain.exponentialRampToValueAtTime(f*.12,t+.5);m.connect(mg);mg.connect(c.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(v*.4,t+.45);
    g.gain.setValueAtTime(v*.4,t+Math.max(.46,dur));g.gain.exponentialRampToValueAtTime(.001,t+Math.max(.46,dur)+.4);
    c.connect(g);g.connect(B.in);send(g,B.rv,rv);const e=t+Math.max(.46,dur)+.45;c.start(t);m.start(t);c.stop(e);m.stop(e)}
  function pad(B,t,n,dur,v,cut){const f=ctx.createBiquadFilter(),g=ctx.createGain();f.type="lowpass";f.frequency.value=cut;f.Q.value=.7;
    const os=[-7,7].map(dt=>{const o=ctx.createOscillator();o.type="sawtooth";o.frequency.value=mtof(n);o.detune.value=dt;o.connect(f);return o});
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.5);g.gain.setValueAtTime(v,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.8);
    f.connect(g);g.connect(B.in);send(g,B.rv,.7);os.forEach(o=>{o.start(t);o.stop(t+dur+.85)})}
  function pluck(B,t,n,v){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type="square";o.frequency.value=mtof(n);
    f.type="lowpass";f.frequency.setValueAtTime(2600,t);f.frequency.exponentialRampToValueAtTime(600,t+.2);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.26);
    o.connect(f);f.connect(g);g.connect(B.in);send(g,B.dl,.8);send(g,B.rv,.25);o.start(t);o.stop(t+.3)}
  const chord=(B,t,notes,dur,v,rv)=>notes.forEach(n=>epiano(B,t,n,dur,v,rv));

  // ---- the songs. Chords are [bass root, [voicing]], one per bar, MIDI note numbers
  const TRACKS={
    lounge:{bpm:92,level:1.25,
      // ii-V-I-vi in C: Dm9, G13, Cmaj9, Am9
      ch:/** @type {[number, number[]][]} */ ([[38,[53,57,60,64]],[43,[53,59,64,69]],[36,[52,55,59,62]],[45,[55,60,64,71]]]),
      step(B,bar,s,t,q){const c=bar%16,[root,v]=this.ch[bar%4],next=this.ch[(bar+1)%4][0],late=c>=8;
        if(s===0)kick(B,t,.42);if(s===10)kick(B,t,.26);if(bar%4===3&&s===14)kick(B,t,.18);
        if(s===4||s===12)hit(B,t,.11,"bandpass",1800,2.5,.08,.3);
        if(s%2===0)hit(B,t,s%4===2?.045:.028,"highpass",7500,.7,.05);else if(late)hit(B,t,.014,"highpass",8000,.7,.03);
        if(s===14)hit(B,t,.028,"highpass",6500,.7,.2);
        if(s===0)bass(B,t,root+12,q*5.5,.2,320);if(s===7)bass(B,t,root+12,q*1.3,.13,320);
        if(s===10)bass(B,t,root+19,q*2.5,.15,320);if(s===14)bass(B,t,next+11,q*1.3,.12,320);
        if(s===0)chord(B,t,v,q*5,.05,.4);if(s===6)chord(B,t,v,q*1.6,.032,.4);if(s===11&&bar%2===1)chord(B,t,v,q*3,.038,.4);
        if(late&&s===0)v.forEach(n=>pad(B,t,n-12,q*15,.012,900));
        if(late&&s%2===0){const pat=[0,1,2,3,2,1,3,1];pluck(B,t,v[pat[(s/2)%8]]+12,.022)}}},
    coast:{bpm:118,level:.8,
      // i-VI-III-VII in A minor: Am9, Fmaj7, Cmaj7, Gadd9
      ch:/** @type {[number, number[]][]} */ ([[33,[55,60,64,71]],[29,[53,57,60,64]],[36,[52,55,59,64]],[31,[55,59,62,69]]]),
      step(B,bar,s,t,q){const c=bar%32,[root,v]=this.ch[bar%4];
        const sec=c<8?"A":c<16?"B":c<20?"brk":c<24?"build":"C",full=sec==="A"||sec==="B"||sec==="C";
        // drums: four on the floor, claps on 2 and 4, open hats on the off-beats; the break drops the beat
        if(full&&s%4===0)kick(B,t,.5);
        if(sec==="build"&&(c<22?s%8===0:s%4===0))kick(B,t,.42);
        if(sec==="build"&&c===23&&s>=8&&s%2===0)hit(B,t,.03+(s-8)*.008,"bandpass",1700,2,.07);
        if(full&&(s===4||s===12))hit(B,t,.13,"bandpass",1500,1.6,.12,.25);
        if(full&&s%4===2)hit(B,t,.042,"highpass",7000,.7,.12);
        if((sec==="B"||sec==="C")&&s%2===1)hit(B,t,.016,"highpass",9000,.7,.03);
        // octave-jumping house bass on the off-beats
        if(full||(sec==="build"&&c>=22)){const bp={0:[0,1.5,.2],2:[12,1.4,.16],6:[12,1.4,.16],8:[0,1.2,.17],10:[12,1.4,.16],14:[12,1.2,.14]}[s];
          if(bp)bass(B,t,root+12+bp[0],q*bp[1],bp[2],420)}
        // electric-piano stabs, long chords in the break
        if(full&&(s===3||s===10))chord(B,t,v,q*1.8,.036,.3);
        if(sec==="brk"&&s===0)chord(B,t,v,q*14,.04,.5);
        if(sec!=="A"&&s===0)v.forEach(n=>pad(B,t,n-12,q*15.5,sec==="brk"?.016:.01,sec==="brk"?1400:1000));
        // sixteenth-note arpeggio through the echo
        if(sec!=="A"&&(sec!=="build"||s%2===0)){const pat=[0,2,1,3,2,0,3,1,0,2,3,1,2,3,1,2];pluck(B,t,v[pat[s]]+12,sec==="brk"?.03:.024)}}}
  };

  const T={};   // playing tracks by name
  return {
    TRACKS,
    // fade a track in (starting from its first bar) or out
    set(name,level,now){
      for(const k in T)if(k!==name&&T[k].want>0){T[k].want=0;T[k].bus.out.gain.setTargetAtTime(0,now,.45);T[k].end=now+2.5}
      if(!name)return;
      let p=T[name];
      if(!p){const def=TRACKS[name];p=T[name]={def,bus:makeBus(def.bpm),bar:0,s:0,next:now+.08,want:-1}}
      const lv=level*p.def.level;
      if(Math.abs(p.want-lv)>.001){p.want=lv;p.end=0;p.bus.out.gain.setTargetAtTime(lv,now,lv>0?.6:.45)}
    },
    tone(name,hz,now){if(T[name])T[name].bus.tone.frequency.setTargetAtTime(hz,now,1.5)},
    // schedule everything due in the next lookahead seconds
    tick(now,ahead){
      for(const k in T){const p=T[k];
        if(p.end&&now>p.end){p.bus.kill();delete T[k];continue}
        if(p.next<now-.25){p.next=now+.05}   // fell behind (tab throttled): skip ahead rather than burst
        const q=60/p.def.bpm/4;
        while(p.next<now+ahead){p.def.step(p.bus,p.bar,p.s,p.next,q);p.next+=q;if(++p.s===16){p.s=0;p.bar++}}
      }
    },
    playing(){return Object.keys(T).filter(k=>T[k].want>0)}
  };
}

// ---- recorded tracks: five songs supplied for Port Meridien, in the audio folder. Each file plays its
// opening once, then loops a section that starts at `offset` and lasts L seconds; every repeat fades in over
// the X-second tail of the one before, scheduled on the audio clock so the beat never drifts.
// The composed tracks above stand in while a file loads, and for good if files can't be fetched (a page
// opened straight from disk can't). Only the songs in use are kept decoded, to spare memory on phones.
const SONGS={
  lounge:{url:"audio/showroom.mp3",offset:54.75,L:85.33325,X:1.5,gain:.58},   // Dusk Fitting Room
  coast:{url:"audio/cruise.mp3",offset:40.25,L:73.845875,X:1.5,gain:.28},      // Harbour Lights Outer Road
  race:{url:"audio/highway.mp3",offset:37.05,L:81.10625,X:1.5,gain:.3},       // Coastal Checkpoint
  chase:{url:"audio/chase.mp3",offset:32.05,L:97.999625,X:1.5,gain:.32},         // Harbor Chase Loop
  reveal:{url:"audio/reveal.mp3",once:true,gain:.5}                              // Harbour Reveal
};
let MUSIC=null,songOut=null;
function musicInit(){if(MUSIC||!AC)return;try{
  // mixed to sit just under the engine on the road; the garage music a little fuller, with no engine to compete with
  // On a phone the composed backup isn't built at all: playing it live overloaded an Android phone's audio thread
  // (over a thousand underruns a minute, heard as the whole sound breaking up) whenever the songs failed to load.
  // There, music is simply silent until a song loads; the engine and effects carry on
  const g=AC.createGain();g.gain.value=.32;g.connect(AC.destination);MUSIC=isTouch?{set(){},tone(){},tick(){}}:makeMusic(AC,g);
  songOut=AC.createGain();songOut.connect(AC.destination)}catch(e){MUSIC=null}}
// a song that fails to load (or to decode) is tried again 3, 10 and 30 s later; S.err says why it failed
const SONG_RETRY=[3,10,30];
function songFail(S,why){S.st="failed";S.err=why;S.bytes=null;S.tries=(S.tries||0)+1;
  S.retryAt=S.tries<=SONG_RETRY.length?performance.now()+SONG_RETRY[S.tries-1]*1000:null}
// for the ?perf panel: each song's state, and why it failed
function musicState(){return Object.keys(SONGS).map(n=>{const S=SONGS[n];return n+" "+(S.st||"-")+(S.st==="failed"&&S.err?":"+S.err+(S.retryAt!=null?" r"+S.tries+"/"+SONG_RETRY.length:""):"")}).join("\n      ")}   // one song a line: three on one line were wider than a phone
function songFetch(n){const S=SONGS[n];
  if(S.st==="failed"&&S.retryAt!=null&&performance.now()>=S.retryAt){S.st=null;S.retryAt=null}   // time to try again
  if(S.st)return;
  if(location.protocol==="file:"){S.st="failed";S.err="opened from disk";return}   // browsers won't fetch files from disk
  S.st="loading";S.askT=AC?AC.currentTime:null;
  // A connection can hang without failing, and a phone has no backup music to fall back on. So a download that
  // stops moving for 12 s (no answer, or no new data) is given up and tried again later. The clock restarts with
  // every piece that arrives, so a slow but steady download still finishes: a 2 MB song takes about 20 s at
  // 100 KB/s, and a fixed 12 s limit cut it off every time
  const controller=new AbortController();let timer=0;
  const watch=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),12000)};watch();
  fetch(S.url,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);
      if(!r.body||!r.body.getReader){
        // Without progress events, give the whole response five minutes before retrying.
        clearTimeout(timer);timer=setTimeout(()=>controller.abort(),300000);return r.arrayBuffer()
      }
      const rd=r.body.getReader(),parts=[];let n=0;
      const next=()=>rd.read().then(({done,value})=>{if(done){const b=new Uint8Array(n);let o=0;for(const p of parts){b.set(p,o);o+=p.length}return b.buffer}
        watch();parts.push(value);n+=value.length;return next()});
      return next()})
    .then(b=>{S.bytes=b;S.st="fetched"})
    .catch(e=>songFail(S,controller.signal.aborted?"timeout":/^HTTP/.test((e&&e.message)||"")?e.message:"network"))
    .finally(()=>clearTimeout(timer))}
function songDecode(n){const S=SONGS[n];if(S.st!=="fetched")return;S.st="decoding";
  AC.decodeAudioData(S.bytes.slice(0),buf=>{S.buf=buf;S.st="ready";S.err=null;S.idle=AC.currentTime},()=>songFail(S,"couldn't decode"))}
const equalPower=(up)=>{const c=new Float32Array(64);for(let i=0;i<64;i++){const t=i/63;c[i]=up?Math.sin(t*Math.PI/2):Math.cos(t*Math.PI/2)}return c};
const FADE_IN=equalPower(true),FADE_OUT=equalPower(false);
function songStart(n,now){const S=SONGS[n],P={bus:AC.createGain(),tone:AC.createBiquadFilter(),srcs:[],want:-1};
  P.tone.type="lowpass";P.tone.frequency.value=18000;P.bus.gain.value=0;P.bus.connect(P.tone);P.tone.connect(songOut);
  // first pass from the very beginning, so the opening is heard once
  const t0=now+.05,src=AC.createBufferSource(),g=AC.createGain();src.buffer=S.buf;src.connect(g);g.connect(P.bus);if(S.once){
    syncArrivalClock();
    const elapsed=arrivalTime+.05;
    if(elapsed<S.buf.duration)src.start(t0,elapsed);
  }else src.start(t0);
  P.srcs.push({src,g});P.next=S.once?Infinity:t0+S.offset+S.L;S.p=P;return P}
function songStop(n,now){const S=SONGS[n],P=S.p;if(!P||P.end)return;P.want=0;P.bus.gain.setTargetAtTime(0,now,.45);P.end=now+2.5}
function songTick(n,now){const S=SONGS[n],P=S.p;if(!P)return;
  if(P.end&&now>P.end){P.srcs.forEach(o=>{try{o.src.stop()}catch(e){}o.g.disconnect()});P.bus.disconnect();P.tone.disconnect();S.p=null;S.idle=now;return}
  // the next repeat, a second before it is due
  if(P.next<now+1){
    if(P.next<now){P.next=now+.05}   // came back from a suspended tab: just carry on
    const src=AC.createBufferSource(),g=AC.createGain(),prev=P.srcs[P.srcs.length-1];src.buffer=S.buf;src.connect(g);g.connect(P.bus);
    // each piece plays to the end of the file, which is exactly where the next fade-in finishes, so nothing is stopped
    g.gain.value=0;g.gain.setValueCurveAtTime(FADE_IN,P.next,S.X);src.start(P.next,S.offset);
    prev.g.gain.setValueCurveAtTime(FADE_OUT,P.next,S.X);
    P.srcs.push({src,g});if(P.srcs.length>2)P.srcs.shift().g.disconnect();
    P.next+=S.L}
}
// which song for which screen: the lounge indoors, the road outside, the race track during events, quieter behind menus
/** @returns {[string|null, number]} */
function musicWant(){
  if(tabIdle||!save.music)return [null,0];   // SOUND FX covers engine, tyres and beeps; music has its own switch
  if(state==="GARAGE"||state==="WARDROBE"||state==="LOAD"||state==="DEALER")return ["lounge",1];
  if(state==="ARRIVAL")return arrivalSince!==null&&!matchMedia("(prefers-reduced-motion: reduce)").matches?["reveal",1]:[null,0];
  if(state==="EXIT")return ["coast",.8];
  const road=ev?"race":WANTED.lvl?"chase":"coast";
  if(state==="PAUSE"||state==="MAP"||state==="INTRO"||state==="RESULT")return [road,.5];
  return [road,1];
}
function musicTick(){
  if(!MUSIC||!AC||AC.state!=="running")return;
  const now=AC.currentTime,[want,lv]=musicWant();
  // load ahead: the road song while you're in the garage, the race song when an event is offered
  if(want){songFetch(want);if(want==="lounge")songFetch("coast");if(state==="INTRO")songFetch("race")}
  for(const n in SONGS){const S=SONGS[n];if(want&&S.st==="fetched"&&(n===want||(n==="coast"&&want==="lounge")||(n==="race"&&state==="INTRO")))songDecode(n)}
  // the recorded song if it's ready; otherwise keep whichever recorded song is already playing, or fall back
  // to the composed track
  let file=null,comp=null;
  if(want){
    if(SONGS[want].st==="ready")file=want;
    else{const W=SONGS[want],cur=Object.keys(SONGS).find(n=>SONGS[n].p&&!SONGS[n].p.end);
      if(W.askT==null)W.askT=now;
      if(cur&&cur!=="reveal"&&cur!=="chase"&&want!=="reveal"&&W.st!=="failed")file=cur;
      // give a first load up to 4 s of silence rather than starting the composed track only to swap it out
      else if(W.st==="failed"||now-W.askT>4)comp=want==="reveal"?null:want==="lounge"?"lounge":"coast"}
  }
  for(const n in SONGS){const S=SONGS[n];
    if(n===file){if(!S.p||S.p.end){if(S.p)songTick(n,now+99);songStart(n,now)}
      const g=lv*S.gain;if(Math.abs(S.p.want-g)>.001){S.p.want=g;S.p.bus.gain.setTargetAtTime(g,now,g>0?.6:.45)}}
    else if(S.p)songStop(n,now);
    songTick(n,now);if(S.p)S.idle=now;
    // free the decoded audio of a song that hasn't played for half a minute
    if(!S.p&&S.buf&&n!==file&&!(n==="coast"&&want==="lounge")&&!(n==="race"&&state==="INTRO")&&now-(S.idle||0)>30){S.buf=null;S.st="fetched"}
    if(S.p&&n!=="lounge")S.p.tone.frequency.setTargetAtTime(lerp(18000,2600,night),now,1.5);
  }
  MUSIC.set(comp,lv,now);
  // softer and darker after sunset
  MUSIC.tone("coast",lerp(18000,2600,night),now);
  MUSIC.tick(now,.2);
}
setInterval(musicTick,50);
// browsers only allow sound after the player interacts, so the music starts on the first click, tap or key
// (some phones only unlock sound on the end of a tap, so every kind of input is listened to).
// The listeners stay: if the browser later stops the sound on its own (an iPhone does on a call, Siri or an
// alarm, and may not restart it), the next tap or key brings it back
const GESTURES=["pointerdown","pointerup","touchend","click","keydown"];
function firstGesture(){
  if(tabIdle||document.hidden||(MUSIC&&AC&&AC.state==="running"))return;
  // iPhone: play through the ringer's silent switch like a game or video would, instead of being muted by it
  try{if(navigator.audioSession&&navigator.audioSession.type!=="playback")navigator.audioSession.type="playback"}catch(e){}
  audioInit();musicInit();acResume();
}
GESTURES.forEach(g=>addEventListener(g,firstGesture,true));
// the garage song downloads while the island is being built, so it can start the moment the player taps START
if(save.music){
  songFetch("lounge");
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches)songFetch("reveal");
}
// nothing plays while the tab is hidden; picks up again when it comes back
document.addEventListener("visibilitychange",()=>{if(!AC)return;if(document.hidden){try{const p=AC.suspend();if(p&&p.catch)p.catch(()=>{})}catch(e){}}else acResume()});

/* ================================================================ PHOTO MODE
   A free camera around the car, a zoom (lens) control, three looks, and a PNG of the 3D view.
   Opened while driving (free ride, events, test drives, contracts) or from the pause menu: V, the PHOTO chip,
   or PHOTO MODE. While it is open the game is in state PHOTO, in which the main loop runs no driving, traffic,
   event, test-drive, streak or contract updates, so the car's speed and every timer are exactly as they were
   when you come back. The looks only change how the scene is lit while photo mode is open (applyDayNight reads
   photoLook); the island's clock is never changed. The picture is taken from the 3D canvas alone, so the HUD and
   these controls can't appear in it. The pointer listeners are attached once, to a layer that only exists on
   screen in photo mode, so opening and closing it any number of times adds nothing. */
const PHOTO_LOOKS=[
  {name:"AS IS"},
  {name:"GOLDEN HOUR",tod:17.4,exp:1.08,tint:0xffa040,k:.24},
  {name:"NIGHT DRIVE",tod:22.6,exp:1.1,tint:0x4a6aaa,k:.18},
  {name:"COASTAL SUNSET",tod:18.08,exp:.98,tint:0xff7f8a,k:.24}];
PHOTO_LOOKS.forEach(L=>{if(L.tint!==undefined)L.col=new THREE.Color(L.tint)});
const PH={on:false,prev:null,look:0,yaw:0,pitch:.25,dist:7,fov:50,saved:null,ptr:new Map(),pinch:null,last:null,busy:/** @type {any} */ (false),shot:null};
const PH_D=[3,16],PH_P=[.03,1.3],PH_F=[20,80];
// what Photo Mode looks at: the boat or the walker when you're out of the car (it used to turn to the parked car)
const phTarget=()=>{if(BOAT.on)return new V3(BOAT.x,BOAT.y+.9,BOAT.z);if(FOOT.on)return new V3(FOOT.x,FOOT.y+1,FOOT.z);
  const p=pc.G.position;return new V3(p.x,p.y+(pc.shape==="suv"?1.05:.85),p.z)};
function phSync(){$("phZoom").value=String(Math.round(PH_F[1]-PH.fov));$("phDist").value=String(Math.round(PH.dist*10))}
let phMsgT=0;
function phMsg(t,kind){const m=$("phMsg");m.textContent=t;m.className=kind||"";clearTimeout(phMsgT);phMsgT=setTimeout(()=>m.classList.add("hide"),3600)}
function photoLookSet(i){
  PH.look=clamp(i|0,0,PHOTO_LOOKS.length-1);photoLook=PH.on&&PH.look>0?PHOTO_LOOKS[PH.look]:null;CAR_ENV.dirty=true;
  [...$("phLooks").children].forEach((b,k)=>{b.classList.toggle("on",k===PH.look);b.setAttribute("aria-pressed",k===PH.look?"true":"false")});
  // lit at once, so a picture taken straight after choosing a look already has it
  if(PH.on){applyDayNight();updateLampLights();photoFrame(0)}
}
function photoReset(){if(!pc)return;PH.yaw=P.h+Math.PI*.82;PH.pitch=.22;PH.dist=7.2*(pc.shape==="suv"?1.15:1);PH.fov=50;phSync()}
function photoEnter(){
  if(PH.on||!pc||(state!=="DRIVE"&&state!=="PAUSE"))return false;
  PH.prev=state;
  // Photo Mode stops every clock, blinking included: eyes caught shut would stay shut in every photo
  for(const F of [FOOT.m&&FOOT.m.face,OFFICER.m&&OFFICER.m.face,...PEDS.map(p=>p.m.face)])if(F){F.shut=false;F.m.map=F.tex.open;F.t=Math.max(F.t,1)}
  PH.saved={pos:camera.position.clone(),q:camera.quaternion.clone(),fov:camera.fov,
    inside:pc.inside.visible,glass:pc.glass.visible,shell:pc.shell.visible,
    head:headLight?headLight.intensity:0,fill:fillLight?fillLight.intensity:0,tail:pc.tailM.color.clone()};
  clearInput();
  if(PH.prev==="PAUSE")show("pause",false);else audioOn(false);
  setState("PHOTO");hudOn(false);show("photo",true);show("phShot",false);$("phMsg").classList.add("hide");
  pc.inside.visible=false;pc.glass.visible=true;pc.shell.visible=true;
  // start from where the camera is, so nothing jumps
  const t=phTarget(),d=camera.position.clone().sub(t),L=d.length()||1;
  PH.dist=clamp(L,PH_D[0],PH_D[1]);PH.yaw=Math.atan2(d.x,d.z);PH.pitch=clamp(Math.asin(clamp(d.y/L,-1,1)),PH_P[0],PH_P[1]);
  PH.fov=clamp(camera.fov,PH_F[0],PH_F[1]);PH.ptr.clear();PH.pinch=null;PH.last=null;
  PH.on=true;photoLookSet(0);phSync();photoFrame(0);
  return true;
}
function photoExit(){
  CAR_ENV.dirty=true;
  if(!PH.on)return;
  photoShotClose();PH.on=false;PH.busy=false;PH.ptr.clear();PH.pinch=null;photoLook=null;
  show("photo",false);
  const S=PH.saved;
  // the zoom follows the screen's shape, which may have changed while photo mode was open (a phone turned round)
  camera.position.copy(S.pos);camera.quaternion.copy(S.q);camera.fov=S.fov;fitZoom();camera.updateProjectionMatrix();
  pc.inside.visible=S.inside;pc.glass.visible=S.glass;pc.shell.visible=S.shell;
  if(headLight){headLight.intensity=S.head;fillLight.intensity=S.fill}pc.tailM.color.copy(S.tail);   // copied, not set from hex: setHex converts from sRGB again, so each trip darkened it
  applyDayNight();updateLampLights();
  clearInput();hudOn(true);
  if(PH.prev==="PAUSE"){setState("PAUSE");show("pause",true)}else{setState("DRIVE");audioOn(true)}
}
// once a frame while open: keys orbit the camera, which stays above the ground and within reach of the car
function photoFrame(dt){
  if(!PH.on||!pc)return;
  if(!$("phShot").classList.contains("hide"))dt=0;
  const yaw=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0),tilt=(keys.arrowup||keys.w?1:0)-(keys.arrowdown||keys.s?1:0),dz=(keys["-"]||keys._?1:0)-(keys["+"]||keys["="]?1:0);
  if(yaw||tilt||dz){PH.yaw+=yaw*1.5*dt;PH.pitch=clamp(PH.pitch+tilt*.9*dt,PH_P[0],PH_P[1]);PH.dist=clamp(PH.dist*Math.exp(dz*1.3*dt),PH_D[0],PH_D[1]);phSync()}
  const t=phTarget(),cp=Math.cos(PH.pitch);
  const x=t.x+Math.sin(PH.yaw)*cp*PH.dist,z=t.z+Math.cos(PH.yaw)*cp*PH.dist;
  // never under the ground, or under the sea's surface
  const y=Math.max(t.y+Math.sin(PH.pitch)*PH.dist,Math.max(meshH(x,z),surfH(x,z))+.35,.5);
  camera.position.set(x,y,z);camera.lookAt(t);camera.fov=PH.fov;camera.updateProjectionMatrix();
  // lights that normally follow the drive: on for a night look, as they would be
  if(headLight){headLight.intensity=night*4.6;fillLight.intensity=night*.9}pc.tailM.color.setHex(night>.3?0xd01800:0x9a0e00);
}
// ---- pointer: drag orbits, two fingers or the wheel move closer or further away
const phPad=$("phPad");
function phPinchStart(){const it=[...PH.ptr.entries()];if(it.length<2){PH.pinch=null;return}const[[ia,a],[ib,b]]=it;PH.pinch={ia,ib,d:Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),dist:PH.dist}}
phPad.addEventListener("pointerdown",e=>{if(!PH.on||e.button!==0)return;try{phPad.setPointerCapture(e.pointerId)}catch(_){}PH.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(PH.ptr.size===1)PH.last={id:e.pointerId,x:e.clientX,y:e.clientY};else if(!PH.pinch)phPinchStart()});
phPad.addEventListener("pointermove",e=>{if(!PH.on||!PH.ptr.has(e.pointerId))return;PH.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(PH.pinch){const a=PH.ptr.get(PH.pinch.ia),b=PH.ptr.get(PH.pinch.ib);if(a&&b){PH.dist=clamp(PH.pinch.dist*PH.pinch.d/Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),PH_D[0],PH_D[1]);phSync()}return}
  if(PH.last&&PH.last.id===e.pointerId){const dx=e.clientX-PH.last.x,dy=e.clientY-PH.last.y;PH.last.x=e.clientX;PH.last.y=e.clientY;
    PH.yaw-=dx*.0065;PH.pitch=clamp(PH.pitch+dy*.0055,PH_P[0],PH_P[1])}});
const phUp=e=>{if(!PH.ptr.has(e.pointerId))return;PH.ptr.delete(e.pointerId);
  if(PH.pinch&&(e.pointerId===PH.pinch.ia||e.pointerId===PH.pinch.ib))phPinchStart();
  if(PH.ptr.size===1){const[[id,r]]=[...PH.ptr.entries()];PH.last={id,x:r.x,y:r.y}}else if(!PH.ptr.size)PH.last=null};
["pointerup","pointercancel","lostpointercapture"].forEach(type=>phPad.addEventListener(type,phUp));
phPad.addEventListener("wheel",e=>{if(!PH.on)return;e.preventDefault();PH.dist=clamp(PH.dist*Math.exp(e.deltaY*.0011),PH_D[0],PH_D[1]);phSync()},{passive:false});
$("phZoom").addEventListener("input",e=>{PH.fov=clamp(PH_F[1]-(+e.target.value),PH_F[0],PH_F[1])});
$("phDist").addEventListener("input",e=>{PH.dist=clamp(+e.target.value/10,PH_D[0],PH_D[1])});
PHOTO_LOOKS.forEach((L,i)=>{const b=document.createElement("button");b.className="chip";b.textContent=L.name;b.setAttribute("aria-pressed","false");b.onclick=()=>photoLookSet(i);$("phLooks").appendChild(b)});
$("phReset").onclick=photoReset;$("phExit").onclick=photoExit;$("phSnap").onclick=()=>photoCapture();
$("chPhoto").onclick=photoEnter;
if(isTouch)$("phHint").textContent="Drag to move around the car, pinch to move closer.";$("pPhoto").onclick=photoEnter;
// ---- the picture: a fresh frame, copied straight away (the 3D canvas keeps no copy once it is shown), as a PNG
function photoName(){const d=new Date(),p=n=>String(n).padStart(2,"0");return "port-meridien-"+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds())+".png"}
function photoCapture(){
  if(!PH.on||PH.busy)return Promise.resolve(false);
  // PNG encoding can finish after this visit to Photo Mode has ended.
  const capture={};PH.busy=capture;
  return new Promise(res=>{
    const fail=err=>{PH.busy=false;phMsg("Couldn't save the photo: "+((err&&err.message)||err||"the browser blocked it"),"bad");res(false)};
    try{
      // a photo is a still, so it is drawn at the quality setting's full resolution even while Auto has lowered the
      // live picture for speed (photos then came out at three-quarter size); the live picture is put back as it was
      const live=prNow,raise=PR_MAX>live;let c;
      if(raise){renderer.setPixelRatio(PR_MAX);renderer.setSize(W,H,false)}
      try{
        applyDayNight();updateLampLights();photoFrame(0);syncRenderView();renderer.render(scene,camera);
        const src=renderer.domElement;c=document.createElement("canvas");c.width=src.width;c.height=src.height;
        const x=c.getContext("2d");if(!x)throw new Error("no 2D canvas");x.drawImage(src,0,0);
      }finally{if(raise){renderer.setPixelRatio(live);renderer.setSize(W,H,false);renderer.render(scene,camera)}}
      c.toBlob(b=>{if(PH.busy!==capture){res(false);return}if(!b){fail(new Error("the browser returned no image"));return}PH.busy=false;photoShotShow(b);res(true)},"image/png");
    }catch(err){fail(err)}
  });
}
function photoShotShow(blob){
  photoShotClose();const url=URL.createObjectURL(blob),name=photoName();PH.shot={blob,url,name};
  $("phImg").src=url;const dl=$("phDl");dl.href=url;dl.setAttribute("download",name);
  let canShare=false;try{canShare=isTouch&&!!navigator.canShare&&navigator.canShare({files:[new File([blob],name,{type:"image/png"})]})}catch(_){}
  show("phShare",canShare);show("phShot",true);$("photo").classList.add("shot");
}
function photoShotClose(){if(PH.shot){URL.revokeObjectURL(PH.shot.url);PH.shot=null}$("phImg").removeAttribute("src");show("phShot",false);$("photo").classList.remove("shot")}
$("phBack").onclick=photoShotClose;
// Inside the Claude artifact viewer a plain download link is blocked, so the save goes through the viewer's own prompt.
let phSaver=null;
try{if(window.claude&&typeof window.claude.use==="function")Promise.resolve(window.claude.use("downloads")).then(d=>{phSaver=d||null},()=>{})}catch(_){}
$("phDl").addEventListener("click",e=>{const s=PH.shot;if(!s||!phSaver)return;e.preventDefault();
  phSaver.save({filename:s.name,data:s.blob}).then(()=>{},err=>{const c=err&&err.code;if(c==="declined")return;
    phMsg(c==="rate_limited"?"A save is already waiting for your answer.":"Couldn't save the photo here. Right-click or press and hold the picture to save it.","bad")})});
$("phShare").onclick=()=>{const s=PH.shot;if(!s)return;
  navigator.share({files:[new File([s.blob],s.name,{type:"image/png"})],title:"Port Meridien"}).catch(err=>{if(!err||err.name!=="AbortError")phMsg("Couldn't share: "+((err&&err.message)||"not allowed here")+". Use DOWNLOAD PNG instead.","bad")})};
