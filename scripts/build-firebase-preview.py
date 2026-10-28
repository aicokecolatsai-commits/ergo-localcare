"""建立只供 Firebase Hosting 測試通道使用的靜態檔案。"""
import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path, help='預覽建置資料夾')
args = parser.parse_args()
base = args.output.resolve()
if base == ROOT or ROOT in base.parents:
    raise SystemExit('請使用專案外的建置資料夾，避免覆蓋原始檔。')
if base.exists():
    raise SystemExit('建置資料夾已存在；請指定新的空路徑，避免殘留舊檔。')
public = base / 'public'
public.mkdir(parents=True)
for name in ('assets', 'css', 'js'):
    shutil.copytree(ROOT / name, public / name, dirs_exist_ok=True)
for name in ('index.html', 'admin.html', 'dashboard.html', 'manifest.json'):
    shutil.copy2(ROOT / name, public / name)
injection = '''<script>window.ERGO_FIREBASE_PREVIEW = true;</script>
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/8.10.1/firebase-firestore.js"></script>
<script src="/__/firebase/init.js"></script>
<script src="js/firebase-preview.js"></script>
'''
for name in ('index.html', 'admin.html', 'dashboard.html'):
    path = public / name
    html = path.read_text(encoding='utf-8')
    marker = '<script src="js/config.js'
    if html.count(marker) != 1:
        raise SystemExit(f'{name} 缺少唯一的 config.js 標記')
    html = html.replace(marker, injection + marker, 1)
    html, count = re.subn(r'(<body\b[^>]*>)', r'\1\n<div style="background:#fff4d6;color:#493500;text-align:center;padding:10px;font-weight:700;position:relative;z-index:60">測試預覽版：請勿輸入真實個人或健康資料</div>', html, count=1)
    if count != 1:
        raise SystemExit(f'{name} 缺少 body 標記')
    path.write_text(html, encoding='utf-8')
config = {'hosting': {'site': 'ergo-localcare-20261028', 'public': 'public', 'ignore': ['firebase.json', '**/.*'], 'headers': [{'source': '**', 'headers': [{'key': 'Cache-Control', 'value': 'no-store'}, {'key': 'X-Robots-Tag', 'value': 'noindex, nofollow'}]}]}}
(base / 'firebase.json').write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
print(f'預覽檔案已建立：{base}')
