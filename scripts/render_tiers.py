"""Render the role-specific recommendation chart (requires Pillow)."""
from pathlib import Path
import argparse,json,math
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
BG='#101a22'; PANEL='#182731'; CARD='#223540'; TEXT='#f1f3ee'; MUTED='#adbdc0'; GOLD='#e1c58c'
COLORS={'S':'#edaa99','A':'#e6c67d','B':'#96c9bc'}
def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--font',default='C:/Windows/Fonts/msyh.ttc')
 parser.add_argument('--bold-font',default='C:/Windows/Fonts/msyhbd.ttc')
 parser.add_argument('--output',type=Path,default=ROOT/'assets/幻兵分职责评级.png')
 args=parser.parse_args()
 data=json.loads((ROOT/'data/tiers.json').read_text(encoding='utf-8'))
 visions={v['id']:v for v in json.loads((ROOT/'data/visions.json').read_text(encoding='utf-8'))}
 assert {v[0] for section in ['dps','support'] for rows in data[section].values() for v in rows}==set(visions)
 for section,role in [('dps','DPS'),('support','辅助')]:
  ids=[v[0] for rows in data[section].values() for v in rows]
  assert len(ids)==len(set(ids))
  assert set(ids)=={i for i,v in visions.items() if role in v['roles']}
 W=2560;M=64;gap=16;rowh=158;labelw=138;cols=6
 boardw=W-2*M;cw=(boardw-labelw-gap*(cols+1))//cols
 H=2600;im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 def font(size,bold=False):return ImageFont.truetype(args.bold_font if bold else args.font,size)
 def text(x,y,s,size=28,fill=TEXT,bold=False):d.text((x,y),s,font=font(size,bold),fill=fill)
 def fittext(x,y,s,width,size=30,fill=TEXT,bold=False):
  while d.textlength(s,font=font(size,bold))>width:size-=1
  assert size>=19,(s,size)
  text(x,y,s,size,fill,bold)
 def wrap(s,width,size):
  lines=[];line=''
  for c in s:
   if line and d.textlength(line+c,font=font(size))>width:lines.append(line);line=c
   else:line+=c
  if line:lines.append(line)
  return lines
 d.rectangle((M,54,M+8,153),fill=GOLD)
 text(M+30,42,data['title'],64,bold=True)
 text(M+32,127,'主幻兵选择  /  26名覆盖  /  主动威力 × MP × 出手窗口',30,MUTED)
 text(W-460,64,'2026.10.28',30,GOLD,True)
 text(W-460,110,'Steam build 24250053',23,MUTED)
 text(M,188,'S  优先候选       A  适配时强       B  情境选择',30,GOLD,True)
 text(M+1000,188,'对应觉醒/熟练已取得 · 同档不分先后 · 非实测伤害排名',26,MUTED)
 y=262
 def board(section,title,subtitle,y):
  text(M,y,title,42,bold=True);text(M+420,y+12,subtitle,27,MUTED)
  y+=72
  for tier,items in data[section].items():
   rows=math.ceil(len(items)/cols);height=rows*rowh+(rows-1)*gap+24
   d.rounded_rectangle((M,y,W-M,y+height),radius=18,fill=PANEL)
   d.rounded_rectangle((M,y,M+labelw,y+height),radius=18,fill=COLORS[tier])
   text(M+40,y+height/2-67,tier,68,'#162732',True)
   text(M+13,y+height/2+20,data['tiers'][tier],25,'#162732',True)
   for j,(uid,note) in enumerate(items):
    x=M+labelw+gap+(j%cols)*(cw+gap);cy=y+12+(j//cols)*(rowh+gap)
    d.rounded_rectangle((x,cy,x+cw,cy+rowh),radius=12,fill=CARD)
    avatar=Image.open(ROOT/f'assets/portraits/{uid}.png').convert('RGBA')
    avatar.thumbnail((92,102),Image.Resampling.NEAREST)
    im.paste(avatar,(x+12+(92-avatar.width)//2,cy+10),avatar)
    fittext(x+112,cy+25,visions[uid]['name'],cw-120,30,bold=True)
    # Conditions remain visible beside every tier assignment.
    lines=wrap(note,cw-24,24)
    for k,line in enumerate(lines):text(x+12,cy+103+k*28,line,24,COLORS[tier])
    assert len(lines)<=2
   y+=height+16
  return y
 y=board('dps','DPS / 破防','看主招与战局；短战兑现，长战看蓝耗和准备回本。',y)
 y+=16
 y=board('support','辅助 / 承伤','看有效治疗、保护、覆盖和维护；不折成DPS总分。',y)
 y+=8
 text(M,y,'8名角色自身技能 · 搭配起点',39,bold=True)
 text(M+700,y+9,'自身已解锁技能不占继承AP/格',27,MUTED)
 y+=68;charw=(boardw-3*gap)//4;charh=132
 for j,(name,role,note) in enumerate(data['characters']):
  x=M+(j%4)*(charw+gap);cy=y+(j//4)*(charh+gap)
  d.rounded_rectangle((x,cy,x+charw,cy+charh),radius=12,fill=PANEL)
  text(x+20,cy+14,name,32,bold=True)
  text(x+215,cy+21,role,24,GOLD)
  fittext(x+20,cy+73,note,charw-40,27,MUTED)
 y+=2*charh+gap+30
 d.line((M,y,W-M,y),fill='#3c5260',width=2);y+=18
 for line in data['notes']:
  fittext(M,y,line,boardw,25,MUTED);y+=40
 text(M,y+8,'选择顺序：角色与主招 → 装备幻兵 → 继承技能格',29,GOLD,True)
 y+=68
 assert y<=H,(y,H)
 im=im.crop((0,0,W,y))
 args.output.parent.mkdir(parents=True,exist_ok=True);im.save(args.output)
 print(f'Rendered {args.output.name}: {W}x{y}; 20 DPS + 12 support recommendations, 8 character notes')
if __name__=='__main__':main()
