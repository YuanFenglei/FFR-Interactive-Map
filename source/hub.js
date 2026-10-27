(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has=(s,q)=>String(s).toLocaleLowerCase().includes(q.toLocaleLowerCase());
  const clean=s=>String(s??'').replace(/\*\*/g,'').replace(/`/g,'');
  const val=v=>v==null?'—':v;
  const types={Ability:'特技',Magic:'魔法',MagicSword:'魔法剑',FinishBlow:'共鸣',Physic:'物理',None:'无',Fire:'火',Ice:'冰',Thunder:'雷',Water:'水',Wind:'风',Earth:'土',Light:'光',Dark:'暗',Single:'单体',All:'全体',Random:'随机'};
  const tr=v=>types[v]||v||'—';
  const portrait=id=>HUB.portraits[id];
  const grouped=new Map();
  for(const row of HUB.skills){
    const key=row.kind+':'+row.id;
    if(!grouped.has(key))grouped.set(key,{...row,origins:[]});
    grouped.get(key).origins.push({vision:row.vision,visionId:row.visionId,sources:row.sources,ap:row.ap});
  }
  const skills=[...grouped.values()];
  // A shared skill may first appear as an awakening reward and later as mastery.
  for(const s of skills){const fees=s.origins.map(o=>o.ap).filter(v=>v!=null);s.ap=fees.length?Math.min(...fees):null;}
  let skillPage=0,filteredSkills=[],buildIndex=0;
  function page(){
    const params=new URLSearchParams(location.hash.slice(1));
    const first=location.hash.slice(1).split('&')[0];
    const name=['map','skills','rankings','builds','visions'].includes(first)?first:'map';
    for(const node of document.querySelectorAll('[id^="page-"]'))node.hidden=node.id!=='page-'+name;
    for(const a of document.querySelectorAll('[data-page]')){a.classList.toggle('active',a.dataset.page===name);if(a.dataset.page===name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
    document.querySelector('.filebar').hidden=name!=='map';
    el('notice').hidden=name!=='map';
    if(name==='map')requestAnimationFrame(()=>{fit();renderPoints();});
    if(name==='skills'&&params.has('vision')){el('skill-vision').value=params.get('vision');el('skill-query').value='';el('skill-kind').value='';el('skill-source').value='';skillPage=0;renderSkills();}
    window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',page);
  for(const v of [...HUB.visions].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')))el('skill-vision').add(new Option(v.name,String(v.id)));
  function selectedOrigins(s){
    const vision=el('skill-vision').value,source=el('skill-source').value;
    return s.origins.filter(o=>(!vision||String(o.visionId)===vision)&&(!source||o.sources.some(x=>x.startsWith(source))));
  }
  function selectedAP(s){
    if(el('skill-source').value&&el('skill-source').value!=='熟练')return null;
    const fees=selectedOrigins(s).map(o=>o.ap).filter(v=>v!=null);
    return fees.length?Math.min(...fees):null;
  }
  function filterSkills(){
    const q=el('skill-query').value.trim(),vision=el('skill-vision').value,kind=el('skill-kind').value,source=el('skill-source').value;
    const sort=el('skill-sort').value;
    return skills.filter(s=>(!kind||s.kind===kind)&&(!q||has([s.name,s.id,s.description,s.group,...s.origins.map(o=>o.vision)].join(' '),q))&&s.origins.some(o=>(!vision||String(o.visionId)===vision)&&(!source||o.sources.some(x=>x.startsWith(source))))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'zh-CN'):sort==='ap'?(selectedAP(a)??Infinity)-(selectedAP(b)??Infinity):((b[sort]??-Infinity)-(a[sort]??-Infinity)));
  }
  function renderSkills(){
    filteredSkills=filterSkills();
    const pages=Math.max(1,Math.ceil(filteredSkills.length/30));skillPage=Math.min(skillPage,pages-1);
    el('skill-count').textContent=`找到 ${filteredSkills.length} / ${skills.length} 个去重技能`;
    el('skill-page').textContent=`${skillPage+1} / ${pages}`;
    el('skill-prev').disabled=skillPage===0;el('skill-next').disabled=skillPage>=pages-1;
    el('skill-rows').innerHTML=filteredSkills.slice(skillPage*30,skillPage*30+30).map(s=>`<tr><td><button class="skill-name" data-skill="${esc(s.kind+':'+s.id)}">${esc(s.name)}</button><small>#${s.id}</small></td><td><span class="tag">${s.kind}</span>${s.kind==='主动'?esc(tr(s.category)):''}<small>${esc(selectedOrigins(s).map(o=>o.vision+' · '+o.sources.filter(x=>!el('skill-source').value||x.startsWith(el('skill-source').value)).join(' / ')).join('；'))}</small></td><td class="numeric">${selectedAP(s)==null?'本体绑定':selectedAP(s)+' AP'}</td><td class="numeric">${s.kind==='被动'?'—':val(s.power)+' / '+val(s.breakValue)}</td><td>${esc(s.description)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-message">没有匹配技能。试试清空筛选或缩短关键词。</td></tr>';
    el('skill-rows').querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>showSkill(grouped.get(b.dataset.skill)));
  }
  function showSkill(s){
    const active=s.kind!=='被动';
    el('skill-detail-content').innerHTML=`<div class="eyebrow">ABILITY #${s.id} · ${esc(s.kind)}</div><h2 id="skill-dialog-title">${esc(s.name)}</h2><p>${esc(s.description)}</p><div class="detail-metrics"><div><b>${s.ap==null?'绑定':s.ap}</b><small>跨主幻兵继承AP</small></div><div><b>${active?val(s.cost):'—'}</b><small>${s.kind==='共鸣'?'原始Cost（共鸣非MP指令）':'原始费用'}</small></div><div><b>${active?val(s.power):'—'}</b><small>原始总威力</small></div><div><b>${active?val(s.breakValue):'—'}</b><small>原始破防配置</small></div></div><p class="callout">${esc(active?'威力 / 破防为配置值。治疗、准备、特殊公式与共鸣不能据此直接推算伤害；段数不再乘总威力。':'作用环节：'+s.group)}\n主幻兵已习得熟练技免费生效；觉醒与共鸣本体绑定，配置中的装备费用不构成继承权限。</p><h3>习得来源</h3>${s.origins.map(o=>`<p><strong>${esc(o.vision)}</strong>　${esc(o.sources.join(' / '))}　${o.ap==null?'本体绑定':o.ap+' AP（跨主幻兵继承）'}</p>`).join('')}${active?`<h3>主动参数</h3><p>${esc(tr(s.category))} / ${esc(tr(s.damage))} / ${esc(tr(s.element))} / ${esc(tr(s.target))}<br>段数 ${val(s.hits)} · 原始命中 ${val(s.accuracy)} · 原始暴击 ${val(s.critical)}<br>段比例 ${esc(s.ratios.slice(0,s.hits).join(' / '))}</p>`:''}<details><summary>查看原文与效果参数</summary><p>${esc(s.original)}</p><p class="raw-effects">原始equipCost：${s.rawEquipCost}（不是继承资格）</p>${s.effects.map(e=>`<p class="raw-effects">#${e.id} ${esc(e.type)} · ${esc(e.timing)} · Turn=${e.turns}<br>ParamList：${esc(e.params.join(', '))}</p>`).join('')}</details>`;
    el('skill-dialog').showModal();
  }
  el('skill-dialog-close').onclick=()=>el('skill-dialog').close();
  for(const id of ['skill-query','skill-vision','skill-kind','skill-source','skill-sort'])el(id).addEventListener(id==='skill-query'?'input':'change',()=>{skillPage=0;renderSkills();});
  el('skill-reset').onclick=()=>{for(const id of ['skill-query','skill-vision','skill-kind','skill-source'])el(id).value='';el('skill-sort').value='name';skillPage=0;renderSkills();};
  el('skill-prev').onclick=()=>{skillPage--;renderSkills();el('skill-count').scrollIntoView({block:'start'});};el('skill-next').onclick=()=>{skillPage++;renderSkills();el('skill-count').scrollIntoView({block:'start'});};
  HUB.rankings.forEach((r,i)=>el('rank-select').add(new Option(clean(r.title),i)));
  el('rank-select').value=String(Math.max(0,HUB.rankings.findIndex(r=>r.title.startsWith('表9'))));
  function renderRank(){
    const rank=HUB.rankings[Number(el('rank-select').value)],q=el('rank-query').value.trim();
    el('rank-title').textContent=clean(rank.title);el('rank-intro').textContent=clean(rank.intro)||'不同作用区和不同单位分别比较，不按最终伤害理解表内百分数。';
    const rows=rank.rows.filter(r=>!q||has(r.join(' '),q));
    el('rank-table').innerHTML=`<table class="data-table"><thead><tr>${rank.headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${rank.headers.length}" class="empty-message">没有匹配条目</td></tr>`}</tbody></table>`;
    el('rank-notes').textContent=clean(rank.notes);
  }
  el('rank-select').onchange=renderRank;el('rank-query').oninput=renderRank;
  function formula(){
    const inputs=['calc-a','calc-add','calc-p'].map(id=>el(id));
    if(inputs.some(i=>i.value===''||!i.checkValidity())){el('calc-result').textContent='请输入0～1000的有效数值';return;}
    const [a,add,p]=inputs.map(i=>Number(i.value));
    el('calc-result').textContent=`倍率乘积 ${((1+(a+add)/100)*(1+p/100)).toFixed(3)} · 新增A的相对收益 ${(add/(100+a)*100).toFixed(1)}%`;
  }
  ['calc-a','calc-add','calc-p'].forEach(id=>el(id).oninput=formula);
  function renderBuild(){
    const b=HUB.builds[buildIndex];
    el('build-tabs').innerHTML=HUB.builds.map((x,i)=>`<button class="${i===buildIndex?'active':''}" aria-pressed="${i===buildIndex}" data-build="${i}">${x.name}</button>`).join('');
    el('build-tabs').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{buildIndex=Number(btn.dataset.build);renderBuild();});
    el('build-content').innerHTML=`<div class="build-banner"><img src="${portrait(b.visionId)}" alt="${HUB.visions.find(v=>v.id===b.visionId).name}"><div><div class="eyebrow">${esc(b.subtitle)}</div><h3>${esc(b.title)}</h3><p>${esc(b.requirements)}</p></div></div><p class="callout">${esc(b.free)}</p><div class="build-layout"><div class="build-box"><h3>继承配置 · 勾选比较费用</h3><div class="budget-row"><label for="build-budget">可用AP</label><input id="build-budget" type="number" min="0" max="999" value="${b.budget}"><button id="build-restore">恢复推荐</button></div><div id="build-total" class="budget-output" role="status"></div>${b.slots.map((s,i)=>`<label class="slot"><input type="checkbox" checked data-slot="${i}" aria-label="装备${esc(s.name)}"><span><strong>${esc(s.name)}</strong><small>${esc(s.source)}<br>${esc(s.note)}</small></span><span class="cost">${s.ap} AP</span></label>`).join('')}<small class="muted">此处仅计算所选预设的费用；取消技能会改变方案效果，不自动生成最优配装。</small></div><div class="build-box"><h3>行动安排</h3>${b.actions.map(a=>`<div class="action-card"><small>${esc(a[0])}</small><strong>${esc(a[1])}</strong><p>${esc(a[2])}</p></div>`).join('')}<h3 style="margin-top:30px">养成顺序</h3><ol class="training-list">${b.training.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div></div><div class="reading-note">${b.notes.map(n=>esc(n)).join('<br><br>')}</div>`;
    function total(){const boxes=[...el('build-content').querySelectorAll('[data-slot]:checked')];const ap=boxes.reduce((sum,x)=>sum+b.slots[Number(x.dataset.slot)].ap,0),budget=Number(el('build-budget').value),valid=el('build-budget').value!==''&&el('build-budget').checkValidity();el('build-total').textContent=`${ap} AP / ${boxes.length}栏 · ${!valid?'请输入有效AP容量':ap>budget?'超出 '+(ap-budget)+' AP':'剩余 '+(budget-ap)+' AP'}`;el('build-total').classList.toggle('error',!valid||ap>budget||boxes.length>8);}
    el('build-content').querySelectorAll('[data-slot]').forEach(x=>x.onchange=total);el('build-budget').oninput=total;el('build-restore').onclick=renderBuild;total();
  }
  function renderVisions(){
    const q=el('vision-query').value.trim(),tier=el('vision-tier').value,sort=el('vision-sort').value;
    const vs=HUB.visions.filter(v=>(!tier||tier===v.tier)&&(!q||has(v.name+v.skills+v.comment,q))).sort((a,b)=>sort==='body'?b.parts[5]-a.parts[5]||b.score-a.score:sort==='training'?b.parts[4]-a.parts[4]||b.score-a.score:b.score-a.score);
    el('vision-count').textContent=`${vs.length} 名幻兵 · 综合评价以继承价值为主，主幻兵按职责选择`;
    el('vision-cards').innerHTML=vs.map(v=>`<article class="vision-card"><div class="vision-card-top"><img src="${portrait(v.id)}" alt="${esc(v.name)}头像" loading="lazy"><div><h3>${esc(v.name)}</h3><div class="tier">${v.tier}<span>${v.score} / 100 · 本体 ${v.parts[5]} / 5</span></div></div></div><div class="score-bar" aria-hidden="true"><i style="width:${v.score}%"></i></div><p class="core-skills">${esc(v.skills)}</p><p>${esc(v.comment)}</p><p class="stop">养成停点　${esc(v.stop)}</p><details><summary>展开评分</summary><p>${['关键性','AP效率','覆盖','行动','养成','本体','打包'].map((x,i)=>`${x} ${v.parts[i]}/5`).join(' · ')}</p></details><button data-vision="${v.id}">查看全部技能与数值 →</button></article>`).join('')||'<p class="empty-message">没有匹配幻兵，试试其他关键词。</p>';
    el('vision-cards').querySelectorAll('[data-vision]').forEach(btn=>btn.onclick=()=>{location.hash='skills&vision='+btn.dataset.vision;});
  }
  function apCalc(){const four=Number(el('ap-four').value),nine=Number(el('ap-nine').value);const valid=['ap-four','ap-nine'].every(id=>el(id).value!==''&&el(id).checkValidity())&&nine<=four;el('ap-result').textContent=valid?`${100+8*four+8*nine} AP`:'请输入0～26的整数；9级人数不能多于4级人数';}
  for(const id of ['vision-query','vision-tier','vision-sort'])el(id).addEventListener(id==='vision-query'?'input':'change',renderVisions);
  ['ap-four','ap-nine'].forEach(id=>el(id).oninput=apCalc);
  renderSkills();renderRank();renderBuild();renderVisions();formula();apCalc();page();
})();
