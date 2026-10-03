export type MusicStyle={id:string;name:string;bpm:number;swing:number;halfTime:boolean;root:number;scale:readonly number[];bass:readonly number[];melody:readonly number[]};
// Original motifs, not transcriptions. One shared deterministic arrangement per round.
export const MUSIC_STYLES:readonly MusicStyle[]=[
  {id:'glitch-hop',name:'Glitch Hop',bpm:108,swing:.66,halfTime:true,root:36,scale:[0,3,5,7,10],bass:[0,-1,0,7,-1,10,3,-1,0,12,-1,7,5,-1,3,10],melody:[12,7,10,3,14,12,5,7]},
  {id:'world-bass',name:'World Bass',bpm:106,swing:.61,halfTime:true,root:38,scale:[0,2,3,5,7,9,10],bass:[0,-1,0,7,3,-1,10,7,0,-1,12,9,5,-1,3,7],melody:[12,14,15,19,17,21,19,14]},
  {id:'ghetto-funk',name:'Ghetto Funk',bpm:110,swing:.64,halfTime:true,root:36,scale:[0,3,5,6,7,10],bass:[0,12,-1,3,7,-1,10,7,0,-1,12,10,5,6,7,-1],melody:[7,10,12,15,12,10,6,7]},
  {id:'future-funk',name:'Future Funk',bpm:112,swing:.59,halfTime:false,root:41,scale:[0,2,4,7,9,11],bass:[0,-1,7,12,4,-1,9,7,0,12,-1,11,9,7,4,-1],melody:[12,16,19,21,23,21,19,16]},
  {id:'club',name:'Club Groove',bpm:120,swing:.54,halfTime:false,root:36,scale:[0,3,7,10],bass:[0,-1,0,-1,3,-1,7,-1,0,-1,10,-1,7,-1,3,-1],melody:[12,15,19,22,19,15,12,10]},
];
export function hashSeed(value:string){let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return h>>>0;}
export function randomAt(seed:string,index:number,salt=0){let x=hashSeed(seed)^Math.imul(index+1,0x9e3779b1)^salt;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;}
export function styleForRound(game:string,round:number):MusicStyle{
  const slot=(Math.max(1,round)-1)%MUSIC_STYLES.length;
  if(slot===0)return MUSIC_STYLES[0];
  const bag=[1,2,3,4];const cycle=Math.floor((round-1)/MUSIC_STYLES.length);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(randomAt(game,cycle,i)* (i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return MUSIC_STYLES[bag[slot-1]];
}
export function swungAt(origin:number,step:number,style:MusicStyle){const beat=60000/style.bpm;const subdivision=((step%16)+16)%16;return origin+step*beat/16+(subdivision>=8?(style.swing-.5)*beat:0);}
export function humanVelocity(game:string,step:number,base=.7,salt=0){return Math.max(.1,Math.min(1,base*(.85+randomAt(game,step,salt)*.3)));}
export function noteFrequency(midi:number){return 440*2**((midi-69)/12);}
