# Prof MSE Easy Stat

An offline web app that turns an Excel mastersheet into a formatted Word statistical report: methods paragraph, CONSORT flowchart, results tables, auto-written comments and figures.

## Using it

1. Download `Prof_MSE_Easy_Stat.html` and open it in a modern browser (Chrome, Edge, Firefox). No installation or internet connection is needed.
2. Follow the 10-step wizard:
   1. **Upload** the Excel file (or open an example) and enter the study title. The software statement, the first sentence of the Statistical Analysis section, can be picked from templates (IBM SPSS Statistics — the default, Prof MSE Easy Stat, R, Stata, GraphPad Prism, SAS, MedCalc, JASP, jamovi, Python, Minitab, Epi Info, Excel).
      The data preview has rows per page with paging, search, a filter for rows with missing values, highlighted missing cells, a column summary (type, range, missing), sorting by any column, row density (compact / normal / comfortable), a column chooser (show all, numeric or text columns), column-type badges with right-aligned numbers, wrapped text, a frozen first column and striped rows. **✎ Edit sheet** lets you change cells, rename, move or delete columns, add columns and rows, move or delete rows, undo, re-detect the variables, and download the edited sheet as Excel; the variable setup follows the edits.
   2. **Variables**: confirm the group variable, outcomes and baseline characteristics; create, edit or ungroup repeated measures.
   3. **Timepoints**: each repeated outcome has its own timepoints — tick which enter, rename them and set their order per outcome.
   4. **Tests**: significance level, normality test, effect estimates, post hoc and optional tests.
   5. **Tables**: number formats, second row (range / 95% CI / IQR / none), P value decimals, heading and mark, test-statistic column, missing-data note, the tests used named in the footnote (listed, or as letters after each P value: 0.013ᵃ), a Total column, group sizes in the headings, bold significant P values, each table on a new page, P values with or without the leading zero (.013), table style, font, page orientation, caption style.
   6. **Comments**: concise, detailed or descriptive (every group's values, the test with its statistic, the effect size and a closing overview of each table), P value wording, placement (after / before the table / none), effect sizes, summary of key findings.
   7. **Figures**: chart types per variable with live preview, colours, legend, error bars, bar width, mean markers, chart font, placement and captions. Captions explain the symbols: what *, ** and *** mean, what the bars, error bars, boxes, whiskers and markers show.
   8. **Advanced analyses**: regression, ROC, survival, agreement and more, each with its own title, patients (all / each group / one group), variable selection (enter / backward / forward), VIF, Hosmer-Lemeshow, classification table, the constant, and for ROC curves: the cut-off method (Youden, closest to the corner, sensitivity or specificity ≥ 80/90/95%, or your own value), the positive direction, 95% CIs of sensitivity and specificity or of every measure (PPV, NPV, accuracy, likelihood ratios), likelihood ratios, the Youden index, the cut-off marked on the curve, a DeLong comparison of the AUCs and a combined logistic model of all tests; the ROC figure can show all curves together or one figure per test, the AUC with its CI in the legend, thin or bold lines, a shaded area under the curve, and no diagonal.
   9. **Flowchart**: CONSORT 2010, STROBE, STARD 2015 or a simple custom flowchart, with its own appearance: colour theme (classic, tinted, filled, black and white), chart palette or a custom colour, square or rounded corners, line weight, text size, font, shadows, and section labels with their own colour, text colour and wording (e.g. “Screening” instead of “Enrollment”). "Assessed for eligibility" is calculated as excluded + the groups (STARD: excluded + received the index test).
   10. **Report**: choose the format — **Thesis** (full results chapter, comments after each table, each table on a new page, optional chapter numbering such as Table 4.1 and subheadings), **Journal paper** (concise statistical analysis, one Results text that cites tables and figures, compact three-line tables, figures of significant results up to a limit — or all figures, optionally also non-significant ones — an abstract-ready results paragraph and word counts) or **As configured** — the first table and figure numbers (to continue from an earlier chapter), and a journal style (Vancouver / ICMJE, APA 7th, AMA 11th, NEJM or The Lancet: P value format, italic P, mean (SD) or ± SD, caption layout, the Lancet's mid-line decimal point) — then preview, edit titles, captions and text, choose what goes into the Word file, and download it. The format changes only the report, never the settings of steps 4–9.

**Presets** (bar above steps 4–10): apply ready-made settings in one click — Thesis classic, Thesis fully descriptive, Journal medical (Vancouver), Journal APA 7th, Journal AMA / JAMA, Black and white print, Presentation, Tables only, Comprehensive analysis, or back to the defaults. **＋ Save current as preset** keeps your own settings (options, flowchart appearance and report format) in this browser; export them to a file and import them on another computer.

`Sample report.docx` is example output generated from simulated data.

## Example datasets

Step 1 offers nine simulated studies. **Open example** loads one, with suggested analyses already set up, and **⬇ Excel file** downloads it so you can see the expected sheet layout. The same files are in `examples/`:

| File | Study | Shows |
|---|---|---|
| `knee-oa-rct.xlsx` | Two-group RCT, 60 patients | t-test / Mann-Whitney, repeated measures, ANCOVA |
| `postop-analgesia-3arm.xlsx` | Three-group RCT, 75 patients | ANOVA / Kruskal-Wallis with post hoc, within-group change, group × time interaction, categorical post hoc, logistic regression |
| `sepsis-biomarkers.xlsx` | Diagnostic study, 90 patients | skewed lab markers, ROC curves, logistic regression |
| `oncology-survival.xlsx` | Two-arm survival study, 90 patients | Kaplan-Meier curves, log-rank test |
| `dose-response-4arm.xlsx` | Four-group pilot, 48 patients | small non-normal samples, Dunn's post hoc, simple flowchart |
| `vitd-diabetes-cross-sectional.xlsx` | Cross-sectional, 100 patients | correlation, linear regression, Cronbach's alpha, STROBE |
| `preeclampsia-case-control.xlsx` | Case-control, 110 women | odds ratios, logistic regression, ROC, STROBE |
| `covid-icu-cohort.xlsx` | Cohort, 135 patients | Kaplan-Meier, Cox regression, McNemar, STROBE |
| `lung-ultrasound-stard.xlsx` | Diagnostic accuracy, 120 patients | sensitivity / specificity, ROC, Cohen's kappa, ICC and Bland-Altman, STARD |

Each example also sets up its flowchart (type, exclusion reasons and losses).

Regenerate them with `node tools/make_examples.js` after editing `src/examples.js`.

## Statistics

- Normality: Shapiro–Wilk, or Kolmogorov–Smirnov with Lilliefors correction
- Between groups: independent t-test, Mann–Whitney U, one-way ANOVA (Tukey), Kruskal–Wallis, Chi-square, Fisher's exact
- Optional: Welch's ANOVA with Games-Howell post hoc for unequal variances, Dunn's post hoc after Kruskal–Wallis, pairwise Chi-square / Fisher post hoc (Bonferroni) for categorical variables, group × time interaction by mixed (split-plot) ANOVA
- Within subjects: paired t-test and Wilcoxon signed-rank (two timepoints); repeated-measures ANOVA (Greenhouse–Geisser) and Friedman test (three or more), with Bonferroni-adjusted post hoc comparisons against the first timepoint
- Correlation (optional): Pearson or Spearman between numeric variables, with scatter plots of significant pairs
- Effect sizes and 95% confidence intervals
- Advanced (optional): multiple linear regression (B, β, 95% CI, R²), binary logistic regression (univariable and multivariable OR, Nagelkerke R²), ROC curves (AUC with DeLong 95% CI, Youden cut-off, sensitivity, specificity, PPV, NPV), ANCOVA (adjusted means and Bonferroni pairwise comparisons), Kaplan-Meier survival with the log-rank test, Cox regression (hazard ratios), McNemar / McNemar-Bowker for paired categorical data, Cohen's kappa, ICC with Bland-Altman analysis, diagnostic accuracy from a 2×2 table (sensitivity, specificity, PPV, NPV, likelihood ratios, exact CIs), Cronbach's alpha
- Binary variables: relative risk or odds ratio

The original engine's output (1,808 test values) was checked against R 4.6.1. The paired, Wilcoxon signed-rank and correlation tests were checked against SciPy 1.18 on 300 random datasets. Linear and logistic regression were checked against statsmodels 0.15, and ROC results against scikit-learn 1.9, on 200 random datasets. Welch's ANOVA, Games-Howell, mixed ANOVA and ANCOVA were checked against pingouin 0.7, Dunn's test against scikit-posthocs, pairwise Chi-square against SciPy, and Kaplan-Meier / log-rank against lifelines 0.30, on 120 random datasets. Median survival follows SPSS: the first time survival falls to 50% or below. Lilliefors, McNemar(-Bowker), Cohen's kappa, odds ratios and Clopper-Pearson CIs were checked against statsmodels, ICC and Cronbach's alpha against pingouin, and Cox regression (Efron ties) against lifelines, on 150 random datasets. The ROC cut-offs by sensitivity / specificity target, the DeLong comparison of two AUCs and the Clopper-Pearson CIs were checked against scikit-learn, statsmodels and a reference DeLong implementation on 200 random datasets.

## Report options

- Comment style: concise, or detailed (quotes group values and every P value); optional "not significantly" wording
- Word tables: grid or three-line academic (APA) style; choice of body font; optional Prof MSE branding in the header (off by default)
- Chart appearance: text size, shape (wide, 4:3, square), bar fill (gradient, solid, outline, hatched), gridlines, axis arrows, legend position, y axis from zero or fitted, group sizes on axes, high-resolution images, custom colours
- Figures: all, significant results only, or none; error bars as SD, SEM or 95% CI; size and one or two per row in Word; value labels on bars; significance brackets and stars; optional individual data points on box plots
- Figures by variable: choose each variable's chart (bar, box, dot plot with every patient, line, histogram, 100% stacked bar, donut, or none) and caption, with a live preview in step 3
- Figure placement: after each table, all at the end, or at the end grouped by chart type; caption style "Figure 1:", "Figure 1." or "Fig. 1."; optional title on each chart; captions editable in step 5
- Legend: bottom, top, right, inside the plot or hidden; text size, title and frame
- Repeated measures: create a repeated measure from any numeric columns, edit its columns, timepoint labels and order, or ungroup it into single variables; choose the timepoints per outcome, include/exclude and reorder timepoints globally, or analyse an outcome's timepoints as separate variables
- Export: tick which sections, tables and figures go into the Word file (numbering follows); the choice is saved with the setup
- Light and dark theme for the app

## Development

| Path | Contents |
|---|---|
| `src/stats.js` | Statistical test engine |
| `src/analysis.js` | Tables, auto-written comments, figure specifications |
| `src/charts.js` | Canvas charts and CONSORT flowchart |
| `src/report.js` | Word export (docx.js) |
| `src/app.js`, `src/index.html` | Wizard UI |
| `src/examples.js` | Built-in example datasets (seeded simulation) |
| `src/lib/` | jStat, SheetJS, docx 8.5.0 |
| `src/logo.png` | Branding |

After editing anything in `src/`, rebuild the single-file app:

```
python src/build.py
```

This writes `Prof_MSE_Easy_Stat.html` at the repository root.
