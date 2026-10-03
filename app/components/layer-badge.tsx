import { layerInfo, type LayerId } from '../../lib/layers';
export function LayerBadge({layer,active}:{layer?:LayerId;active?:boolean}){
  const info=layerInfo(layer);if(!info)return null;
  return <span className={`layer-badge ${active===false?'layer-out':''}`} style={{color:info.color}}><span aria-hidden="true">{info.icon}</span> {info.name}{active!==undefined&&<small>{active?'IN MIX':'CUT OUT'}</small>}</span>;
}
