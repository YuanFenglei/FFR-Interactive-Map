/* Read-only SVHD / UE 5.6 GVAS reader. No filesystem or network APIs. */
'use strict';
class SaveReader {
  constructor(bytes) { this.b=bytes; this.v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);this.p=0;this.tags=0; }
  need(n){if(!Number.isInteger(n)||n<0||this.p+n>this.b.length)throw Error('存档已截断或格式不兼容');}
  skip(n){this.need(n);this.p+=n;}
  u8(){this.need(1);return this.v.getUint8(this.p++);}
  u16(){this.need(2);const x=this.v.getUint16(this.p,true);this.p+=2;return x;}
  i32(){this.need(4);const x=this.v.getInt32(this.p,true);this.p+=4;return x;}
  u32(){this.need(4);const x=this.v.getUint32(this.p,true);this.p+=4;return x;}
  f32(){this.need(4);const x=this.v.getFloat32(this.p,true);this.p+=4;return x;}
  f64(){this.need(8);const x=this.v.getFloat64(this.p,true);this.p+=8;return x;}
  i64(){this.need(8);const x=this.v.getBigInt64(this.p,true);this.p+=8;return x.toString();}
  count(){const n=this.u32();if(n>1000000)throw Error('存档数组长度异常');return n;}
  str(){const n=this.i32();if(!n)return '';const len=Math.abs(n)*(n<0?2:1);if(len>1000000)throw Error('存档字符串长度异常');this.need(len);const s=new TextDecoder(n<0?'utf-16le':'utf-8').decode(this.b.subarray(this.p,this.p+len-(n<0?2:1)));this.p+=len;return s;}
  type(depth=0){if(depth>16)throw Error('存档类型嵌套过深');const name=this.str(),count=this.count();if(count>16)throw Error('存档类型参数异常');return {name,args:Array.from({length:count},()=>this.type(depth+1))};}
  props(depth=0,keep=null){
    if(depth>40)throw Error('存档嵌套过深');const out=Object.create(null);
    while(true){if(++this.tags>200000)throw Error('存档字段过多');const name=this.str();if(name==='None')return out;
      const t=this.type(),size=this.u32(),flags=this.u8();if(flags&~31)throw Error('不支持的存档字段标志');
      const ix=flags&1?this.u32():0;if(flags&2)this.skip(16);if(flags&4)throw Error('不支持的属性扩展');
      const end=this.p+size;this.need(size);
      if(!keep||keep.has(name)){
        out[ix?name+'_'+ix:name]=t.name==='BoolProperty'?!!(flags&16):this.value(t,depth+1,flags);
        if(this.p!==end)throw Error('字段长度校验失败：'+name);
      }else this.p=end;
    }
  }
  value(t,depth,flags=0){
    switch(t.name){
      case 'IntProperty':return this.i32();case 'UInt32Property':return this.u32();
      case 'FloatProperty':return this.f32();case 'DoubleProperty':return this.f64();
      case 'Int64Property':case 'UInt64Property':return this.i64();
      case 'BoolProperty':return !!this.u8();case 'ByteProperty':return t.args.length?this.str():this.u8();
      case 'NameProperty':case 'StrProperty':case 'EnumProperty':case 'ObjectProperty':return this.str();
      case 'StructProperty':{
        const name=t.args[0]?.name;
        if(name==='DateTime'||name==='Timespan')return this.i64();
        if(name==='Vector'||name==='Rotator'){return {X:this.f64(),Y:this.f64(),Z:this.f64()};}
        if(name==='Vector2D')return {X:this.f64(),Y:this.f64()};
        if(name==='Guid'){const a=[];for(let i=0;i<4;i++)a.push(this.u32());return a;}
        if(flags&8)throw Error('不支持的原生结构：'+name);
        return this.props(depth);
      }
      case 'ArrayProperty':{const n=this.count();return Array.from({length:n},()=>this.value(t.args[0],depth+1));}
      case 'MapProperty':{
        const removed=this.count();for(let i=0;i<removed;i++)this.value(t.args[0],depth+1);
        const n=this.count(),a=[];for(let i=0;i<n;i++)a.push({key:this.value(t.args[0],depth+1),value:this.value(t.args[1],depth+1)});return a;
      }
      default:throw Error('不支持的存档字段类型：'+t.name);
    }
  }
  read(){
    if(this.u32()!==0x53415647)throw Error('解密校验失败：未找到 GVAS 标记');
    const ver=this.u32();if(ver!==3)throw Error('暂不支持此 GVAS 版本');
    this.u32();const ue=this.u32();if(ue<1012)throw Error('暂不支持此引擎存档版本');
    const major=this.u16(),minor=this.u16();this.u16();this.u32();this.str();
    if(major!==5||minor!==6)throw Error('目前验证的引擎版本为 UE 5.6，此存档需要重新验证');
    const cv=this.u32();if(cv!==3)throw Error('自定义版本格式不兼容');this.skip(this.count()*20);
    const type=this.str();if(type!=='/Script/mucha.CPP_MuchaGameSaveData')throw Error('这不是《最终幻想共鸣》的游戏存档');
    if(this.u8()!==0)throw Error('不支持的根属性格式');
    const root=this.props(0,new Set(['Player','Map','inventory','tranferTargetInventory','Progress']));
    if(!root.Map||!Array.isArray(root.Map.mapGimmick))throw Error('存档缺少地图收集记录');
    const states=new Map(),visited=new Set();
    for(const m of root.Map.mapGimmick){visited.add(m.key);const list=m.value?.treasureBox?.treasureBoxList;if(!Array.isArray(list))throw Error('宝箱记录格式异常');
      for(const p of list){if(typeof p.IsOpen!=='boolean'||!Number.isInteger(p.UniqueID))throw Error('收集状态校验失败');const k=m.key+':'+p.UniqueID;if(states.has(k))throw Error('重复的收集记录');states.set(k,{open:p.IsOpen,id:p.ID});}
    }
    const held=(root.inventory||[]).filter(p=>p.ItemId===25004).reduce((a,p)=>a+p.Num,0);
    let delivered=0;for(const m of root.tranferTargetInventory?.inventory||[])for(const n of m.value.inventory||[])for(const p of n.value.inventoryList||[])if(p.ItemId===25004)delivered+=p.Num;
    return {root,states,visited,held,delivered,totalShards:held+delivered};
  }
}
function decodeSave(bytes,aes){
  if(bytes.length>32*1024*1024)throw Error('存档大于 32 MB，拒绝读取');
  if(bytes.length<64)throw Error('文件过短，无法读取');
  const magic=String.fromCharCode(...bytes.subarray(0,4));
  if(magic!=='SVHD')throw Error('请选择原始 GameSaveData*.sav 文件（SVHD 格式）');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint16(4,true)!==1||view.getUint16(6,true)!==1)throw Error('不支持的 SVHD 版本');
  if((bytes.length-32)%16)throw Error('存档长度不完整');
  const key=new TextEncoder().encode('wwrqPkdwzPvgfchQ8kTYHVbn4umTf3d7');
  const plain=new aes.ModeOfOperation.ecb(key).decrypt(bytes.subarray(32));
  return new SaveReader(plain).read();
}
if(typeof module!=='undefined')module.exports={SaveReader,decodeSave};
