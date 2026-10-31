"""Bundles src/ into one offline HTML file: Prof_MSE_Easy_Stat.html"""
import base64, pathlib

src = pathlib.Path(__file__).parent
out = src.parent / 'Prof_MSE_Easy_Stat.html'

def js(name):
    return (src / name).read_text(encoding='utf-8').replace('</script', '<\\/script')

libs = '\n'.join(js('lib/' + n) for n in ['jstat.min.js', 'xlsx.full.min.js', 'docx.umd.js'])
app = '\n'.join(js(n) for n in ['boot.js', 'stats.js', 'analysis.js', 'charts.js', 'arabic.js', 'report.js', 'examples.js', 'sav.js', 'app.js', 'ux.js'])
logo = 'data:image/png;base64,' + base64.b64encode((src / 'logo.png').read_bytes()).decode()

html = (src / 'index.html').read_text(encoding='utf-8')
html = html.replace('/*__LIBS__*/', libs).replace('/*__APP__*/', app).replace('__LOGO__', logo)
out.write_text(html, encoding='utf-8')
print(out, round(out.stat().st_size / 1e6, 2), 'MB')
