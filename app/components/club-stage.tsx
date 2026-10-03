'use client';
import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Result } from '../../lib/game';
import { crowdLevel, crowdSize, crowdMood } from '../../lib/crowd';
type Props={energy:number;bpm:number;origin:number;offset:number;result?:Result};
export const ClubStage=memo(function ClubStage({energy,bpm,origin,offset,result}:Props){
  const [departed,setDeparted]=useState(false);
  const crash=result?.outcome==='CRASH',age=result?Date.now()+offset-result.at:0;
  useEffect(()=>{setDeparted(false);if(!crash)return;const timer=setTimeout(()=>setDeparted(true),Math.max(0,1200-(Date.now()+offset-result!.at)));return()=>clearTimeout(timer);},[crash,result?.at,offset]);
  const count=crash&&!departed&&age<1200?crowdSize(result!.before):crowdSize(energy),level=crowdLevel(energy);
  const beat=60000/bpm;
  // Keep each animation's mount phase stable across polls; offset changes only correct clock drift.
  const beatAnchor=useMemo(()=>Date.now(),[origin,bpm,level]);
  const reactionAnchor=useMemo(()=>Date.now(),[result?.at]);
  const delay=-(((beatAnchor+offset-origin)%beat+beat)%beat)/1000;
  const reactionDelay=-Math.max(0,result?reactionAnchor+offset-result.at:0)/1000;
  const reaction=result?.outcome.toLowerCase()??'steady';
  const style={'--beat':beat/1000+'s','--beat-delay':delay+'s','--reaction-delay':reactionDelay+'s'} as CSSProperties;
  return <section className={`club-stage level-${level} reaction-${reaction}`} style={style} aria-label={`Dance floor: ${crash?'crowd boos and walks away':crowdMood(energy)}`}>
    <div className="club-caption"><span>THE DANCE FLOOR</span><strong>{crash?'BOO…':result?.outcome==='DROP'?'THE FLOOR EXPLODES':result?.outcome==='BUILD'?'CHEERS!':crowdMood(energy)}</strong></div>
    <div className="club-lights" aria-hidden="true"><i/><i/><i/></div><div className="club-booth" aria-hidden="true"><span>DROP DILEMMA</span></div>
    <div className="dance-floor" aria-hidden="true">{Array.from({length:count},(_,i)=><div className="crowd-position" key={i} style={{left:(5+(i%10)*9.4)+'%',bottom:(8+Math.floor(i/10)*15)+'%',zIndex:4-Math.floor(i/10),'--person-color':['#b5ff5b','#ba9cff','#76dfff','#ff9b70'][i%4],'--person-scale':1-Math.floor(i/10)*.1,'--exit':(i%2?-1:1)*(130+i%7*15)+'px'} as CSSProperties}><svg className="dancer" viewBox="0 0 24 44"><circle cx="12" cy="6" r="4"/><path d="M12 13v15M12 28L6 40M12 28l6 12"/><g className="dancer-arms"><path d="M12 16L3 23M12 16l9 7"/></g></svg></div>)}</div>
    {energy===0&&<p className="empty-floor">Empty floor · rebuild the crowd</p>}
  </section>;
});
