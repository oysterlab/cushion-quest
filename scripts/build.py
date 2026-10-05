from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re,shutil,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parents[1]/'recovery'
OUT=ROOT/'site';OUT.mkdir(exist_ok=True)
for directory in ['chapter1/assets/sprites','chapter1/assets/bg','chapter1/assets/cut','intro-cutscene/scenes','shared']:(OUT/directory).mkdir(parents=True,exist_ok=True)
def minify(source,loader='js'):
 return subprocess.run(['npx','--yes','esbuild@0.28.2','--minify','--target=es2020','--charset=utf8',f'--loader={loader}','--log-level=error'],input=source,text=True,capture_output=True,check=True).stdout
manifest=json.loads((SOURCE/'chapter1/assets/manifest.js').read_text().split('=',1)[1].strip().rstrip(';'))
images=[]
for name,info in manifest.items():
 if 'frames' in info:
  for i in range(len(info['frames'])):images.append((SOURCE/f'chapter1/assets/sprites/{name}_{i}.png',OUT/f'chapter1/assets/sprites/{name}_{i}.webp'))
 elif 'src' in info:
  src=SOURCE/'chapter1'/info['src'];dst=OUT/'chapter1'/info['src'];shutil.copy2(src,dst)
def compress(pair):
 src,dst=pair
 with Image.open(src) as image:image.save(dst,'WEBP',lossless=True,exact=True,method=6)
 return src.stat().st_size,dst.stat().st_size
with ThreadPoolExecutor(max_workers=6) as pool:sizes=list(pool.map(compress,images))
for scene in ['s1','s2','s3','s4','s6']:shutil.copy2(SOURCE/f'chapter1/assets/cut/{scene}.webp',OUT/f'chapter1/assets/cut/{scene}.webp')
with Image.open(SOURCE/'intro-cutscene/scenes/05-king.png') as im:im.save(OUT/'intro-cutscene/scenes/05-king.webp','WEBP',quality=90,method=6)
common=(SOURCE/'chapter1/story/script.js').read_text()+'\n;\n'+(SOURCE/'shared/cutfx.js').read_text()
(OUT/'shared/common.min.js').write_text(minify(common))
game=(SOURCE/'chapter1/js/game.js').read_text().replace('assets/sprites/${name}_${i}.png','assets/sprites/${name}_${i}.webp')
assert 'else startTitle();' in game
game=game.replace('else startTitle();','else if (params.get("from") === "intro") startIntermission(0);\n    else startTitle();')
js='window.ASSET_MANIFEST='+json.dumps(manifest,separators=(',',':'))+';\n'+ '\n;\n'.join([(SOURCE/'chapter1/js/audio.js').read_text(),(SOURCE/'chapter1/js/levels.js').read_text(),game,(SOURCE/'chapter1/js/touch.js').read_text()])
(OUT/'chapter1/game.min.js').write_text(minify(js))
html=(SOURCE/'chapter1/index.html').read_text()
html=re.sub(r'<script src="[^"]+"></script>\s*','',html)
html=html.replace('</body>','<script src="../shared/common.min.js"></script><script src="game.min.js"></script></body>')
html=html.replace('<title>','<link rel="icon" href="assets/sprites/hud_face_0.webp"><title>')
(OUT/'chapter1/index.html').write_text(html)
pwa=json.loads((SOURCE/'chapter1/manifest.webmanifest').read_text());pwa['scope']='../';pwa['id']='../';pwa['icons']=[{'src':'assets/sprites/hud_face_0.webp','sizes':'any','type':'image/webp'}]
(OUT/'chapter1/manifest.webmanifest').write_text(json.dumps(pwa,ensure_ascii=False,separators=(',',':')))
html=(SOURCE/'intro-cutscene/index.html').read_text()
html=html.replace('<script src="../chapter1/story/script.js"></script>\n<script src="../shared/cutfx.js"></script>','<script src="../shared/common.min.js"></script>')
html=html.replace('  img.src = s.img; img.alt = "";','  img.src = s.rig ? `../chapter1/assets/cut/${s.rig}.webp` : s.img; img.alt = "";')
html=html.replace('scenes/05-king.png','scenes/05-king.webp')
html=html.replace('  if (s.rig) img.src = `../chapter1/assets/cut/${s.rig}.webp`;','')
html=html.replace('<div id="skip">ESC: SKIP</div>','<button id="skip" type="button" aria-label="인트로 건너뛰기">SKIP ›</button>')
html=html.replace('<div id="press">PRESS START</div>','<button id="press" type="button">PRESS START</button>')
html=html.replace('</style>','#skip,#press{font:inherit;color:inherit;background:transparent;border:0;cursor:pointer}#skip{padding:12px;z-index:50;pointer-events:auto}#press{font-family:"Press Start 2P",monospace}#press:focus-visible,#skip:focus-visible{outline:2px solid #ffd23a}</style>')
html=html.replace('let titleAt = 0;','let titleAt = 0, navigating = false;\n$("skip").addEventListener("pointerdown", e => { e.stopPropagation(); skipAll(); });\n$("skip").addEventListener("click", e => { e.stopPropagation(); if (!ended) skipAll(); });')
old='if (ended) { if (titleAt && performance.now() - titleAt > 1400) location.href = "../chapter1/index.html"; return; }'
new='if (ended) { if (!navigating && titleAt && performance.now() - titleAt > 1400) { navigating = true; screen.style.transition = "opacity .25s ease"; screen.style.opacity = "0"; const url = new URL("../chapter1/index.html", location.href); url.searchParams.set("from", "intro"); if(new URLSearchParams(location.search).has("touch"))url.searchParams.set("touch", ""); setTimeout(() => location.assign(url.href),250); } return; }'
assert old in html;html=html.replace(old,new)
html=html.replace('<title>','<link rel="manifest" href="../chapter1/manifest.webmanifest"><link rel="icon" href="../chapter1/assets/sprites/hud_face_0.webp"><title>')
html=re.sub(r'<script>([\s\S]*?)</script>',lambda m:'<script>'+minify(m.group(1))+'</script>',html)
(OUT/'intro-cutscene/index.html').write_text(html)
(OUT/'index.html').write_text('''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>내 쿠션 내놔!</title><meta name="description" content="내 쿠션을 되찾는 고양이의 코믹 모험. PC와 모바일에서 즐기는 Chapter 1."><meta http-equiv="refresh" content="0;url=intro-cutscene/"><script>location.replace(new URL('intro-cutscene/'+location.search+location.hash,location.href))</script><body style="background:#05060f;color:#fff;font-family:system-ui"><a href="intro-cutscene/" style="color:inherit">내 쿠션 내놔! 시작하기</a></body></html>''')
(OUT/'.nojekyll').touch()
files=[p for p in OUT.rglob('*') if p.is_file()]
report={'files':len(files),'bytes':sum(p.stat().st_size for p in files),'spriteBytesBefore':sum(a for a,b in sizes),'spriteBytesAfter':sum(b for a,b in sizes),'mobileControls':True,'esbuild':'0.28.2','assets':{str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(ROOT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='assets'},indent=2))
