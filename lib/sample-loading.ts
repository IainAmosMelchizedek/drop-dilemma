export type SampleProgress={completed:number;total:number;failed:number};
export async function loadSampleSet<T>(catalog:readonly {id:string;url:string}[],load:(url:string,signal:AbortSignal)=>Promise<T>,progress:(value:SampleProgress)=>void=()=>{},timeoutMs=12000){
  const loaded=new Map<string,T>(),failed:string[]=[];let completed=0;
  progress({completed,total:catalog.length,failed:0});
  await Promise.all(catalog.map(async sample=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      const value=await Promise.race([load(sample.url,controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Sample load timed out'));},timeoutMs);})]);
      loaded.set(sample.id,value);
    }catch{failed.push(sample.id);}finally{clearTimeout(timer);progress({completed:++completed,total:catalog.length,failed:failed.length});}
  }));
  return {loaded,failed};
}
// Slice lengths are source seconds; target seconds are on the shared beat grid.
export function slicePlan(duration:number,index:number,slices:number,targetSeconds:number){
  const length=duration/slices,position=((index%slices)+slices)%slices;
  return {offset:position*length,duration:targetSeconds,rate:length/targetSeconds};
}
