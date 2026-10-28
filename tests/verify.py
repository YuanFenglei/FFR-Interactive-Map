"""Verify public data, offline output, links, and private-data exclusions."""
from pathlib import Path
import collections
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def main():
    skills = json.loads((ROOT/'data/skills.json').read_text(encoding='utf-8'))
    counts = {kind: len({r['id'] for r in skills if r['kind'] == kind}) for kind in ['被动', '主动', '共鸣']}
    assert counts == {'被动': 217, '主动': 233, '共鸣': 26}, counts
    assert len({r['visionId'] for r in skills}) == 26
    assert len({(r['visionId'],r['kind'],r['id']) for r in skills}) == len(skills)
    characters = json.loads((ROOT/'data/characters.json').read_text(encoding='utf-8'))
    own = json.loads((ROOT/'data/character-skills.json').read_text(encoding='utf-8'))
    assert len(characters) == 8 and len(own) == 152
    assert len({(r['visionId'],r['id']) for r in own}) == len(own)
    for c in characters:
        rows = {s['id']:s for s in own if s['visionId']==c['id']}
        assert set(rows) == set(c['skillIds'])
        assert all(rows[x['id']]['level']==x['level'] for x in c['levelRewards'])
        assert rows[c['normalSkillId']]['cost'] == 0
        assert rows[c['finalSkillId']]['kind'] == '特殊'
    assert all(r['ap'] is None for r in own)
    assert all(r['costType']=='极限槽' and not r['comparable'] for r in own if r['kind']=='极限技')
    by_id={r['id']:r for r in own+skills}
    assert [(by_id[i]['cost'],by_id[i]['power'],by_id[i]['breakValue']) for i in [220020,220030,402080]] == [(15,33,19),(44,55,21),(13,19,40)]
    assert by_id[406070]['extraCosts']==[{'type':'GoodLuck','value':3}]
    assert not by_id[406070]['comparable']
    assert by_id[210030]['role']=='辅助/特殊'  # Healing power must never rank as DPS.
    for r in skills:
        assert (r['ap'] is not None) == any(s.startswith('熟练') for s in r['sources']), r['name']
    visions = json.loads((ROOT/'data/visions.json').read_text(encoding='utf-8'))
    assert len(visions) == 26
    for v in visions:
        assert v['roles'] and set(v['roles']) <= {'DPS','辅助'}, v['name']
        assert not any(k in v for k in ['score','parts','tier','order'])
        assert (ROOT/f'assets/portraits/{v["id"]}.png').exists()
    builds = json.loads((ROOT/'data/builds.json').read_text(encoding='utf-8'))
    assert [(sum(s['ap'] for s in b['slots']),len(b['slots'])) for b in builds] == [(105,5),(170,5)]
    assert all('无念无想' not in s['name'] and '追加伤害' not in s['name'] for b in builds for s in b['slots'])
    maps = json.loads((ROOT/'data/maps.json').read_text(encoding='utf-8'))
    points = [p for m in maps['maps'] for p in m['points']]
    assert collections.Counter(p['kind'] for p in points) == {'shard':99,'chest':233}
    assert len(maps['images']) == 391
    text = (ROOT/'index.html').read_text(encoding='utf-8')
    assert "connect-src 'none'" in text
    assert not re.search(r'<(?:script|link)[^>]+(?:src|href)=',text)
    assert not re.search(r'\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\s*[.(]',text)
    ids = re.findall(r'\bid="([^"]+)"',text[:text.index('<script>')])
    assert len(ids) == len(set(ids)), 'Duplicate HTML ids'
    assert all(f'id="page-{p}"' in text for p in ['map','skills','rankings','builds','visions','active'])
    forbidden = [r'7656119\d{10}',r'gh[pousr]_[A-Za-z0-9]{20,}',r'github_pat_[A-Za-z0-9_]{20,}',r'[A-Z]:[\\/](?:Users|怀旧服|SteamLibrary)',r'(?:visionList|unitParameterList)',r'(?:09:36:54|21:25:36|58/99|107/233)',r'-----BEGIN [A-Z ]*PRIVATE KEY-----']
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix in ['.png','.zip','.pyc'] or 'node_modules' in path.parts:
            continue
        assert path.suffix.lower() != '.sav', path
        if path == Path(__file__):
            continue  # This file contains the exclusion expressions themselves.
        data = path.read_text(encoding='utf-8-sig')
        assert not any(re.search(p,data,re.I) for p in forbidden), f'Private-data pattern: {path.relative_to(ROOT)}'
        if path.suffix == '.md':
            for url in re.findall(r'\[[^\]]*\]\(([^)]+)\)',data):
                if url.startswith(('http:','https:','#','mailto:')):
                    continue
                target = url.split('#')[0]
                assert (path.parent/target).resolve().is_relative_to(ROOT.resolve()), f'Out-of-repo link: {path.name}: {url}'
                assert (path.parent/target).exists(), f'Broken link: {path.name}: {url}'
    with zipfile.ZipFile(ROOT/'FFR共鸣手册.zip') as z:
        assert set(z.namelist()) == {'index.html','README.md','source/aes-js-LICENSE.txt'}
        for name in z.namelist():
            assert z.read(name) == (ROOT/name).read_bytes(), f'Outdated archive: {name}'
    print('PASS: 476 vision skills + 152 character source rows, 8 characters, 26 ratings, 2 builds, 332 map points; links, archive, offline and privacy checks')

if __name__ == '__main__':
    main()
