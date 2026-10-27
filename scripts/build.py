"""Build the offline handbook from public repository inputs. Python stdlib only."""
from pathlib import Path
import argparse
import base64
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8-sig')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--zip', action='store_true', help='also build the downloadable offline bundle')
    args = parser.parse_args()
    hub = {key: json.loads(read('data/' + key + '.json')) for key in ['skills', 'rankings', 'visions', 'builds']}
    hub['portraits'] = {p.stem: 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode() for p in sorted((ROOT/'assets/portraits').glob('*.png'))}
    template = read('source/map.template.html')
    template = template.replace('<title>共鸣 · 收集地图</title>', '<title>FFR 共鸣手册 · 地图、技能与攻略</title>')
    template = template.replace('<h1>共鸣 <span>收集地图</span></h1>', '<h1>共鸣 <span>冒险者手册</span></h1>')
    template = template.replace('FINAL FANTASY RESONANCE · 离线图鉴', 'FINAL FANTASY RESONANCE · FIELD NOTES')
    template = template.replace('<body>', '<body><a class="skip-link" href="#skills">跳到技能速查</a>')
    start, end = template.index('<main>'), template.index('</main>')+len('</main>')
    map_panel = '<section id="page-map">'+template[start:end]+'</section>'
    template = template[:start]+read('source/hub.template.html').replace('<!--MAP-->', map_panel)+template[end:]
    # The main navigation stays above the per-map status notice.
    nav = re.search(r'<nav class="hub-nav".*?</nav>', template, re.S).group()
    template = template.replace(nav, '').replace('</header>', '</header>'+nav, 1)
    values = {'STYLE': read('source/map.css')+'\n'+read('source/hub.css'), 'AES': read('source/aes.js'), 'READER': read('source/save-reader.js'), 'CATALOG': read('data/maps.json'), 'APP': read('source/map.js')}
    for key, value in values.items():
        template = template.replace('/*'+key+'*/', value)
    data = json.dumps(hub, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    template = template.replace('</body>', '<script>const HUB='+data+';</script><script>'+read('source/hub.js')+'</script></body>')
    (ROOT/'index.html').write_text(template, encoding='utf-8', newline='\n')
    if args.zip:
        with zipfile.ZipFile(ROOT/'FFR共鸣手册.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for path in ['index.html', 'README.md', 'source/aes-js-LICENSE.txt']:
                entry = zipfile.ZipInfo(path, date_time=(2026,10,27,0,0,0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(entry, (ROOT/path).read_bytes())
    print(f'Built index.html: {(ROOT/"index.html").stat().st_size:,} bytes; all resources inline')

if __name__ == '__main__':
    main()
