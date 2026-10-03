export function crowdLevel(energy:number){return Math.min(5,Math.max(0,Math.floor(energy/20)));}
export function crowdSize(energy:number){return [0,8,16,24,32,40][crowdLevel(energy)];}
export function crowdMood(energy:number){return ['Empty floor','A few nodding','Bouncing','Hands up','Jumping','Going wild'][crowdLevel(energy)];}
