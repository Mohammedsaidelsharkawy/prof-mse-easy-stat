# Prof MSE Easy Stat

An offline web app that turns an Excel mastersheet into a formatted Word statistical report: methods paragraph, CONSORT flowchart, results tables, auto-written comments and figures.

## Using it

1. Download `Prof_MSE_Easy_Stat.html` and open it in a modern browser (Chrome, Edge, Firefox). No installation or internet connection is needed.
2. Follow the 5-step wizard:
   1. **Upload** the Excel file and enter the study title.
   2. **Variables**: confirm the auto-detected group variable, outcomes and baseline characteristics.
   3. **Options**: set timepoints and analysis options.
   4. **CONSORT**: enter the enrolment numbers. The flowchart previews live.
   5. **Report**: preview the report, then download the Word document.

`Sample report.docx` is example output generated from simulated data.

## Statistics

- Normality: Shapiro–Wilk
- Between groups: independent t-test, Mann–Whitney U, one-way ANOVA, Kruskal–Wallis, Chi-square, Fisher's exact
- Within subjects: repeated-measures ANOVA and Friedman test, with post-hoc comparisons
- Effect sizes and 95% confidence intervals

The engine's output (1,808 test values) was checked against R 4.6.1.

## Development

| Path | Contents |
|---|---|
| `src/stats.js` | Statistical test engine |
| `src/analysis.js` | Tables, auto-written comments, figure specifications |
| `src/charts.js` | Canvas charts and CONSORT flowchart |
| `src/report.js` | Word export (docx.js) |
| `src/app.js`, `src/index.html` | Wizard UI |
| `src/lib/` | jStat, SheetJS, docx 8.5.0 |
| `src/logo.png` | Branding |

After editing anything in `src/`, rebuild the single-file app:

```
python src/build.py
```

This writes `Prof_MSE_Easy_Stat.html` at the repository root.
