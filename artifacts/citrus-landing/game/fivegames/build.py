#!/usr/bin/env python3
"""Assemble the Activate8 game library into one self-contained page.

dist/activate8.html  -> the artifact (no doctype/head; the publisher wraps it)
dist/test.html       -> same page wrapped in a doctype + viewport for local testing
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
ICON_DIR = os.path.join(ROOT, 'node_modules', 'lucide-static', 'icons')
ORDER = ['core.js', 'brands.js', 'games/match.js', 'games/trivia.js', 'games/number.js',
         'games/spin.js', 'games/recall.js', 'library.js']

def read(p):
    with open(os.path.join(SRC, p), encoding='utf-8') as f:
        return f.read()

js_parts = [read(p) for p in ORDER]
css = read('styles.css')
all_src = '\n'.join(js_parts) + css

# Collect every quoted token that names a real icon file.
names = set(re.findall(r"""['"]([a-z0-9]+(?:-[a-z0-9]+)*)['"]""", all_src))
icons = {}
for n in sorted(names):
    path = os.path.join(ICON_DIR, n + '.svg')
    if os.path.exists(path):
        svg = open(path, encoding='utf-8').read()
        inner = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1)
        inner = re.sub(r'\s+', ' ', inner).replace('> <', '><').strip()
        icons[n] = inner

icons_js = 'const ICONS = ' + json.dumps(icons, separators=(',', ':')) + ';\n'
script = "(function () {\n'use strict';\n" + icons_js + '\n'.join(js_parts) + "\n})();\n"

page = f"""<title>Activate8 Game Library</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
{css}
</style>
<div id="app"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
<script>
{script}</script>
"""

os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
with open(os.path.join(ROOT, 'dist', 'activate8.html'), 'w', encoding='utf-8') as f:
    f.write(page)

test = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}body{margin:0;font:14px system-ui;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
""" + page + "</body></html>\n"
with open(os.path.join(ROOT, 'dist', 'test.html'), 'w', encoding='utf-8') as f:
    f.write(test)

print(f"icons: {len(icons)}  page: {len(page)/1024:.1f} KB")
