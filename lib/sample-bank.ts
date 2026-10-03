import * as Tone from 'tone';
import { SAMPLE_CATALOG, type SampleId } from './sample-catalog';
import { loadSampleSet, slicePlan, type SampleProgress } from './sample-loading';
import type { LayerId } from './layers';
type Bus=LayerId|'fx';
type Options={gain?:number;rate?:number;offset?:number;duration?:number;bus?:Bus};
export class SampleBank {
  private buffers=new Map<string,Tone.ToneAudioBuffer>();
  private pools=new Map<string,{players:Tone.Player[];next:number}>();
  private disposed=false;
  private loading?:Promise<SampleProgress>;
  private progress:SampleProgress={completed:0,total:SAMPLE_CATALOG.length,failed:0};
  constructor(private routes:Record<Bus,Tone.ToneAudioNode>){}
  preload(progress:(value:SampleProgress)=>void=()=>{}){
    progress(this.progress);
    if(!this.loading)this.loading=loadSampleSet(SAMPLE_CATALOG,async(url,signal)=>{
      const response=await fetch(url,{signal});if(!response.ok)throw new Error('Sample unavailable');
      const data=await response.arrayBuffer(),decoded=await Tone.getContext().decodeAudioData(data);
      if(signal.aborted||this.disposed)throw new Error('Sample load canceled');
      return new Tone.ToneAudioBuffer(decoded);
    },value=>{this.progress=value;progress(value);}).then(({loaded,failed})=>{
      if(this.disposed)loaded.forEach(buffer=>buffer.dispose());else this.buffers=loaded;
      console.log('Drop Dilemma: loaded '+loaded.size+'/'+SAMPLE_CATALOG.length+' samples');
      if(failed.length)console.warn('Drop Dilemma: sample failures',failed);
      return {completed:SAMPLE_CATALOG.length,total:SAMPLE_CATALOG.length,failed:failed.length};
    });
    return this.loading;
  }
  play(id:SampleId,time:number,{gain=1,rate=1,offset=0,duration,bus}:Options={}){
    const buffer=this.buffers.get(id),entry=SAMPLE_CATALOG.find(sample=>sample.id===id);
    if(this.disposed||!buffer||!entry||offset>=buffer.duration)return false;
    const destination=bus??entry.group,key=id+':'+destination;
    try{
      let pool=this.pools.get(key);
      if(!pool){pool={players:Array.from({length:4},()=>{const player=new Tone.Player(buffer).connect(this.routes[destination]);player.fadeIn=.001;player.fadeOut=.006;return player;}),next:0};this.pools.set(key,pool);}
      const player=pool.players[pool.next++%pool.players.length];
      // Separate voices prevent retriggers, rate changes, and velocity automation from disturbing another chop.
      player.playbackRate=rate;
      const base=/^bd_/.test(id)?-8:/^sn_/.test(id)?-14:/^hat_|cymbal/.test(id)?-23:destination==='fx'?-12:/^tbd_|ambi_/.test(id)?-28:-20;
      player.volume.setValueAtTime(base+20*Math.log10(Math.max(.001,gain)),time);
      const sourceLength=Math.min(buffer.duration-offset,(duration??(buffer.duration-offset)/rate)*rate);
      player.start(time,offset,sourceLength);return true;
    }catch{return false;}
  }
  chop(id:SampleId,time:number,index:number,slices:number,targetSeconds:number,gain=1,bus?:Bus){
    const buffer=this.buffers.get(id);if(!buffer)return false;
    return this.play(id,time,{...slicePlan(buffer.duration,index,slices,targetSeconds),gain,bus});
  }
  dispose(){this.disposed=true;this.pools.forEach(pool=>pool.players.forEach(player=>player.dispose()));this.pools.clear();this.buffers.forEach(buffer=>buffer.dispose());this.buffers.clear();}
}
