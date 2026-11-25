"""Bundles src/ into one offline HTML file: Prof_MSE_Easy_Stat.html"""
import base64, pathlib

src = pathlib.Path(__file__).parent
out = src.parent / 'Prof_MSE_Easy_Stat.html'

def js(name):
    return (src / name).read_text(encoding='utf-8').replace('</script', '<\\/script')

libs = '\n'.join(js('lib/' + n) for n in ['jstat.min.js', 'xlsx.full.min.js', 'docx.umd.js'])
app = '\n'.join(js(n) for n in ['boot.js', 'stats.js', 'analysis.js', 'rocreg.js', 'charts.js', 'arabic.js', 'report.js', 'examples.js', 'sav.js', 'app.js', 'ux.js', 'prep.js', 'tools.js', 'builder.js', 'builder2.js', 'build3.js', 'generator.js', 'gen3.js', 'ux2.js', 'org.js', 'tools2.js', 'work.js', 'round5.js', 'detective.js', 'figfmt.js', 'round6.js', 'easy.js', 'orgx.js', 'rocregui.js', 'round13.js', 'selectcases.js', 'ux15.js', 'genvar.js', 'round16.js', 'gen4.js', 'round19.js', 'round20.js', 'round21.js', 'round22.js', 'round23.js'])
logo = 'data:image/png;base64,' + base64.b64encode((src / 'logo.png').read_bytes()).decode()

html = (src / 'index.html').read_text(encoding='utf-8')
SITE = 'https://mohammedsaidelsharkawy.github.io/prof-mse-easy-stat/'  # where the site is published (GitHub Pages); change it if the address changes
html = html.replace('__SITE__', SITE).replace('/*__LIBS__*/', libs).replace('/*__APP__*/', app).replace('__LOGO__', logo)
out.write_text(html, encoding='utf-8')

# the public site (SEO): a light landing page, robots.txt and sitemap.xml next to the app; the logo as a file for the page and the search results
import datetime, shutil
root = src.parent; (root / 'assets').mkdir(exist_ok=True); shutil.copyfile(src / 'logo.png', root / 'assets' / 'logo.png')
(root / 'index.html').write_text((src / 'site.html').read_text(encoding='utf-8').replace('__SITE__', SITE), encoding='utf-8')
(root / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n', encoding='utf-8')
today = datetime.date.today().isoformat()
(root / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + ''.join(f'  <url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>\n' for p, pr in [('', '1.0'), ('Prof_MSE_Easy_Stat.html', '0.8')]) + '</urlset>\n', encoding='utf-8')
print(root / 'index.html', 'robots.txt', 'sitemap.xml')
print(out, round(out.stat().st_size / 1e6, 2), 'MB')
