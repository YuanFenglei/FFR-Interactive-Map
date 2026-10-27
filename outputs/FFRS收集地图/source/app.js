'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const REGION={Grandshelt:'格兰谢尔特',Lanzelt:'兰泽尔特',Kolobos:'科洛波斯',Dirnado:'迪尔纳多',Olderion:'奥尔德里安',Zoldaad:'佐尔达德',MagiNationMysidia:'密西迪亚',Gronoa:'戈罗诺亚',Pharm:'法尔姆',LandOfTheCrystals:'水晶之地',None:'其他地区'};
const ORDER=Object.keys(REGION);
let maps=CATALOG.maps.filter(m=>m.points.length).sort((a,b)=>ORDER.indexOf(a.region)-ORDER.indexOf(b.region)||a.id-b.id);
let state=null,current=maps.find(m=>m.id===3010)||maps[0],selected=null,layer='all',view=null,loadToken=0;
const all=maps.flatMap(m=>m.points.map(p=>({m,p}))),images=CATALOG.images;
for(const m of maps){let s=0,b=0;for(const p of m.points)p.label=p.kind==='shard'?'S'+(++s):'B'+(++b);}
for(const r of ORDER.filter(r=>maps.some(m=>m.region===r))){const o=document.createElement('option');o.value=r;o.textContent=REGION[r]||r;$('region').append(o);}
function status(p){if(!state)return 'preview';const s=state.states.get(p.key);return s?s.open?'done':'closed':'unknown';}
const statusText={preview:'预览',done:'已获取',closed:'未获取',unknown:'未记录'};
function counts(ps,kind){const items=ps.filter(p=>!kind||p.kind===kind);return [items.filter(p=>status(p)==='done').length,items.length];}
function countText(ps,kind){const [a,b]=counts(ps,kind);return (state?a:'—')+' / '+b;}
function title(p){return p.kind==='shard'?'石板碎片':p.money>0?p.money+' 金币':(p.itemName==='-1'?'物品信息未配置':p.itemName)+(p.quantity>1?' × '+p.quantity:'');}
function create(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
function notice(text,error=false){$('notice').textContent=text;$('notice').className=error?'error':'';}
function matches(m){const q=$('search').value.trim().toLowerCase();return (!$('region').value||m.region===$('region').value)&&(!q||(m.name+' '+m.code+' '+m.points.map(title).join(' ')).toLowerCase().includes(q));}
function updateList(){
  $('mapList').replaceChildren();const ms=maps.filter(matches);
  for(const m of ms){const row=document.createElement('button');row.className='maprow'+(m===current?' selected':'');row.setAttribute('aria-pressed',String(m===current));
    const name=document.createElement('div');name.className='name';const text=document.createElement('span');text.textContent=m.name;const code=document.createElement('span');code.className='code';code.textContent='#'+m.id;name.append(text,code);
    const count=document.createElement('div');count.className='counts';count.textContent='◆ '+countText(m.points,'shard')+'　■ '+countText(m.points,'chest');row.append(name,count);row.onclick=()=>setMap(m);$('mapList').append(row);
  }
  if(!ms.length){const e=document.createElement('div');e.className='empty';e.textContent='没有匹配的地区或物品';$('mapList').append(e);}
}
function totals(){
  $('shardTotal').textContent=countText(all.map(x=>x.p),'shard');$('chestTotal').textContent=countText(all.map(x=>x.p),'chest');
  if(state){const located=counts(all.map(x=>x.p),'shard')[0];$('crosscheck').textContent=`存档累计 ${state.totalShards} 片（持有 ${state.held} + 交付 ${state.delivered}）。地图确认 ${located} 片。`+(located!==state.totalShards?' 数量不一致，请核对游戏版本；未匹配记录保持未知。':' 数量核对一致。');}
  else $('crosscheck').textContent='选择存档可查看收集状态；预览模式不判断是否获取。';
}
function setMap(m){current=m;selected=null;layer='all';$('detail').hidden=true;$('mapTitle').textContent=m.name;$('mapSubtitle').textContent=(REGION[m.region]||m.region)+'　·　'+m.code+'　·　地图 #'+m.id;
  $('layer').replaceChildren();const opt=document.createElement('option');opt.value='all';opt.textContent='全部分区叠加';$('layer').append(opt);
  for(const a of m.areas){const o=document.createElement('option');o.value=a.id;o.textContent='分区 '+a.id+' · '+m.points.filter(p=>p.layers.includes(a.id)).length+' 个候选点';$('layer').append(o);}
  updateList();drawTiles();fit();renderPoints();
}
function selectedAreas(){return current.areas.filter(a=>layer==='all'||String(a.id)===layer);}
function drawTiles(){
  $('tiles').replaceChildren();for(const a of selectedAreas().sort((a,b)=>b.priority-a.priority)){if(!images[a.image])continue;const size=Math.max(a.w,a.h);const im=create('image',{x:a.x-size/2,y:a.y-size/2,width:size,height:size,href:images[a.image],preserveAspectRatio:'none'});$('tiles').append(im);}
}
function visiblePoints(){return current.points.filter(p=>{
  if(p.kind==='shard'&&!$('shards').checked||p.kind==='chest'&&!$('chests').checked)return false;
  const s=status(p);if(s==='done'&&!$('opened').checked||s==='closed'&&!$('closed').checked||s==='unknown'&&!$('unrecorded').checked)return false;
  return layer==='all'||p.layers.includes(Number(layer))||!p.layers.length;
});}
function fit(){
  let box=current.bounds;
  if(layer!=='all'){const a=selectedAreas()[0];box=[a.x,a.y,Math.max(a.w,a.h),Math.max(a.w,a.h)];}
  const rect=$('map').getBoundingClientRect(),ratio=Math.max(rect.width,1)/Math.max(rect.height,1);
  let w=box[2]*1.12,h=box[3]*1.12;if(w/h<ratio)w=h*ratio;else h=w/ratio;
  view={x:box[0]-w/2,y:box[1]-h/2,w,h};applyView();
}
function applyView(){if(!view)return;$('map').setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);scaleMarkers();}
function scaleMarkers(){if(!view)return;const scale=view.w/Math.max($('map').clientWidth,1);for(const g of $('markers').children){g.setAttribute('transform',`translate(${g.dataset.x} ${g.dataset.y}) scale(${scale})`);}}
function renderPoints(){
  $('markers').replaceChildren();$('pointList').replaceChildren();const ps=visiblePoints();
  for(const p of ps){
    const s=status(p),g=create('g',{class:'marker '+(s==='done'?'done':s==='unknown'?'unknown':'')+(selected===p?' active':''),tabindex:'0',role:'button','aria-label':p.label+' '+title(p)+' '+statusText[s]});g.dataset.x=p.position.Y;g.dataset.y=-p.position.X;
    g.append(create('circle',{r:19,fill:'transparent',class:'halo'}));
    const sh=p.kind==='shard'?create('path',{d:'M0 -13 L11 0 L0 13 L-11 0 Z',fill:'#f1c775',class:'shape'}):create('rect',{x:-11,y:-9,width:22,height:18,rx:3,fill:'#6fdbca',class:'shape'});g.append(sh);
    const num=create('text',{x:0,y:0,class:'number'});num.textContent=p.label.slice(1);g.append(num);const tt=create('title');tt.textContent=p.label+' · '+title(p)+' · '+statusText[s];g.append(tt);
    g.onclick=e=>{e.stopPropagation();showDetail(p);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showDetail(p);}};$('markers').append(g);
    const row=document.createElement('button');row.className='pointrow';for(const [cls,text] of [['muted',p.label],[p.kind==='shard'?'gold':'teal',p.kind==='shard'?'石板碎片':p.safe?'保险箱':'宝箱'],['',title(p)],['state',statusText[s]]]){const e=document.createElement('span');e.className=cls;e.textContent=text;row.append(e);}row.onclick=()=>{showDetail(p);centerPoint(p);};$('pointList').append(row);
  }
  if($('landmarks').checked)for(const l of current.landmarks){const g=create('g',{'pointer-events':'none'});g.dataset.x=l.position.Y;g.dataset.y=-l.position.X;g.append(create('circle',{r:5,fill:l.kind==='save'?'#e2eafa':'#9c91c5',stroke:'#142030','stroke-width':2}));const title=create('title');title.textContent=l.kind==='save'?'存档点':'出入口';g.append(title);$('markers').prepend(g);}
  if(!ps.length){const e=document.createElement('div');e.className='empty';e.textContent='当前筛选下没有点位';$('pointList').append(e);}
  const known=current.points.filter(p=>status(p)==='unknown').length;$('mapStats').textContent='本地区：石板 '+countText(current.points,'shard')+'　宝箱 '+countText(current.points,'chest')+'　·　显示 '+ps.length+' 个'+(state&&known?' / '+known+' 个未记录':'');
  scaleMarkers();
}
function centerPoint(p){if(!view)return;view.x=p.position.Y-view.w/2;view.y=-p.position.X-view.h/2;applyView();}
function showDetail(p){selected=p;renderPoints();const d=$('detail');d.replaceChildren();d.hidden=false;const close=document.createElement('button');close.className='x';close.textContent='×';close.setAttribute('aria-label','关闭点位详情');close.onclick=()=>{d.hidden=true;selected=null;renderPoints();};d.append(close);
  const h=document.createElement('h3');h.textContent=p.label+' · '+title(p);d.append(h);
  const lines=[(p.safe?'保险箱 · ':'')+statusText[status(p)],'地图 #'+current.id+' / 点位 UID '+p.uid,'坐标 X '+Math.round(p.position.X)+'　Y '+Math.round(p.position.Y)+'　Z '+Math.round(p.position.Z),p.layers.length?'所在候选分区：'+p.layers.join('、'):'分区归属待核对；标记使用原始世界坐标'];
  if(p.layers.length>1)lines.push('此处平面区域重叠，结合高度 Z 和游戏画面确认楼层。');
  if(status(p)==='unknown')lines.push('存档没有对应记录；不能区分未进入、未拾取或版本变化。');
  if(p.openCondition)lines.push('开启条件（游戏表达式）：'+p.openCondition);
  if(p.condition)lines.push('出现条件（游戏表达式）：'+p.condition);
  if(p.trap)lines.push('该宝箱带有战斗触发。');
  for(const line of lines){const el=document.createElement('p');el.textContent=line;d.append(el);}
}
function zoom(f,cx,cy){const r=$('map').getBoundingClientRect();cx=cx??r.left+r.width/2;cy=cy??r.top+r.height/2;const ux=(cx-r.left)/r.width,uy=(cy-r.top)/r.height;const nw=Math.min(Math.max(view.w*f,200),200000),nh=nw*r.height/r.width;view.x+=ux*(view.w-nw);view.y+=uy*(view.h-nh);view.w=nw;view.h=nh;applyView();}
$('map').addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.15:1/1.15,e.clientX,e.clientY);},{passive:false});
let drag=null;
$('map').addEventListener('pointerdown',e=>{if(e.target.closest('.marker'))return;drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};$('map').setPointerCapture(e.pointerId);$('map').classList.add('dragging');});
$('map').addEventListener('pointermove',e=>{if(!drag)return;const s=view.w/$('map').clientWidth;view.x=drag.vx-(e.clientX-drag.x)*s;view.y=drag.vy-(e.clientY-drag.y)*s;applyView();});
for(const name of ['pointerup','pointercancel'])$('map').addEventListener(name,()=>{drag=null;$('map').classList.remove('dragging');});
$('zoomIn').onclick=()=>zoom(1/1.4);$('zoomOut').onclick=()=>zoom(1.4);$('fit').onclick=fit;
$('layer').onchange=()=>{layer=$('layer').value;selected=null;$('detail').hidden=true;drawTiles();fit();renderPoints();};
for(const id of ['shards','chests','opened','closed','unrecorded','landmarks'])$(id).onchange=()=>{selected=null;$('detail').hidden=true;renderPoints();};
$('region').onchange=updateList;$('search').oninput=updateList;
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
$('clear').onclick=()=>{loadToken++;state=null;selected=null;$('file').value='';$('clear').hidden=true;$('saveName').textContent='未加载存档 · 预览全部点位';$('detail').hidden=true;notice('已清除页面内的进度。原始存档保持不变。');totals();updateList();renderPoints();};
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;
  const token=++loadToken;
  notice('正在浏览器内读取和校验存档…');
  try{if(file.size>32*1024*1024)throw Error('文件大于 32 MB');const bytes=new Uint8Array(await file.arrayBuffer());if(token!==loadToken)return;const parsed=decodeSave(bytes,aesjs);state=parsed;selected=null;$('detail').hidden=true;$('saveName').textContent=file.name+' · '+new Date(file.lastModified).toLocaleString('zh-CN');$('clear').hidden=false;totals();updateList();renderPoints();notice('已只读解析 '+file.name+'。游戏保存后，请重新选择文件以更新地图；没有写入或上传任何存档。');}
  catch(e){if(token===loadToken)notice('无法读取：'+e.message+'。原存档和先前加载的进度均未更改。',true);}
  finally{if(token===loadToken)$('file').value='';}
};
new ResizeObserver(()=>{if(view)fit();}).observe($('mapwrap'));
totals();setMap(current);
