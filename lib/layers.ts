import type { Result } from './game';
export const LAYERS=[
  {id:'drums',name:'Drums',icon:'◉',color:'#b5ff5b'},
  {id:'bass',name:'Bass',icon:'≋',color:'#ba9cff'},
  {id:'melody',name:'Melody',icon:'♫',color:'#ff9b70'},
  {id:'texture',name:'Texture',icon:'✧',color:'#76dfff'},
  {id:'percussion',name:'Percussion',icon:'⋮',color:'#f5ce62'},
  {id:'chops',name:'Vocal-style Chops',icon:'◈',color:'#f484c4'},
  {id:'second-melody',name:'Second Melody',icon:'♬',color:'#92edba'},
  {id:'guitar',name:'Chopped Guitar',icon:'⌁',color:'#b0bbff'},
] as const;
export type LayerId=typeof LAYERS[number]['id'];
export type LayerOwner={id:string;layer?:LayerId};
export function assignLayers<T extends {id:string}>(players:readonly T[]):(T&{layer:LayerId})[]{
  if(players.length<2||players.length>8)throw new Error('A set needs 2–8 DJs.');
  return players.map((p,i)=>({...p,layer:LAYERS[i].id}));
}
export function layerInfo(id?:LayerId){return LAYERS.find(layer=>layer.id===id);}
// History is authoritative; current secret choices never affect the audible mix.
// A future skill result can be added separately without changing layer ownership.
export function layerMix(players:readonly LayerOwner[],history:readonly Result[],round:number):Record<LayerId,boolean>{
  const previous=history.findLast(r=>r.round<round);
  return Object.fromEntries(LAYERS.map(layer=>{
    const owner=players.find(p=>p.layer===layer.id);
    return [layer.id,!owner||previous?.choices.find(c=>c.id===owner.id)?.choice!=='DROP'];
  })) as Record<LayerId,boolean>;
}
