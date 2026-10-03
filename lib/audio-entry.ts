import { ScheduledClubAudio } from './scheduled-club-audio';
import type { SampleProgress } from './sample-loading';
// Statically loaded with the client page: Tone.start runs in the original click task.
export function enterClubAudio(ref:{current:ScheduledClubAudio|null},progress:(value:SampleProgress)=>void){
  if(!ref.current)ref.current=new ScheduledClubAudio();
  return ref.current.resume(progress);
}
