(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notes={
    1001:['撞击5蓝破防35、火炎剑15蓝威力35/破防33；高耗招按击杀与爆发窗口选。','挑衅10、超护盾25、凝聚力25、号令40。号令要付本人行动与MP，按关键行动转交评价。'],
    1002:['明镜13蓝/威力19/破防40，明镜·乱19蓝/总威力35/破防38；极·明镜68蓝是爆发档。敏锐准备与MP需入账，明镜不受无念无想加成。','急速6、强急速24是速度支援；自身明镜止水25属于本人破防准备，不算全队多动。'],
    1003:['光芒箭5蓝按神圣力结算，可在治疗空档补刀；闪光炮74蓝是群攻。治疗储备不能全部拿来算输出。','治疗6、救疗18、愈疗50按有效缺血选；光芒幕帘12、卓越防御15按下一次威胁选。复活、解异常与保护分别考察。'],
    1004:['机械踢5蓝，机械冲撞12蓝；超频12蓝有准备，3次机械攻击后休息2回合。零式35蓝要求超频中，不是常驻4倍。','机械莫古扫描55蓝随机赋予弱点并覆盖旧弱点；机械鸟逃脱8蓝是探索工具。不能预设随机结果。'],
    1005:['水魔法是补伤害路线；流水波30蓝群攻，水流爆发50蓝单体。只有完成辅助工作后剩余的动作能计输出。','攻势6、突击6、铁壁8、调息20是低耗全队阵法；转战30最多每回合再动1次。长战看覆盖与维护，短战不全铺。'],
    1006:['黑暗痛楚5蓝击杀回复、吸魔0蓝耗行动，探索续航突出；魔人本能8蓝禁止白魔法恢复。永恒暗影70蓝另耗10%生命。','女王鞭9概率攻魔弱化、弱心6、悲痛29随机异常；暗领域28影响敌我并削弱非暗队友，按免疫及全队属性评估。'],
    1007:['烈风强袭5蓝积强运；赌博射击18蓝命中依强运；电光束35蓝还耗3强运，不能只按MP循环。','隐蔽身形10蓝＋4强运、女士优先21蓝＋5强运是情境工具；不与治疗/群体增益角色混排。'],
    1008:['暗之刃13蓝/威力27/破防33；精神集中35蓝需回本窗口，大魔法20蓝另提高内部魔法耗蓝。Ability魔伤不自动适用连续咏唱。','破魔7蓝用于驱散；极限屏障按极限槽与挡伤窗口评价。贤者之眼是自身弱点破防准备。']
  };
  for(const c of HUB.characters)el('active-character').add(new Option(c.name,c.id));
  for(const v of HUB.visions)el('active-vision').add(new Option(v.name,v.id));
  el('active-character').value='1002';el('active-vision').value='13128';
  function render(){
    const char=Number(el('active-character').value),vision=Number(el('active-vision').value),role=el('active-role').value,pool=el('active-pool').value;
    const q=el('active-query').value.trim().toLowerCase();
    const ids=['active-mp','active-reserve','active-turns'];
    if(ids.some(id=>el(id).value===''||!el(id).checkValidity())){el('active-status').textContent='请输入有效的整数MP、储备及出手次数。';el('active-rows').innerHTML='';return;}
    const [mp,reserve,n]=ids.map(id=>Number(el(id).value));
    if(reserve>mp){el('active-status').textContent='储备不能超过当前MP。';el('active-rows').innerHTML='';return;}
    const budget=mp-reserve;
    el('active-character-note').textContent=notes[char][role==='DPS'?0:1];
    const available=new Map();
    function add(s,source,label){
      if(s.kind==='被动')return;
      if(!available.has(s.id))available.set(s.id,{...s,pools:[],poolLabels:[]});
      const r=available.get(s.id);r.pools.push(source);r.poolLabels.push(label);
      if(source!=='inherit')r.free=true;
      if(source==='inherit'&&s.ap!=null)r.inheritAP=s.ap;
    }
    for(const s of HUB['character-skills'].filter(s=>s.visionId===char))add(s,'character','自身：'+s.sources.join(' / '));
    for(const s of HUB.skills.filter(s=>s.visionId===vision))add(s,'vision','主幻兵：'+s.vision+' '+s.sources.join(' / '));
    for(const s of HUB.skills.filter(s=>s.sources.some(x=>x.startsWith('熟练'))&&s.visionId!==vision))add(s,'inherit','继承候选：'+s.vision+' '+s.sources.filter(x=>x.startsWith('熟练')).join(' / '));
    const rows=[...available.values()].filter(s=>(role==='DPS'?s.damageAction||s.id===407090:!s.damageAction&&s.id!==407090)&&(!pool||s.pools.includes(pool))&&(!q||(s.name+s.description+s.poolLabels.join(' ')).toLowerCase().includes(q)));
    rows.sort((a,b)=>(a.costType==='MP'?a.cost:Infinity)-(b.costType==='MP'?b.cost:Infinity)||a.id-b.id);
    el('active-status').textContent=`${rows.length} 个去重候选 · 当前MP ${mp}，储备 ${reserve}，可花 ${budget} · ${n} 次计划执行 · 以已解锁、已习得为前提；继承候选尚未装备`;
    el('active-rows').innerHTML=rows.map(s=>{
      const resource=s.costType||'MP',extra=(s.extraCosts||[]).map(x=>`＋${x.value} ${x.type}`).join('');
      let pressure='极限/特殊资源另算';
      if(resource==='MP'){
        const max=s.cost>0?Math.floor(budget/s.cost):Infinity,casts=Math.min(n,max);
        pressure=`${casts}/${n}次 · 消耗${casts*s.cost} MP`;
        if(casts<n)pressure+=`；缺${n-casts}次，需改招/补给`;
        if(extra||(s.locks||[]).length||s.kind==='特殊')pressure+='；仅MP可负担，条件另验';
        if(s.cost===0)pressure+='；0 MP不代表无行动/目标/状态限制';
      }
      const metric=role==='DPS'?`${s.power} / ${s.breakValue}<small>${esc(s.damage)} · ${esc(s.element)} · ${esc(s.target)}<br>整招${s.hits}段；不可再乘段数</small>`:'—<small>按任务、覆盖及维护评价</small>';
      const ratio=role==='DPS'&&s.comparable&&s.cost>0?`${(s.power/s.cost).toFixed(2)}<small>原始威力/MP，非伤害</small>`:'—<small>辅助/条件/特殊公式不折算</small>';
      return `<tr><td><strong>${esc(s.name)}</strong><small>#${s.id} · ${esc(s.kind)}</small></td><td>${s.poolLabels.map(esc).join('<br>')}<small>${s.free?'已解锁时不占继承格':`${s.inheritAP} AP / 1格，须学会后装备`}</small></td><td class="numeric">${s.cost} ${esc(resource)}<small>${esc(extra)}</small></td><td>${metric}</td><td>${ratio}</td><td>${esc(pressure)}</td><td>${esc(s.description)}</td></tr>`;
    }).join('')||'<tr><td colspan="7">没有匹配条目</td></tr>';
  }
  ['active-character','active-vision','active-role','active-pool','active-query','active-mp','active-reserve','active-turns'].forEach(id=>el(id).addEventListener(['active-query','active-mp','active-reserve','active-turns'].includes(id)?'input':'change',render));
  render();
})();
