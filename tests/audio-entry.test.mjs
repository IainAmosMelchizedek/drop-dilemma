import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root=process.cwd();
const walk=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node)?node:node.props?.children?[node.props.children]:[]).flatMap(walk)];
const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(' '):node?.props?text(node.props.children??''):'';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function scenario(action,{room=null,failedName=null}={}){
  const requests=[],states=[],logs=[],cache=new Map();let stateIndex=0,strings=0,starts=0,unlocked=false,release;
  const gate=new Promise(resolve=>{release=()=>{unlocked=true;resolve();};});
  class AudioNode{constructor(){this.gain=this.frequency=this.volume=this;}connect(){return this;}toDestination(){return this;}dispose(){}rampTo(){}cancelScheduledValues(){}setValueAtTime(){}exponentialRampToValueAtTime(){}linearRampToValueAtTime(){}triggerAttackRelease(){}triggerRelease(){}releaseAll(){}}
  class Buffer{constructor(decoded){this.duration=decoded.duration;}dispose(){}}
  const tone=new Proxy({ToneAudioBuffer:Buffer,start:()=>{starts++;return gate;},immediate:()=>10,getContext:()=>({state:unlocked?'running':'suspended',decodeAudioData:async()=>({duration:1})})},{get:(obj,key)=>obj[key]??AudioNode});
  const React={memo:component=>component,useMemo:fn=>fn(),useEffect:()=>{},useRef:current=>({current}),useState:initial=>{const index=stateIndex++;let value=index===0&&room?room:initial;if(initial===''){value=strings++===0?'DJ Test':strings===2?'TEST2':initial;}return [value,next=>{states.push({index,value:typeof next==='function'?next(value):next});}];}};
  const lobby={code:'TEST2',revision:1,phase:'lobby',round:0,energy:20,deadline:0,started:0,game:'test',players:[],history:[],me:'a',myChoice:'BUILD',host:'a',serverNow:Date.now()};
  const fetch=async(url,options)=>{requests.push({url,body:options?.body?JSON.parse(options.body):undefined});return String(url).endsWith('.mp3')?{ok:!failedName||!String(url).includes(failedName),arrayBuffer:async()=>new ArrayBuffer(8)}:{ok:true,json:async()=>({room:lobby})};};
  function load(file){
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const require=name=>{
      if(name==='tone')return tone;if(name==='react')return React;
      if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
      if(name==='lucide-react')return new Proxy({},{get:(_,key)=>String(key)});
      const base=path.resolve(path.dirname(file),name),resolved=[base,base+'.ts',base+'.tsx'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());assert.ok(resolved,'Unexpected import '+name);return load(resolved);
    };
    vm.runInNewContext(source,{module,exports:module.exports,require,fetch,setInterval:()=>1,clearInterval:()=>{},setTimeout,clearTimeout,AbortController,Date,console:{log:(...args)=>logs.push(args),warn:(...args)=>logs.push(args)},sessionStorage:{setItem:()=>{}},history:{replaceState:()=>{}}},{filename:file});
    return module.exports;
  }
  const tree=load(path.join(root,'app/page.tsx')).default(),nodes=walk(tree);
  if(action==='choice'){
    const buttons=nodes.filter(n=>n.type==='button'&&['BUILD','DROP'].includes(text(n.props?.children?.find?.(c=>c?.type==='strong'))));
    assert.equal(buttons.length,2);assert.ok(buttons.every(n=>!n.props.disabled),'Both choices remain enabled in the last second');
    const count=nodes.find(n=>n.props?.className==='predrop-countdown');assert.ok(count);assert.equal(count.props.children[0].props.children,1);
    const heading=nodes.find(n=>n.props?.className==='round-heading');assert.ok(walk(heading).includes(count),'Countdown stays in heading, above meter and choices');
    buttons[1].props.onClick();await tick();assert.equal(requests.at(-1).body.choice,'DROP');return;
  }
  if(action==='locked'){assert.ok(!nodes.some(n=>n.type==='button'&&n.props?.className?.startsWith('choice ')));return;}
  let pending;
  if(action==='join')nodes.find(n=>n.type==='form').props.onSubmit({preventDefault:()=>{}});
  else pending=nodes.find(n=>n.type==='button'&&text(n).includes(action==='tap'?'Tap to enter the club':'Create a room')).props.onClick();
  assert.equal(starts,1,'Audio unlock is called synchronously in the original user gesture');
  await tick();
  assert.equal(requests.filter(r=>r.url.endsWith('.mp3')).length,47,'Actual page entry must request every sample before waiting for audio unlock');
  assert.ok(states.some(s=>s.value?.completed===0&&s.value.total===47));assert.ok(states.some(s=>s.value?.completed===12&&s.value.total===47));assert.ok(states.some(s=>s.value?.completed===47));
  release();if(pending)await pending;await tick();
  assert.ok(states.some(s=>s.value===true&&s.index===9),'Audio becomes ready only after entry completes');
  assert.equal(logs.filter(args=>String(args[0]).startsWith('Drop Dilemma: loaded')).length,1);
  assert.ok(logs.some(args=>args[0]===('Drop Dilemma: loaded '+(failedName?46:47)+'/47 samples')));
  if(failedName)assert.ok(logs.some(args=>args[0]==='Drop Dilemma: sample failures'&&args[1].includes(failedName)));
  if(action!=='tap')assert.ok(requests.some(r=>r.body?.action===action),'Create/join follows the same preload path');
  assert.equal(load(path.join(root,'lib/club-audio.ts')).ClubAudio,load(path.join(root,'lib/scheduled-club-audio.ts')).ScheduledClubAudio,'Legacy entry cannot instantiate a synth-only engine');
}
await scenario('tap');await scenario('create');await scenario('join',{failedName:'vinyl_scratch'});
const room={code:'TEST2',revision:1,phase:'choice',round:1,energy:20,deadline:Date.now()+900,started:0,game:'test',players:[{id:'a',name:'A',score:0,layer:'drums'},{id:'b',name:'B',score:0,layer:'bass'}],history:[],me:'a',myChoice:'BUILD',host:'a',serverNow:Date.now()};
await scenario('choice',{room});await scenario('locked',{room:{...room,deadline:Date.now()-1}});
const css=fs.readFileSync('app/globals.css','utf8');assert.ok(!css.includes('.predrop-countdown,.locked-moment'));
const rule=css.match(/\.predrop-countdown\{([^}]+)\}/)[1];assert.ok(rule.includes('pointer-events:none'));assert.ok(rule.includes('position:absolute'));assert.ok(rule.includes('background:none'));assert.ok(!rule.includes('position:fixed'));
console.log('Passed actual page tap/create/join preload, synchronous unlock, 47 requests and progress, completion/failure logs, canonical engine, and last-second choice/countdown checks.');
