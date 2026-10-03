import { SampleBank } from './sample-bank';
import type { SampleProgress } from './sample-loading';
import type { SampleId } from './sample-catalog';
import { LAYERS, layerMix, type LayerOwner, type LayerId } from './layers';
import * as Tone from 'tone';
import type { Result } from './game';
import { audioTimeFor, AUDIO_LOOKAHEAD_MS, buildStage, dropStrength, rollInterval } from './music-timeline';
import { styleForRound, swungAt, humanVelocity, noteFrequency, randomAt } from './music-styles';
export type AudioState={game:string;round:number;phase:string;energy:number;deadline:number;started:number;choiceDeadline?:number;result?:Result;players?:LayerOwner[];history?:Result[]};
export class ScheduledClubAudio {
  offset=0;
  private state?:AudioState;
  private mixReady=false;
  private key=''; private tick=0; private landed=false; private cues=new Set<string>();
  private master=new Tone.Gain(.85).toDestination();
  private limiter=new Tone.Limiter(-1).connect(this.master);
  private compressor=new Tone.Compressor({threshold:-18,ratio:3,attack:.008,release:.15,knee:8}).connect(this.limiter);
  private eq=new Tone.EQ3({low:2,mid:-1,high:1,lowFrequency:180,highFrequency:4500}).connect(this.compressor);
  private fx=new Tone.Gain(.65).connect(this.eq);
  private groove=new Tone.Gain(.7).connect(this.eq);
  private filter=new Tone.Filter(1800,'lowpass').connect(this.groove);
  private parts=Object.fromEntries(LAYERS.map(layer=>[layer.id,new Tone.Gain(1).connect(this.filter)])) as Record<LayerId,Tone.Gain>;
  private kick=new Tone.MembraneSynth({pitchDecay:.025,octaves:5,volume:-8}).connect(this.parts['drums']);
  private pad=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sine'},envelope:{attack:.1,decay:.2,sustain:.3,release:.15},volume:-28}).connect(this.parts['texture']);
  private hat=new Tone.NoiseSynth({envelope:{attack:.001,decay:.03,sustain:0},volume:-27}).connect(this.parts['drums']);
  private backbeat=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:.001,decay:.13,sustain:0},volume:-18}).connect(this.parts['drums']);
  private slap=new Tone.FMSynth({harmonicity:1,modulationIndex:3,envelope:{attack:.001,decay:.16,sustain:0,release:.07},modulationEnvelope:{attack:.001,decay:.06,sustain:0,release:.04},volume:-14}).connect(this.parts['bass']);
  private wobbleFilter=new Tone.Filter(300,'lowpass').connect(this.parts['bass']);
  private dirt=new Tone.Distortion(.35).connect(this.wobbleFilter);
  private growl=new Tone.MonoSynth({oscillator:{type:'fatsawtooth'},envelope:{attack:.003,decay:.12,sustain:.4,release:.06},filterEnvelope:{baseFrequency:100,octaves:3,attack:.01,decay:.1,sustain:.4,release:.1},volume:-19}).connect(this.dirt);
  private pluck=new Tone.PolySynth(Tone.FMSynth,{harmonicity:3.01,modulationIndex:2,envelope:{attack:.001,decay:.28,sustain:0,release:.1},modulationEnvelope:{attack:.001,decay:.06,sustain:0,release:.05},volume:-23}).connect(this.parts['melody']);
  private guitar=new Tone.PolySynth(Tone.FMSynth,{harmonicity:2,modulationIndex:1.2,envelope:{attack:.002,decay:.065,sustain:0,release:.03},volume:-23}).connect(this.parts['guitar']);
  private brass=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sawtooth'},envelope:{attack:.025,decay:.12,sustain:.2,release:.08},volume:-24}).connect(this.parts['melody']);
  private hit=new Tone.MembraneSynth({pitchDecay:.08,octaves:6,volume:-5}).connect(this.fx);
  private sub=new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:.002,decay:.2,sustain:.5,release:.15},volume:-9}).connect(this.fx);
  private stab=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'fatsawtooth'},envelope:{attack:.001,decay:.18,sustain:0,release:.1},volume:-19}).connect(this.fx);
  private glitch=new Tone.NoiseSynth({envelope:{attack:.001,decay:.025,sustain:0},volume:-25}).connect(this.parts['texture']);
  private percussion=new Tone.MetalSynth({envelope:{attack:.001,decay:.06,release:.02},harmonicity:3.1,resonance:1700,volume:-30}).connect(this.parts.percussion);
  private chopsFilter=new Tone.Filter(1100,'bandpass').connect(this.parts.chops);
  private chops=new Tone.PolySynth(Tone.FMSynth,{harmonicity:1.5,modulationIndex:5,envelope:{attack:.004,decay:.08,sustain:0,release:.03},volume:-24}).connect(this.chopsFilter);
  private secondMelody=new Tone.PolySynth(Tone.FMSynth,{harmonicity:2.01,modulationIndex:1.5,envelope:{attack:.002,decay:.2,sustain:0,release:.08},volume:-26}).connect(this.parts['second-melody']);
  private roll=new Tone.NoiseSynth({envelope:{attack:.001,decay:.045,sustain:0},volume:-22}).connect(this.fx);
  private riserFilter=new Tone.Filter(300,'lowpass').connect(this.fx);
  private riser=new Tone.NoiseSynth({envelope:{attack:.1,decay:.1,sustain:1,release:.06},volume:-28}).connect(this.riserFilter);
  private stop=new Tone.Synth({oscillator:{type:'sawtooth'},envelope:{attack:.001,decay:.4,sustain:0,release:.05},volume:-24}).connect(this.fx);
  private power=new Tone.Synth({oscillator:{type:'sawtooth'},envelope:{attack:.001,decay:.6,sustain:0,release:.05},volume:-16}).connect(this.fx);
  private scratchFilter=new Tone.Filter(2000,'bandpass').connect(this.fx);
  private scratch=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:.001,decay:.15,sustain:0},volume:-16}).connect(this.scratchFilter);
  private breakFallback=new Tone.NoiseSynth({envelope:{attack:.001,decay:.035,sustain:0},volume:-30}).connect(this.parts.drums);
  private samples=new SampleBank({...this.parts,fx:this.fx});
  private loadingSamples=false;
  private timer=setInterval(()=>this.schedule(),25);
  async resume(progress?:(value:SampleProgress)=>void){
    this.loadingSamples=true;
    try{
      const unlock=Tone.start();
      // Start requests even while a browser is still resuming its audio context.
      const preload=this.samples.preload(progress);
      const [,report]=await Promise.all([unlock,preload]);return report;
    }finally{this.loadingSamples=false;this.schedule();}
  }
  mute(value:boolean){this.master.gain.rampTo(value?0:.85,.1);}
  sync(state:AudioState){this.state=state;this.schedule();}
  private schedule(){
    const s=this.state;if(!s||this.loadingSamples||Tone.getContext().state!=='running')return;
    const now=Date.now()+this.offset,immediate=Tone.immediate();
    const raw=Tone.getContext().rawContext as {getOutputTimestamp?:()=>{contextTime:number;performanceTime:number}};
    const output=raw?.getOutputTimestamp?.();
    // Relate the server clock to samples reaching the speakers, when supported.
    const audioNow=output&&output.contextTime>0?output.contextTime+(performance.now()-output.performanceTime)/1000:immediate;
    const safe=immediate+.025,lead=Math.max(25,(safe-audioNow)*1000),horizon=Math.max(AUDIO_LOOKAHEAD_MS,lead+75);
    if(s.phase==='lobby'||s.phase==='ended'){this.groove.gain.rampTo(0,.05);return;}
    const style=styleForRound(s.game,s.round),beat=60000/style.bpm,step=beat/16;
    const kickSample:SampleId=style.id==='world-bass'?'bd_boom':style.id==='glitch-hop'?'bd_808':style.id==='ghetto-funk'?'bd_fat':'bd_haus';
    const snareSample:SampleId=style.id==='world-bass'?'sn_dub':style.id==='glitch-hop'?'sn_dolf':'sn_generic';
    const hats:SampleId[]=['hat_bdu','hat_cab','hat_gem','hat_metal','hat_raw','hat_tap'];
    const cutoff=s.choiceDeadline??(s.phase==='choice'?s.deadline:s.result?s.result.at-1000:s.phase==='landing'?s.deadline-1000:s.deadline-6000);
    // Reveal is beat zero; every client derives the same swung grid.
    const origin=cutoff+1000,key=s.game+':'+s.round,r=s.result?.round===s.round?s.result:undefined;
    if(this.key!==key){
      this.key=key;this.landed=false;this.mixReady=false;this.cues.clear();this.tick=Math.ceil((now+lead-origin)/step);
      this.groove.gain.cancelScheduledValues(audioNow);this.groove.gain.setValueAtTime(now<cutoff-3000?.7:.001,safe);
      this.filter.frequency.cancelScheduledValues(audioNow);this.filter.frequency.setValueAtTime(1800,safe);
      const begin=audioTimeFor(cutoff-8000,now,audioNow),end=audioTimeFor(cutoff-3000,now,audioNow);
      if(end>safe){this.filter.frequency.setValueAtTime(1800,Math.max(begin,safe));this.filter.frequency.exponentialRampToValueAtTime(14000,end);this.groove.gain.setValueAtTime(.7,Math.max(safe,end-.05));this.groove.gain.linearRampToValueAtTime(.001,end);}
    }
    if(!this.mixReady){this.mixReady=true;this.setMix(layerMix(s.players??[],s.history??[],s.round),safe);}
    if(r&&!this.landed&&r.at<=now+horizon){this.landed=true;const at=audioTimeFor(r.at,now,audioNow);this.setMix(layerMix(s.players??[],[...(s.history??[]).filter(h=>h.round!==r.round),r],s.round+1),Math.max(at,safe));if(at>=safe)this.land(r,at,style.root,beat/1000);else this.groove.gain.setValueAtTime(r.after>0?.7:0,safe);}
    this.tick=Math.max(this.tick,Math.ceil((now+lead-origin)/step));
    while(origin+this.tick*step<=now+horizon){
      const index=this.tick++,stamp=origin+index*step,t=audioTimeFor(stamp,now,audioNow),remaining=cutoff-stamp;
      const before=stamp<origin,energy=before?(r?.before??s.energy):(r?.after??s.energy),stage=buildStage(remaining);
      const pos=((index%64)+64)%64,velocity=humanVelocity(key,index),chord=[style.root+24,style.root+24+style.scale[1],style.root+31].map(noteFrequency);
      const swingStamp=swungAt(origin,index,style),sw=audioTimeFor(swingStamp,now,audioNow);
      if(energy>0&&index!==0&&(before||r)&&(!before||stage==='groove'||stage==='roll')){
        if(pos%16===0&&(pos!==16||!style.halfTime)&&!this.samples.play(kickSample,t,{gain:velocity,duration:.4}))this.kick.triggerAttackRelease(noteFrequency(style.root-12),.12,t,velocity);
        if(pos===0){const pads:SampleId[]=['tbd_pad_1','tbd_pad_2','tbd_pad_3','tbd_pad_4'];if(!this.samples.play(pads[(s.round-1)%4],t,{gain:.45,duration:beat*3/1000,rate:2**((style.root%12)/12)}))this.pad.triggerAttackRelease(chord,beat*3/1000,t,.6);if(energy>=60)this.samples.play('ambi_drone',t,{gain:.2,duration:beat*3/1000});}
        if(energy>=40&&pos%8===0&&(!before||swingStamp<cutoff-3000)){const hatVelocity=humanVelocity(key,index,.6,1);if(!this.samples.play(hats[((Math.floor(index/64)%6)+6)%6],sw,{gain:hatVelocity,duration:.1}))this.hat.triggerAttackRelease(.025,sw,hatVelocity);if(energy>=100&&pos===56)this.samples.play('drum_cymbal_open',sw,{gain:.4,duration:.3});}
        if(energy>=40&&(style.halfTime?pos===32:pos===16||pos===48)&&!this.samples.play(snareSample,t,{gain:velocity,duration:.2}))this.backbeat.triggerAttackRelease(.1,t,velocity);
        if(style.id==='glitch-hop'&&energy>=40&&pos%4===0&&(!before||swingStamp<cutoff-3000)){
          const loop:SampleId=Math.floor(pos/32)%2===0?'loop_amen':'loop_breakbeat';
          const slice=energy>=80&&randomAt(key,index,12)>.7?Math.floor(index/4)-1:Math.floor(index/4);
          if(!this.samples.chop(loop,sw,slice,16,beat/4000,velocity*.55))this.breakFallback.triggerAttackRelease(.03,sw,.3);
        }
        if(pos%8===0&&(!before||swingStamp<cutoff-3000)){
          if(style.id==='world-bass'){
            this.samples.chop('loop_tabla',sw,Math.floor(index/8),32,beat/2000,velocity*.55);
            if(energy>=80)this.samples.chop('loop_safari',sw,Math.floor(index/8),32,beat/2000,.25);
            const tabla:SampleId[]=['tabla_na','tabla_ghe1','tabla_ke1','tabla_tun1','tabla_na_o','tabla_ghe2','tabla_te1','tabla_dhec'];
            if(!this.samples.play(tabla[((Math.floor(index/8)%8)+8)%8],sw,{gain:velocity*.4,duration:.25})&&!s.players?.some(p=>p.layer==='percussion'))this.percussion.triggerAttackRelease(noteFrequency(style.root+36),.04,sw,velocity*.35);
          }
          const motif=style.bass[((Math.floor(index/8)%16)+16)%16];
          if(motif>=0){const freq=noteFrequency(style.root+motif);if(energy>=80){this.wobbleFilter.frequency.setValueAtTime(180,sw);this.wobbleFilter.frequency.exponentialRampToValueAtTime(1800,sw+.07);this.wobbleFilter.frequency.exponentialRampToValueAtTime(220,sw+.19);this.growl.triggerAttackRelease(freq,.19,sw,velocity);if(pos===0||pos===32)this.samples.play(pos===0?'bass_hard_c':'bass_thick_c',sw,{gain:.22,duration:.2,rate:2**((style.root%12)/12)});}else this.slap.triggerAttackRelease(freq,.12,sw,velocity*(energy<60?.4:.8));}
          if(style.id==='world-bass'||energy>=60||s.players?.some(p=>p.layer==='melody')){const m=((Math.floor(index/8)%8)+8)%8;this.pluck.triggerAttackRelease(noteFrequency(style.root+12+style.melody[m]),.18,sw,velocity*(energy<60?.35:.7));}
          if(energy>=20&&s.players?.some(p=>p.layer==='percussion')&&!this.samples.play(style.id==='world-bass'?'tabla_ghe1':'glitch_perc2',sw,{gain:velocity*.4,duration:.1,bus:'percussion'}))this.percussion.triggerAttackRelease(noteFrequency(style.root+36),.04,sw,velocity*.5);
          if(energy>=20&&pos%16===8&&s.players?.some(p=>p.layer==='chops')){this.chopsFilter.frequency.setValueAtTime(pos===8?800:1700,sw);this.chops.triggerAttackRelease(chord,.07,sw,velocity);}
          if(energy>=20&&pos%16===0&&s.players?.some(p=>p.layer==='second-melody'))this.secondMelody.triggerAttackRelease(noteFrequency(style.root+24+style.melody[((Math.floor(index/16)%8)+8)%8]),.15,sw,velocity);
          if(energy>=60&&pos%16===8&&!this.samples.play(snareSample,sw,{gain:velocity*.2,duration:.08}))this.backbeat.triggerAttackRelease(.04,sw,velocity*.2);
          if((energy>=60||s.players?.some(p=>p.layer==='guitar'))&&pos%16===8)this.guitar.triggerAttackRelease(chord,.06,sw,velocity);
        }
        if(energy>=80&&(pos===12||pos===44))this.brass.triggerAttackRelease(chord,.14,t,velocity);
        if(energy>=60&&pos%16===12&&randomAt(key,index,9)>.65){const glitches:SampleId[]=['glitch_perc1','glitch_perc2','glitch_perc3','glitch_perc4','glitch_perc5'];const effect=glitches[((Math.floor(index/16)%5)+5)%5];if(!this.samples.play(effect,t,{gain:.4,duration:.03}))this.glitch.triggerAttackRelease(.02,t,.5);if(!this.samples.play(effect,t+step/1000,{gain:.3,duration:.03}))this.glitch.triggerAttackRelease(.02,t+step/1000,.35);if(pos===44)this.samples.play('glitch_bass_g',t,{gain:.2,duration:.07,rate:2**(((style.root%12)-7)/12)});this.pluck.triggerAttackRelease(chord,.03,t,.4);this.pluck.triggerAttackRelease(chord,.03,t+step/1000,.3);}
      }
      if(energy<=0||!before)continue;
      if(stage==='roll'){
        if(index%(rollInterval(remaining,beat)/step)===0){const intensity=.2+(8000-remaining)/5000*.65;if(!this.samples.chop('drum_roll',t,index,128,.04,intensity,'fx'))this.roll.triggerAttackRelease(.03,t,intensity);}
        if(!this.cues.has('riser')){this.cues.add('riser');this.samples.play('perc_swoosh',t,{gain:.45,duration:.6,bus:'fx'});const duration=Math.max(.05,(remaining-3000)/1000);this.riserFilter.frequency.setValueAtTime(300,t);this.riserFilter.frequency.exponentialRampToValueAtTime(13000,t+duration);this.riser.triggerAttackRelease(duration,t,.65);}
      }
      if(stage==='predrop'&&!this.cues.has('stop')){this.cues.add('stop');this.riser.triggerRelease(t);if(!this.samples.play('vinyl_rewind',t,{gain:.5,duration:.4,bus:'fx'})){this.stop.triggerAttackRelease(330,.35,t,.65);this.stop.frequency.exponentialRampToValueAtTime(25,t+.35);}}
      // The locked second holds near-silence: a shared breath before beat zero.
    }
  }
  private setMix(mix:Record<LayerId,boolean>,time:number){
    for(const layer of LAYERS){const gain=this.parts[layer.id].gain;gain.cancelScheduledValues(time);gain.setValueAtTime(mix[layer.id]?1:0,time);}
  }
  private land(r:Result,t:number,root:number,beat:number){
    this.riser.triggerRelease(t);this.pad.releaseAll(t);this.growl.triggerRelease(t);
    this.groove.gain.cancelScheduledValues(t);this.groove.gain.setValueAtTime(r.after>0?.7:0,t);this.filter.frequency.setValueAtTime(16000,t);
    if(r.outcome==='CRASH'){this.power.triggerAttackRelease(260,.6,t);this.power.frequency.exponentialRampToValueAtTime(25,t+.6);this.scratchFilter.frequency.setValueAtTime(3500,t);this.scratchFilter.frequency.exponentialRampToValueAtTime(200,t+.15);if(!this.samples.play('vinyl_backspin',t,{gain:.65,duration:.65,bus:'fx'}))this.scratch.triggerAttackRelease(.15,t);if(!this.samples.play('vinyl_scratch',t+.2,{gain:.45,duration:.18,bus:'fx'}))this.scratch.triggerAttackRelease(.08,t+.2,.5);return;}
    const chord=[root+24,root+31,root+36,root+39].map(noteFrequency);
    if(r.outcome==='DROP'){const v=dropStrength(r.before);if(!this.samples.play('bass_drop_c',t,{gain:v,duration:1,rate:2**((root%12)/12)}))this.hit.triggerAttackRelease(noteFrequency(root-12),.5,t,v);if(r.before>=40)this.samples.play('perc_impact1',t,{gain:v*.35,duration:.6});if(r.before>=80)this.samples.play('misc_cineboom',t,{gain:v*.35,duration:1.8});this.sub.triggerAttackRelease(noteFrequency(root-12),.45,t,v);this.stab.triggerAttackRelease(chord,.18,t,v);if(r.before>=40)this.stab.triggerAttackRelease(chord,.1,t+beat*.5,v*.6);if(r.before>=80){this.hit.triggerAttackRelease(noteFrequency(root-12),.3,t+beat,v*.8);this.stab.triggerAttackRelease(chord,.14,t+beat,v*.8);}}
    else{if(!this.samples.play('bd_808',t,{gain:.8,duration:.3}))this.kick.triggerAttackRelease(noteFrequency(root-12),.14,t,.8);this.pad.triggerAttackRelease(chord,beat*3,t,.7);this.pluck.triggerAttackRelease(chord,.2,t,.5);}
  }
  dispose(){clearInterval(this.timer);this.samples.dispose();[this.breakFallback,this.kick,this.pad,this.hat,this.backbeat,this.slap,this.growl,this.pluck,this.guitar,this.brass,this.hit,this.sub,this.stab,this.glitch,this.roll,this.riser,this.stop,this.power,this.scratch,...Object.values(this.parts),this.percussion,this.chops,this.chopsFilter,this.secondMelody,this.filter,this.wobbleFilter,this.dirt,this.riserFilter,this.scratchFilter,this.groove,this.fx,this.eq,this.compressor,this.limiter,this.master].forEach(n=>n.dispose());}
}
