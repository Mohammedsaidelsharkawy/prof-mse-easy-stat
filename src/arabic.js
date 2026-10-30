/* Prof MSE Easy Stat — Arabic text of the report, by rules: the sentences this app writes, its statistical terms, headings and footnotes.
   Labels (variables, groups, categories) are protected while the rules run and take their Arabic name when one is given (step 2 ⚙). */
const Ar = (() => {
  const NUM = { two: 'المجموعتين', three: 'المجموعات الثلاث', four: 'المجموعات الأربع', five: 'المجموعات الخمس', six: 'المجموعات الست' };
  // whole-sentence and long-phrase rules first (order matters), then terms, then short words
  const RULES = [
    // ---------- statistical analysis ----------
    // further advanced analyses (methods sentences)
    [/^In the presence of competing events, the cumulative incidence of the event was estimated with the Aalen-Johansen method, and groups were compared with the cause-specific log-rank test\.$/, 'في وجود أحداث متنافسة، قُدّر الحدوث التراكمي للحدث بطريقة Aalen-Johansen، وقورنت المجموعات باختبار log-rank الخاص بالسبب.'],
    [/^Time-dependent discrimination was assessed with the cumulative\/dynamic AUC\(t\) using Uno's inverse-probability-of-censoring weights, with bootstrap 95% CI\.$/, 'قُيّمت القدرة التمييزية المعتمدة على الزمن بالمساحة تحت المنحنى التراكمية/الديناميكية AUC(t) باستخدام أوزان Uno لمقلوب احتمال الرقابة، مع فترات ثقة 95% بطريقة bootstrap.'],
    [/^Quantile regression with robust \(kernel\) standard errors was used to model the median \(and other quantiles\) of skewed outcomes\.$/, 'استُخدم الانحدار الكمّي (quantile regression) مع أخطاء معيارية متينة (kernel) لنمذجة الوسيط (والمئينات الأخرى) للنتائج الملتوية.'],
    [/^Agreement between three or more raters was assessed with Fleiss' kappa\.$/, "قُيّم الاتفاق بين ثلاثة مقيّمين أو أكثر باستخدام معامل كابا لفلايس (Fleiss' kappa)."],
    [/^Within-patient associations of repeatedly measured variables were assessed with repeated-measures correlation\.$/, 'قُيّمت العلاقات داخل المريض الواحد للمتغيرات المقيسة بشكل متكرر باستخدام ارتباط القياسات المتكررة.'],
    [/^Firth's penalized-likelihood logistic regression was used to reduce small-sample bias and to handle separation\.$/, 'استُخدم الانحدار اللوجستي بالأرجحية المعاقَبة لـFirth لتقليل تحيز العينات الصغيرة ومعالجة الانفصال التام.'],
    [/^Missing values were handled by multiple imputation by chained equations \(predictive mean matching\), and estimates were pooled with Rubin's rules\.$/, 'عولجت القيم المفقودة بالإسناد المتعدد بالمعادلات المتسلسلة (مطابقة المتوسط التنبؤي)، وجُمعت التقديرات بقواعد Rubin.'],
    [/^Non-linear effects of continuous predictors were modelled with restricted cubic splines \(knots at Harrell's recommended percentiles\) and tested with Wald tests\.$/, 'نُمذجت التأثيرات غير الخطية للمتنبئات المستمرة بالشرائح التكعيبية المقيدة (العُقد عند المئينات التي أوصى بها Harrell) واختُبرت باختبارات Wald.'],
    [/^A nomogram was constructed from the logistic regression model\.$/, 'أُنشئ مخطط تنبؤي (nomogram) من نموذج الانحدار اللوجستي.'],
    // further advanced analyses (comments)
    [/^With (.+?) as a competing event, the cumulative incidence of (.+?) by the end of follow-up was (.+)\.$/, (m, c, e, r) => `مع اعتبار ${c} حدثًا متنافسًا، بلغ الحدوث التراكمي لـ${e} في نهاية المتابعة ${r}.`],
    [/^The cumulative incidence of (.+?) was (.+)\.$/, 'بلغ الحدوث التراكمي لـ$1 $2.'],
    [/^At ([\d.]+(?: \S+)?), it was (.+)\.$/, 'وعند $1 بلغ $2.'],
    [/^The cause-specific hazard of (.+?) was (significantly|insignificantly) different (.+?) \(log-rank P value (.+?)\)\.$/, (m, e, s2, w, p) => `${s2 === 'significantly' ? 'اختلف' : 'لم يختلف'} الخطر الخاص بالسبب لـ${e} ${s2 === 'significantly' ? 'بدلالة إحصائية' : 'بدلالة إحصائية'} ${w} (قيمة P لاختبار log-rank ${p}).`],
    [/^The time-dependent AUC of (.+?) for (.+?) was (.+)\.$/, 'بلغت المساحة تحت المنحنى المعتمدة على الزمن لـ$1 في التنبؤ بـ$2 $3.'],
    [/^(.+?) had the highest discrimination over follow-up\.$/, 'كان لـ$1 أعلى قدرة تمييزية خلال المتابعة.'],
    [/^None of the studied variables was significantly associated with the (median|(\d+)th percentile) of (.+?)\.$/, (m, q, n, y) => `لم يرتبط أي من المتغيرات المدروسة ارتباطًا ذا دلالة إحصائية ب${q === 'median' ? 'وسيط' : `المئين ${n} لـ`}${q === 'median' ? ' ' : ''}${y}.`],
    [/^At the (median|(\d+)th percentile) of (.+?), (.+?) (?:was|were) significantly associated with it\.$/, (m, q, n, y, l) => `عند ${q === 'median' ? 'الوسيط' : `المئين ${n}`} لـ${y}، ارتبط ${l} به ارتباطًا ذا دلالة إحصائية.`],
    [/^The agreement between the (\d+) raters was (\w+(?: \w+)?) \(Fleiss' κ = (.+?), P value (.+?)\)\.$/, (m, n, g, k, p) => `كان الاتفاق بين المقيّمين الـ${n} ${({ poor: 'ضعيفًا', slight: 'طفيفًا', fair: 'مقبولًا', moderate: 'متوسطًا', substantial: 'كبيرًا', 'almost perfect': 'شبه تام' })[g] || g} (κ لفلايس = ${k}، قيمة P ${p}).`],
    [/^Within patients, (.+?) showed a significant (weak|moderate|strong) (positive|negative) correlation with (.+?) \((.+)\)\.$/, (m, x, st, dir, y, st2) => `داخل المريض الواحد، أظهر ${x} ارتباطًا ${dir === 'positive' ? 'طرديًا' : 'عكسيًا'} ${({ weak: 'ضعيفًا', moderate: 'متوسطًا', strong: 'قويًا' })[st]} ذا دلالة إحصائية مع ${y} (${st2.replace(/, P value/, '، قيمة P').replace(/, 95% CI (\S+) to (\S+)/, '، فترة ثقة 95% من $1 إلى $2')}).`],
    [/^Within patients, there was no significant correlation between (.+?) and (.+?) \(rrm = (.+?), P value (.+?)\)\.$/, 'داخل المريض الواحد، لم يوجد ارتباط ذو دلالة إحصائية بين $1 و$2 (rrm = $3، قيمة P $4).'],
    [/^In Firth logistic regression, (.+?) (?:were significant predictors|was a significant predictor) of (.+?)\.$/, 'في الانحدار اللوجستي لـFirth، كان $1 من العوامل المتنبئة ذات الدلالة الإحصائية بـ$2.'],
    [/^None of the studied variables was a significant predictor of (.+?) in Firth logistic regression\.$/, 'لم يكن أي من المتغيرات المدروسة عامل تنبؤ ذا دلالة إحصائية بـ$1 في الانحدار اللوجستي لـFirth.'],
    [/^After multiple imputation of the missing values \((\d+) of (\d+) patients incomplete\), none of the studied variables was a significant predictor of (.+?)\.$/, 'بعد الإسناد المتعدد للقيم المفقودة ($1 من $2 مريضًا بيانات غير مكتملة)، لم يكن أي من المتغيرات المدروسة عامل تنبؤ ذا دلالة إحصائية بـ$3.'],
    [/^After multiple imputation of the missing values \((\d+) of (\d+) patients incomplete\), (.+?) (?:were significant predictors|was a significant predictor) of (.+?)\.$/, 'بعد الإسناد المتعدد للقيم المفقودة ($1 من $2 مريضًا بيانات غير مكتملة)، كان $3 من العوامل المتنبئة ذات الدلالة الإحصائية بـ$4.'],
    [/^The complete-case analysis used (\d+) patients\.$/, 'شمل تحليل الحالات المكتملة $1 مريضًا.'],
    [/^The association of (.+?) with (.+?) was (significant|insignificant) \(P value (.+?)\) and (significantly non-linear|did not depart significantly from linearity) \(P value (.+?)\)\.$/, (m, x, y, s2, p1, nl, p2) => `كان ارتباط ${x} بـ${y} ${s2 === 'significant' ? 'ذا دلالة إحصائية' : 'غير ذي دلالة إحصائية'} (قيمة P ${p1})، و${nl === 'significantly non-linear' ? 'غير خطي بدلالة إحصائية' : 'لم يحِد عن الخطية بدلالة إحصائية'} (قيمة P ${p2}).`],
    [/^Statistical analysis was performed using (.+?), version ([\d.]+) \((.+?)\)\.$/, 'أُجري التحليل الإحصائي باستخدام برنامج $1، الإصدار $2 ($3).'],
    [/^Statistical analysis was performed using (.+?)\.$/, 'أُجري التحليل الإحصائي باستخدام $1.'],
    [/^(.+?) and histograms were used to evaluate the normality of the distribution of data\.$/, 'استُخدم $1 والمدرجات التكرارية لتقييم طبيعية توزيع البيانات.'],
    [/^The z-scores of skewness and kurtosis \(within ±1\.96\) and histograms were used to evaluate the normality of the distribution of data\.$/, 'استُخدمت الدرجات المعيارية للالتواء والتفلطح (ضمن ±1.96) والمدرجات التكرارية لتقييم طبيعية توزيع البيانات.'],
    [/^Quantitative parametric data were presented as mean and standard deviation \(SD\) and were analyzed by (.+)\.$/, 'عُرضت البيانات الكمية المعلمية على هيئة المتوسط والانحراف المعياري (SD)، وحُللت باستخدام $1.'],
    [/^Quantitative non-parametric data were presented as median and interquartile range \(IQR\) and were analyzed by (.+)\.$/, 'عُرضت البيانات الكمية اللامعلمية على هيئة الوسيط والمدى الربيعي (IQR)، وحُللت باستخدام $1.'],
    [/^Qualitative variables were presented as frequency and percentage \(%\) and were analyzed utilizing (.+)\.$/, 'عُرضت المتغيرات النوعية على هيئة التكرار والنسبة المئوية (%)، وحُللت باستخدام $1.'],
    [/^All patients were analyzed as one group, with normally distributed quantitative data presented as mean and standard deviation \(SD\), non-normally distributed data as median and interquartile range \(IQR\) and qualitative variables as frequency and percentage \(%\)\.$/,
      'حُللت بيانات جميع المرضى كمجموعة واحدة، وعُرضت البيانات الكمية ذات التوزيع الطبيعي على هيئة المتوسط والانحراف المعياري (SD)، وغير الطبيعية على هيئة الوسيط والمدى الربيعي (IQR)، والمتغيرات النوعية على هيئة التكرار والنسبة المئوية (%).'],
    [/^Effect estimates were reported as (.+?) with 95% confidence intervals \(CI\)\.$/, 'عُرضت تقديرات الأثر على هيئة $1 مع فترات ثقة 95% (CI).'],
    [/^A two tailed P value ≤ ([\d.]+) was considered statistically significant\.$/, 'اعتُبرت قيمة P ثنائية الطرف ≤ $1 ذات دلالة إحصائية.'],
    [/^A one tailed P value ≤ ([\d.]+) was considered statistically significant(.*)\.$/, 'اعتُبرت قيمة P أحادية الطرف ≤ $1 ذات دلالة إحصائية$2.'],
    [/^When significant, qualitative variables were compared between each two groups with (Bonferroni|Holm) correction\.$/, 'عند وجود دلالة إحصائية، قورنت المتغيرات النوعية بين كل مجموعتين مع تصحيح $1.'],
    [/^When significant, each measurement was compared with the first one using (.+?) with (Bonferroni|Holm) correction\.$/, 'عند وجود دلالة إحصائية، قورن كل قياس بالقياس الأول باستخدام $1 مع تصحيح $2.'],
    [/^Changes over time within each group were assessed using (.+)\.$/, 'قُيّمت التغيرات عبر الزمن داخل كل مجموعة باستخدام $1.'],
    [/^Changes over time were assessed using (.+)\.$/, 'قُيّمت التغيرات عبر الزمن باستخدام $1.'],
    [/^Correlation between quantitative variables was assessed using Pearson's correlation coefficient \(r\) for normally distributed variables or Spearman's rank correlation coefficient \(rs\) otherwise\.$/,
      'قُيّم الارتباط بين المتغيرات الكمية باستخدام معامل ارتباط بيرسون (r) للمتغيرات ذات التوزيع الطبيعي، أو معامل ارتباط سبيرمان للرتب (rs) فيما عدا ذلك.'],
    [/^Multiple linear regression was used to identify predictors of quantitative outcomes, reporting unstandardized \(B\) and standardized \(β\) coefficients with 95% CI\.$/,
      'استُخدم الانحدار الخطي المتعدد لتحديد عوامل التنبؤ بالنتائج الكمية، مع عرض المعاملات غير المعيارية (B) والمعيارية (β) مع فترات ثقة 95%.'],
    [/^Binary logistic regression was used to identify predictors of binary outcomes, reporting odds ratios \(OR\) with 95% CI; model fit was assessed by the omnibus chi-square test and Nagelkerke R²\.$/,
      'استُخدم الانحدار اللوجستي الثنائي لتحديد عوامل التنبؤ بالنتائج الثنائية، مع عرض نسب الأرجحية (OR) وفترات ثقة 95%؛ وقُيّمت ملاءمة النموذج باختبار مربع كاي الشامل ومعامل Nagelkerke R².'],
    [/^Cox proportional hazards regression was used to identify predictors of time to event, reporting hazard ratios \(HR\) with 95% CI\.$/, 'استُخدم انحدار كوكس للمخاطر النسبية لتحديد عوامل التنبؤ بزمن حدوث الحدث، مع عرض نسب المخاطر (HR) وفترات ثقة 95%.'],
    [/^Survival was estimated by the Kaplan-Meier method and compared between groups using the log-rank test\.$/, 'قُدّر البقاء بطريقة كابلان-ماير، وقورن بين المجموعات باستخدام اختبار log-rank.'],
    [/^Analysis of covariance \(ANCOVA\) was used to compare groups after adjustment for covariates, reporting adjusted \(estimated marginal\) means with 95% CI and Bonferroni-adjusted pairwise comparisons\.$/,
      'استُخدم تحليل التغاير (ANCOVA) لمقارنة المجموعات بعد الضبط للمتغيرات المصاحبة، مع عرض المتوسطات المعدلة وفترات ثقة 95% والمقارنات الثنائية بتصحيح بونفيروني.'],
    [/^Receiver operating characteristic \(ROC\) curve analysis was used to assess diagnostic performance; the area under the curve \(AUC\) was reported with its 95% CI \(DeLong method\), and the optimal cut-off was chosen by (.+)\.$/,
      'استُخدم تحليل منحنى خصائص التشغيل للمستقبِل (ROC) لتقييم الأداء التشخيصي، وعُرضت المساحة تحت المنحنى (AUC) مع فترة ثقة 95% (طريقة DeLong)، واختيرت نقطة القطع المثلى وفق $1.'],
    [/^Diagnostic accuracy was expressed as sensitivity, specificity, positive and negative predictive values, likelihood ratios and accuracy, with exact \(Clopper-Pearson\) 95% CI\.$/,
      'عُبّر عن الدقة التشخيصية بالحساسية والنوعية والقيمتين التنبؤيتين الإيجابية والسلبية ونسب الأرجحية والدقة، مع فترات ثقة 95% الدقيقة (Clopper-Pearson).'],
    [/^Agreement between qualitative ratings was assessed using Cohen's kappa \(κ\) coefficient\.$/, 'قُيّم الاتفاق بين التقييمات النوعية باستخدام معامل كابا لكوهين (κ).'],
    [/^Agreement between quantitative measurements was assessed using the intraclass correlation coefficient \(ICC; two-way random effects, absolute agreement\) and Bland-Altman analysis with 95% limits of agreement\.$/,
      'قُيّم الاتفاق بين القياسات الكمية باستخدام معامل الارتباط داخل الفئة (ICC؛ تأثيرات عشوائية ثنائية الاتجاه، اتفاق مطلق) وتحليل بلاند-ألتمان مع حدود الاتفاق 95%.'],
    [/^Internal consistency was assessed using Cronbach's alpha \(α\) coefficient\.$/, 'قُيّم الاتساق الداخلي باستخدام معامل ألفا كرونباخ (α).'],
    [/^Changes in qualitative variables between two measurements were assessed using the McNemar test \(exact binomial when discordant pairs were fewer than 25\) or the McNemar-Bowker test for more than two categories\.$/,
      'قُيّمت التغيرات في المتغيرات النوعية بين قياسين باستخدام اختبار ماكنمار (الثنائي الدقيق عندما تقل الأزواج المتباينة عن 25) أو اختبار ماكنمار-بوكر لأكثر من فئتين.'],
    [/^As recommended by the CONSORT statement, baseline characteristics were described without significance tests\.$/, 'وفقًا لتوصيات CONSORT، وُصفت الخصائص الأساسية دون اختبارات دلالة إحصائية.'],
    [/^Confidence intervals are (\d+)%\.$/, 'فترات الثقة $1%.'],
    // ---------- flowchart text ----------
    [/^In this study, (\d+) patients were assessed for eligibility; (\d+) patients were excluded \((.+)\)\.$/, 'في هذه الدراسة، قُيّم $1 مريضًا من حيث الأهلية، واستُبعد $2 مريضًا ($3).'],
    [/^In this study, (\d+) patients were assessed for eligibility\.$/, 'في هذه الدراسة، قُيّم $1 مريضًا من حيث الأهلية.'],
    [/^In this study, (\d+) (?:individuals|participants) were potentially eligible; (\d+) were excluded \((.+?)\)\./, 'في هذه الدراسة، كان $1 مشاركًا مؤهلين مبدئيًا، واستُبعد $2 ($3).'],
    [/^The remaining (\d+) patients were randomly allocated into two groups \((.+)\)\.$/, 'ووُزّع المرضى المتبقون ($1 مريضًا) عشوائيًا على مجموعتين ($2).'],
    [/^The remaining (\d+) patients were randomly allocated into (three|four|five|six) equal groups \((\d+) patients in each\)\.$/, (m, n, k, e) => `ووُزّع المرضى المتبقون (${n} مريضًا) عشوائيًا على ${{ three: 'ثلاث', four: 'أربع', five: 'خمس', six: 'ست' }[k]} مجموعات متساوية (${e} مريضًا في كل منها).`],
    [/^The remaining (\d+) patients were randomly allocated into (three|four|five|six) groups \((.+)\)\.$/, (m, n, k, e) => `ووُزّع المرضى المتبقون (${n} مريضًا) عشوائيًا على ${{ three: 'ثلاث', four: 'أربع', five: 'خمس', six: 'ست' }[k]} مجموعات (${e}).`],
    [/^The remaining (\d+) participants were included(?:: (.+))?\.$/, (m, a, b) => `وأُدرج المشاركون المتبقون (${a})${b ? `: ${b}` : ''}.`],
    [/^All allocated patients were followed up and analyzed statistically\.$/, 'تمت متابعة جميع المرضى الموزعين وحُللت بياناتهم إحصائيًا.'],
    [/^All included participants were analyzed\.$/, 'حُللت بيانات جميع المشاركين المدرجين.'],
    [/^In (.+?), (\d+) patients? (?:was|were) lost to follow-up \((.+)\)\.$/, 'في $1، فُقد $2 مريض أثناء المتابعة ($3).'],
    [/^In (.+?), (\d+) patients? (?:was|were) lost to follow-up\.$/, 'في $1، فُقد $2 مريض أثناء المتابعة.'],
    [/^In (.+?), (\d+) patients? (?:was|were) excluded from analysis \((.+)\)\.$/, 'في $1، استُبعد $2 مريض من التحليل ($3).'],
    [/^In (.+?), (\d+) participants? (?:was|were) lost to follow-up or had missing data \((.+)\)\.$/, 'في $1، فُقد $2 مشارك أثناء المتابعة أو كانت بياناتهم ناقصة ($3).'],
    [/^Finally, (.+) were analyzed statistically\.$/, 'وفي النهاية، حُللت بيانات $1 إحصائيًا.'],
    [/^Finally, (.+) were analyzed\.$/, 'وفي النهاية، حُللت بيانات $1.'],
    // ---------- comments ----------
    [/^In (.+?), the proportion with (.+?) \((.+?)\) changed significantly at (.+?) \((.+?)\)\.$/, (m, g, x, a, t, p) => `${g === 'all patients' ? 'لدى جميع المرضى' : `في ${g}`}، تغيرت نسبة من لديهم ${x} (${a}) بدلالة إحصائية عند ${t} (${p}).`],
    [/^Regarding (.+?), (.+)\.$/, (m, v, rest) => `فيما يتعلق بـ${v}، ` + rest.replace(/(\d+) patients? \(([\d.]+%)\) were ([^,]+?)(?=,| and |$)/g, 'كان $3 لدى $1 مريضًا ($2)').replace(/ and /g, ' و') + '.'],
    [/^(.+?) was found in (\d+) \(([\d.]+%)\) of the studied patients\.$/, 'وُجد $1 لدى $2 ($3) من المرضى المدروسين.'],
    [/^The mean ± SD (.+?) of the studied patients was (.+?) \(range (.+?) to (.+?)\)\.$/, 'كان المتوسط ± الانحراف المعياري لـ$1 لدى المرضى المدروسين $2 (المدى $3 إلى $4).'],
    [/^The median (.+?) of the studied patients was (.+?) \(IQR (.+?) to (.+?); range (.+?) to (.+?)\)\.$/, 'كان الوسيط لـ$1 لدى المرضى المدروسين $2 (المدى الربيعي $3 إلى $4؛ المدى $5 إلى $6).'],
    [/^Within each group, (.+?) (decreased|increased) significantly over time in (.+?) \((.+?)\), while it did not change significantly over time in (.+?) \((.+?)\)\.$/, (m, v, d, a, p, b, q) => `داخل كل مجموعة، ${d === 'decreased' ? 'انخفض' : 'ارتفع'} ${v} بدلالة إحصائية عبر الزمن في ${a} (${p})، بينما لم يتغير بدلالة إحصائية في ${b} (${q}).`],
    [/^Within each group, (.+?) did not change significantly over time in (.+?) \((.+?)\), while it (decreased|increased) significantly over time in (.+?) \((.+?)\)\.$/, (m, v, a, p, d, b, q) => `داخل كل مجموعة، لم يتغير ${v} بدلالة إحصائية عبر الزمن في ${a} (${p})، بينما ${d === 'decreased' ? 'انخفض' : 'ارتفع'} بدلالة إحصائية في ${b} (${q}).`],
    [/^Within each group, (.+?) (decreased|increased|did not change) significantly over time in (.+?) \((.+?)\)\.$/, (m, v, d, a, p) => `داخل كل مجموعة، ${d === 'decreased' ? 'انخفض' : d === 'increased' ? 'ارتفع' : 'لم يتغير'} ${v} بدلالة إحصائية عبر الزمن في ${a} (${p}).`],
    [/^(.+?) (decreased|increased) significantly from (.+?) at baseline to (.+?) at (.+?) \((.+?)\)\.$/, (m, v, d, a, b, t, p) => `${d === 'decreased' ? 'انخفض' : 'ارتفع'} ${v} بدلالة إحصائية من ${a} عند القياس الأساسي إلى ${b} عند ${t} (${p}).`],
    [/^(.+?) changed significantly over time \((.+?)\); it was (.+?) at baseline and (.+?) at (.+?)\.$/, 'تغير $1 بدلالة إحصائية عبر الزمن ($2)؛ إذ كان $3 عند القياس الأساسي و$4 عند $5.'],
    [/^Compared with baseline, it was significantly (lower|higher) at (.+?) \((.+?)\)\.$/, (m, d, t, p) => `مقارنة بالقياس الأساسي، كان ${d === 'lower' ? 'أقل' : 'أعلى'} بدلالة إحصائية عند ${t} (${p}).`],
    [/^In (.+?), it was significantly (lower|higher) at (.+?) than at (.+?) \((.+?)\)(?:, with no significant difference at (.+?))?\.$/, (m, g, d, t, b, p, nd) => `في ${g}، كان ${d === 'lower' ? 'أقل' : 'أعلى'} بدلالة إحصائية عند ${t} مقارنة بـ${b} (${p})${nd ? `، دون فرق ذي دلالة إحصائية عند ${nd}` : ''}.`],
    [/^The distribution of (.+?) was significantly different (.+)$/, 'اختلف توزيع $1 بدلالة إحصائية $2'],
    [/^Pairwise, it differed significantly between (.+)$/, 'وعند المقارنة الثنائية، اختلف بدلالة إحصائية بين $1'],
    [/^Pairwise comparisons were insignificant after (Bonferroni|Holm) correction\.$/, 'لم تكن المقارنات الثنائية ذات دلالة إحصائية بعد تصحيح $1.'],
    [/^Pairwise comparisons were insignificant\.$/, 'لم تكن المقارنات الثنائية ذات دلالة إحصائية.'],
    [/^The groups were comparable regarding (.+)$/, 'كانت المجموعات متماثلة من حيث $1'],
    [/^Overall, the groups were comparable in all the studied variables\.$/, 'إجمالًا، كانت المجموعات متماثلة في جميع المتغيرات المدروسة.'],
    [/^There was a significant (weak|moderate|strong) (positive|negative) correlation between (.+?) and (.+?) \((.+?)\)\.$/, (m, s, d, a, b, p) => `وُجد ارتباط ${d === 'positive' ? 'موجب' : 'سالب'} ${{ weak: 'ضعيف', moderate: 'متوسط', strong: 'قوي' }[s]} ذو دلالة إحصائية بين ${a} و${b} (${p}).`],
    [/^The remaining correlations were insignificant\.$/, 'ولم تكن بقية الارتباطات ذات دلالة إحصائية.'],
    [/^(.+?) could significantly predict (.+?) with (excellent|good|fair|poor) discrimination \((.+?)\); at a cut-off of (.+?), sensitivity was (.+?) and specificity was (.+?)\.$/,
      (m, x, y, q, p, c, se, sp) => `تمكن ${x} بدلالة إحصائية من التنبؤ بـ${y} بقدرة تمييز ${{ excellent: 'ممتازة', good: 'جيدة', fair: 'مقبولة', poor: 'ضعيفة' }[q]} (${p})؛ وعند نقطة قطع ${c} كانت الحساسية ${se} والنوعية ${sp}.`],
    [/^In multivariable (logistic|linear|Cox) regression, (.+?) (?:were|was) (?:independent|significant) predictors? of (.+)\.$/, (m, t, a, y) => `في تحليل ${t === 'Cox' ? 'انحدار كوكس' : t === 'linear' ? 'الانحدار الخطي' : 'الانحدار اللوجستي'} المتعدد، كانت ${a} عوامل تنبؤ مستقلة بـ${y}.`],
    [/^In (logistic|linear) regression, (.+?) was a significant predictor of (.+)\.$/, (m, t, a, y) => `في تحليل ${t === 'linear' ? 'الانحدار الخطي' : 'الانحدار اللوجستي'}، كان ${a} عامل تنبؤ ذا دلالة إحصائية بـ${y}.`],
    [/^None of the studied variables was a significant (?:independent )?predictor of (.+?) in (logistic|linear) regression\.$/, (m, y, t) => `لم يكن أي من المتغيرات المدروسة عامل تنبؤ ذا دلالة إحصائية بـ${y} في ${t === 'linear' ? 'الانحدار الخطي' : 'الانحدار اللوجستي'}.`],
    [/^In univariable analysis, (.+?) (?:were|was) significantly associated with (.+)\.$/, 'في التحليل أحادي المتغير، ارتبط $1 بدلالة إحصائية بـ$2.'],
    [/^The model was statistically significant \((.+?)\) and explained (.+?) of the variance of (.+?) \((.+?)\)\.$/, 'كان النموذج ذا دلالة إحصائية ($1)، وفسّر $2 من تباين $3 ($4).'],
    [/^The model was (statistically significant|insignificant) \((.+?)\)\.$/, (m, s, p) => `${s === 'insignificant' ? 'لم يكن النموذج ذا دلالة إحصائية' : 'كان النموذج ذا دلالة إحصائية'} (${p}).`],
    [/^Survival was (insignificantly|significantly) different between the two groups \(log-rank P value (.+?)\)\.$/, (m, s, p) => `${s === 'insignificantly' ? 'لم يختلف' : 'اختلف'} البقاء بدلالة إحصائية بين المجموعتين (قيمة P لاختبار log-rank ${p}).`],
    [/^At (\d+(?:\.\d+)?) (months|days|weeks|years), the estimated survival was (.+?) in (.+?) and (.+?) in (.+?)\.$/, (m, t, u, a, g1, b, g2) => `عند ${t} ${{ months: 'شهرًا', days: 'يومًا', weeks: 'أسبوعًا', years: 'سنة' }[u]}، كان البقاء المقدّر ${a} في ${g1} و${b} في ${g2}.`],
    [/^The median time to (.+?) was not reached in any group\.$/, 'لم يُبلغ الزمن الوسيط حتى $1 في أي مجموعة.'],
    [/^The agreement between (.+?) and (.+?) was (almost perfect|substantial|moderate|fair|slight|excellent|good|poor) \((.+?)\)\.$/, (m, a, b, q, p) => `كان الاتفاق بين ${a} و${b} ${{ 'almost perfect': 'شبه تام', substantial: 'كبيرًا', moderate: 'متوسطًا', fair: 'مقبولًا', slight: 'طفيفًا', excellent: 'ممتازًا', good: 'جيدًا', poor: 'ضعيفًا' }[q]} (${p}).`],
    [/^The internal consistency of the (\d+) items was (excellent|good|acceptable|questionable|poor) \((.+?)\)\.$/, (m, n, q, p) => `كان الاتساق الداخلي للبنود الـ${n} ${{ excellent: 'ممتازًا', good: 'جيدًا', acceptable: 'مقبولًا', questionable: 'موضع تساؤل', poor: 'ضعيفًا' }[q]} (${p}).`],
    // the most common comment patterns, kept general
    [/^(.+?) (was|were) (?:insignificantly|not significantly) different (between|among) (.+?)$/, (m, v, w, b, r) => `${v} ${w === 'were' ? 'لم تختلف' : 'لم يختلف'} بدلالة إحصائية ${b} ${r}`],
    [/^(.+?) (?:was|were) significantly different (between|among) (.+?)$/, (m, v, b, r) => `${v} اختلف بدلالة إحصائية ${b} ${r}`]
  ];
  // terms and phrases inside sentences (tests, measures, connectors)
  const TERMS = [
    ['unpaired Student\'s t-test', 'اختبار t لستيودنت للعينات المستقلة'], ['Student\'s t-test', 'اختبار t لستيودنت'], ['Welch\'s t-test', 'اختبار t لويلش'], ['independent t-test', 'اختبار t للعينات المستقلة'],
    ['Levene\'s test indicated unequal variances', 'أشار اختبار ليفين إلى عدم تساوي التباينات'], ['Mann-Whitney U test', 'اختبار مان-ويتني'], ['Mann-Whitney test', 'اختبار مان-ويتني'],
    ['Kruskal-Wallis test', 'اختبار كروسكال-واليس'], ['Dunn\'s post hoc test (Bonferroni-adjusted)', 'اختبار دن البعدي (بتصحيح بونفيروني)'], ['ANOVA (F) test with post hoc test (Tukey)', 'اختبار تحليل التباين ANOVA (F) مع اختبار توكي البعدي'],
    ['one-way ANOVA', 'تحليل التباين الأحادي'], ['Welch\'s ANOVA', 'تحليل التباين لويلش'], ['Games-Howell', 'غيمز-هاول'], ['Chi-square test', 'اختبار مربع كاي'], ['Fisher\'s exact test', 'اختبار فيشر الدقيق'],
    ['Shapiro-Wilk test', 'اختبار شابيرو-ويلك'], ['Kolmogorov-Smirnov test (Lilliefors correction)', 'اختبار كولموغوروف-سميرنوف (بتصحيح ليليفورس)'], ['Kolmogorov-Smirnov test', 'اختبار كولموغوروف-سميرنوف'],
    ['paired t-tests and Wilcoxon signed-rank tests', 'اختبارات t للعينات المزدوجة واختبارات ويلكوكسون للرتب المؤشرة'], ['paired t-tests', 'اختبارات t للعينات المزدوجة'], ['paired t-test', 'اختبار t للعينات المزدوجة'],
    ['Wilcoxon signed-rank test', 'اختبار ويلكوكسون للرتب المؤشرة'], ['repeated-measures ANOVA with Greenhouse-Geisser correction', 'تحليل التباين للقياسات المتكررة بتصحيح غرينهاوس-غيسر'], ['repeated-measures ANOVA', 'تحليل التباين للقياسات المتكررة'],
    ['Friedman test', 'اختبار فريدمان'], ['for parametric data with two measurements', 'للبيانات المعلمية ذات القياسين'], ['for non-parametric data with two measurements', 'للبيانات اللامعلمية ذات القياسين'],
    ['for parametric data', 'للبيانات المعلمية'], ['for non-parametric data', 'للبيانات اللامعلمية'], ['when appropriate', 'حسب الاقتضاء'], ['the Youden index', 'مؤشر يودن'],
    ['mean differences (Tukey-adjusted)', 'فروق المتوسطات (بتصحيح توكي)'], ['mean differences', 'فروق المتوسطات'], ['Hodges-Lehmann median differences', 'فروق الوسيط بطريقة هودجز-ليمان'],
    ['relative risks (RR)', 'المخاطر النسبية (RR)'], ['odds ratios (OR)', 'نسب الأرجحية (OR)'], ['IBM SPSS Statistics', 'IBM SPSS Statistics'],
    ['statistically significant', 'ذو دلالة إحصائية'], ['was significantly lower in', 'كان أقل بدلالة إحصائية في'], ['was significantly higher in', 'كان أعلى بدلالة إحصائية في'],
    ['was significantly smaller in', 'كان أصغر بدلالة إحصائية في'], ['was significantly greater in', 'كان أكبر بدلالة إحصائية في'], ['was insignificantly different', 'لم يختلف بدلالة إحصائية'], ['were insignificantly different', 'لم تختلف بدلالة إحصائية'],
    ['was not significantly different', 'لم يختلف بدلالة إحصائية'], ['were not significantly different', 'لم تختلف بدلالة إحصائية'], ['was significantly different', 'اختلف بدلالة إحصائية'], ['were significantly different', 'اختلفت بدلالة إحصائية'],
    ['was found in', 'وُجد لدى'], ['the studied patients', 'المرضى المدروسين'], ['The mean ± SD', 'كان المتوسط ± الانحراف المعياري لـ'], ['The median', 'كان الوسيط لـ'], ['range', 'المدى'], ['Regarding', 'فيما يتعلق بـ'],
    ['were female', 'من الإناث'], ['were male', 'من الذكور'], ['the estimated survival', 'البقاء المقدّر'], ['The median time to', 'كان الزمن الوسيط حتى'], ['The positive and negative likelihood ratios were', 'كانت نسبتا الأرجحية الإيجابية والسلبية'],
    ['For the detection of', 'للكشف عن'], ['had a sensitivity of', 'كانت حساسيته'], ['and a specificity of', 'ونوعيته'], ['with a positive predictive value of', 'مع قيمة تنبؤية إيجابية'], ['a negative predictive value of', 'وقيمة تنبؤية سلبية'],
    ['and an overall accuracy of', 'ودقة إجمالية'], ['The mean difference was', 'كان فرق المتوسطات'], ['significantly different from zero', 'مختلفًا بدلالة إحصائية عن الصفر'], ['limits of agreement from', 'حدود اتفاق من'],
    ['The flow of the study participants was as follows:', 'كان تدفق المشاركين في الدراسة كما يلي:'], ['then', 'ثم'], ['screened', 'خضعوا للفرز'], ['excluded', 'مستبعدين'], ['randomized into', 'وُزّعوا عشوائيًا على'],
    ['not eligible', 'غير مؤهلين'], ['According to the reference standard,', 'وفقًا للمعيار المرجعي،'], ['participants', 'مشاركًا'], ['received the index test, which was positive in', 'خضعوا لاختبار المؤشر، الذي كان إيجابيًا لدى'],
    ['negative in', 'وسلبيًا لدى'], ['did not receive the reference standard', 'لم يخضعوا للمعيار المرجعي'], ['the proportion with', 'نسبة من لديهم'], ['changed significantly', 'تغيرت بدلالة إحصائية'],
    ['It was', 'وكان'], ['it was', 'وكان'], ['The', ''], ['the', ''], ['not meeting inclusion criteria', 'عدم استيفاء معايير الإدراج'], ['declined to participate', 'رفض المشاركة'], ['withdrew consent', 'سحب الموافقة'], ['Withdrew consent', 'سحب الموافقة'], ['Moved away', 'الانتقال إلى مكان آخر'], ['female', 'إناث'], ['male', 'ذكور'], ['observed agreement', 'الاتفاق الملاحظ'], ['In all patients', 'لدى جميع المرضى'], ['when', 'عندما'], ['utilizing', 'باستخدام'], ['using', 'باستخدام'], ['significantly lower in', 'كان أقل بدلالة إحصائية في'], ['significantly higher in', 'كان أعلى بدلالة إحصائية في'],
    ['significantly smaller in', 'كان أصغر بدلالة إحصائية في'], ['significantly greater in', 'كان أكبر بدلالة إحصائية في'], ['insignificantly different', 'لم يختلف بدلالة إحصائية'], ['not significantly different', 'لم يختلف بدلالة إحصائية'],
    ['did not differ significantly', 'لم يختلف بدلالة إحصائية'], ['showed no significant difference', 'لم يُظهر فرقًا ذا دلالة إحصائية'], ['being highest in', 'وكان الأعلى في'],
    ['showed a non-significant trend towards a difference', 'أظهر اتجاهًا غير دال إحصائيًا نحو الاختلاف'], ['After adjustment for', 'بعد الضبط لـ'], ['significantly different', 'مختلف بدلالة إحصائية'],
    ['The adjusted mean was lower in', 'كان المتوسط المعدل أقل في'], ['The adjusted mean was higher in', 'كان المتوسط المعدل أعلى في'], ['The mean difference in', 'كان فرق المتوسطات في'], ['The median difference in', 'كان فرق الوسيط في'],
    ['between the two groups', 'بين المجموعتين'], ['among the three groups', 'بين المجموعات الثلاث'], ['among the four groups', 'بين المجموعات الأربع'], ['among the five groups', 'بين المجموعات الخمس'], ['among the six groups', 'بين المجموعات الست'],
    ['two groups', 'مجموعتين'], ['three equal groups', 'ثلاث مجموعات متساوية'], ['four equal groups', 'أربع مجموعات متساوية'], ['three groups', 'ثلاث مجموعات'], ['four groups', 'أربع مجموعات'],
    ['at all measurements', 'في جميع القياسات'], ['of the studied patients', 'لدى المرضى المدروسين'], ['of the studied groups', 'في المجموعات المدروسة'],
    ['P value', 'قيمة P'], ['respectively', 'على الترتيب'], ['in each', 'لكل منها'], ['patients in', 'مريضًا في'], ['participants in', 'مشاركًا في'], ['patients', 'مريضًا'], ['participants', 'مشاركًا'],
    ['by', 'بمقدار'], ['than', 'مقارنة بـ'], ['vs', 'مقابل'], ['was', 'كان'], ['were', 'كانت'], ['at', 'عند'], ['in', 'في'], ['between', 'بين'], ['among', 'بين'], ['with', 'مع'], ['and', 'و'], ['or', 'أو'], ['to', 'إلى'], ['from', 'من'],
    ['the target condition', 'الحالة المستهدفة'], ['present', 'موجودة'], ['absent', 'غائبة'], ['months', 'شهرًا'], ['days', 'يومًا'], ['weeks', 'أسبوعًا'], ['years', 'سنة'], ['Yes', 'نعم'], ['No', 'لا'], ['Male', 'ذكر'], ['Female', 'أنثى']
  ];
  // table headings, captions and footnote pieces
  const HEADS = [
    ['P value', 'قيمة P'], ['Mean ± SD', 'المتوسط ± الانحراف المعياري'], ['Mean (SD)', 'المتوسط (الانحراف المعياري)'], ['Median (IQR)', 'الوسيط (المدى الربيعي)'], ['Median [IQR]', 'الوسيط [المدى الربيعي]'], ['Median', 'الوسيط'],
    ['IQR', 'المدى الربيعي'], ['Range', 'المدى'], ['95% CI', 'فترة الثقة 95%'], ['Total', 'الإجمالي'], ['MD (95% CI)', 'فرق المتوسطات (فترة الثقة 95%)'], ['MD/RR (95% CI)', 'فرق المتوسطات/الخطر النسبي (فترة الثقة 95%)'],
    ['RR (95% CI)', 'الخطر النسبي (فترة الثقة 95%)'], ['OR (95% CI)', 'نسبة الأرجحية (فترة الثقة 95%)'], ['MD/OR (95% CI)', 'فرق المتوسطات/نسبة الأرجحية (فترة الثقة 95%)'], ['Post hoc', 'الاختبار البعدي'], ['Test', 'الاختبار'],
    ['Variable', 'المتغير'], ['Coefficient', 'المعامل'], ['n', 'العدد'], ['Missing', 'القيم المفقودة'], ['Timepoint', 'الزمن'], ['Group', 'المجموعة'], ['B (95% CI)', 'B (فترة الثقة 95%)'], ['HR (95% CI)', 'نسبة المخاطر (فترة الثقة 95%)']
  ];
  const FOOT = [
    [/^\*: Significant as P value ≤ ([\d.]+)$/, '*: ذو دلالة إحصائية عند قيمة P ≤ $1'], [/^Data are presented as (.+)$/, m => 'تُعرض البيانات على هيئة ' + m.slice(22).replace(/mean ± SD/g, 'المتوسط ± الانحراف المعياري').replace(/median \(IQR\)/g, 'الوسيط (المدى الربيعي)').replace(/frequency \(%\)/g, 'التكرار (%)').replace(/ and /g, ' و')],
    [/^MD: Mean difference$/, 'MD: فرق المتوسطات'], [/^MD: Median difference$/, 'MD: فرق الوسيط'], [/^MD: Mean or median difference$/, 'MD: فرق المتوسطات أو الوسيط'], [/^RR: Relative risk$/, 'RR: الخطر النسبي'], [/^OR: Odds ratio$/, 'OR: نسبة الأرجحية'],
    [/^CI: Confidence interval$/, 'CI: فترة الثقة'], [/^(M|P|RR|OR)(\d+): (?:Relative risk |Odds ratio |P value )?between (.+) and (.+)$/, '$1$2: بين $3 و$4']
  ];
  const CAPS = [
    [/ of the studied groups/g, ' في المجموعات المدروسة'], [/ of the studied patients/g, ' لدى المرضى المدروسين'], [/^CONSORT flowchart of the enrolled patients/, 'مخطط CONSORT لتدفق المرضى المسجلين'],
    [/^STROBE flow diagram of the study participants/, 'مخطط STROBE لتدفق المشاركين'], [/^Bars show the mean; error bars show ±1 standard deviation \(SD\)\./, 'تمثل الأعمدة المتوسط، وأشرطة الخطأ ±1 انحراف معياري (SD).'],
    [/Boxes show the median and interquartile range \(IQR\); whiskers extend to the most extreme values within 1\.5 × IQR, and points beyond them are outliers\./, 'تمثل الصناديق الوسيط والمدى الربيعي (IQR)، وتمتد الشعيرات إلى أقصى القيم ضمن 1.5 × IQR، والنقاط خارجها قيم متطرفة.'],
    [/\(difference between the groups at that time\)/, '(الفرق بين المجموعات عند ذلك الوقت)'], [/^Demographic and baseline data/, 'البيانات الديموغرافية والأساسية'], [/^Other outcomes/, 'النتائج الأخرى'],
    [/^Correlation between the studied variables in all patients/, 'الارتباط بين المتغيرات المدروسة لدى جميع المرضى'], [/^Logistic regression analysis for prediction of /, 'تحليل الانحدار اللوجستي للتنبؤ بـ'],
    [/^Linear regression analysis for prediction of /, 'تحليل الانحدار الخطي للتنبؤ بـ'], [/^Cox regression analysis for prediction of /, 'تحليل انحدار كوكس للتنبؤ بـ'], [/^Kaplan-Meier curves? of /, 'منحنى كابلان-ماير لـ']
  ];
  const HEADINGS = { 'Statistical Analysis': 'التحليل الإحصائي', 'Statistical analysis': 'التحليل الإحصائي', Results: 'النتائج', 'Summary of key findings': 'ملخص النتائج الرئيسة', Figures: 'الأشكال', Appendix: 'الملحق', References: 'المراجع', Contents: 'المحتويات', 'List of tables': 'قائمة الجداول', 'List of figures': 'قائمة الأشكال' };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  TERMS.sort((a, b) => b[0].length - a[0].length); // the longest phrases first
  // protect labels: the longest first, as private-use placeholders
  function protect(text, labels) {
    const used = [];
    labels.forEach(([en]) => { if (!en || en.length < 2) return; const re = new RegExp(`(?<![\\p{L}])${esc(en)}(?![\\p{L}])`, 'gu'); text = text.replace(re, () => { used.push(en); return `${used.length - 1}`; }); });
    return { text, used };
  }
  const restore = (t, used, map) => t.replace(/(\d+)/g, (m, i) => map.get(used[+i]) || used[+i]);
  const punct = t => t.replace(/, /g, '، ').replace(/; /g, '؛ ').replace(/\? /g, '؟ ');
  function sentence(s, labels, map) {
    let p = protect(s, labels), t = p.text, done = false;
    for (const [re, to] of RULES) if (re.test(t)) { t = t.replace(re, to); done = true; break; }
    // a fixed sentence can hold words that are also labels (e.g. "group"): try the rules on the plain text too
    if (!done) for (const [re, to] of RULES) if (re.test(s)) { p = { text: s, used: [] }; t = s.replace(re, to); done = true; break; }
    // terms inside (tests, connectors) — also inside the parts captured by the rules
    TERMS.forEach(([en, ar]) => { t = t.replace(new RegExp(`(?<![\\p{L}\\uE000])${esc(en)}(?![\\p{L}])`, 'gu'), ar); });
    t = t.replace(/ و (?=\S)/g, ' و').replace(/مقارنة بـ (?=\S)/g, 'مقارنة بـ');
    const left = t.replace(/\d+/g, '').replace(/log-rank|Clopper-Pearson|post hoc|bootstrap|kernel|quantile regression|Fleiss' kappa|nomogram|rrm/g, '').replace(/\b[A-Z][A-Za-z0-9²]*\b/g, '').match(/\b[a-z]{3,}\b/g);
    return { text: punct(restore(t, p.used, map)), ok: !left, rule: done };
  }
  // the Arabic of a paragraph: sentence by sentence; untranslated sentences are counted
  function translate(text, labelMap = new Map()) {
    if (!text) return { text: '', bad: 0, total: 0 };
    // abbreviations ending in a full stop do not end a sentence
    const ABBR = /\b(Corp|Inc|Ltd|Co|vs|etc|e\.g|i\.e|approx|No|Fig|Dr|Prof)\./g, src = String(text).replace(ABBR, (m, w) => w + '\uE002');
    const labels = [...labelMap.keys()].sort((a, b) => b.length - a.length).map(k => [k]), parts = src.match(/[^.!?]+(?:\.(?=\d)[^.!?]*)*[.!?]+(?:\s+|$)|[^.!?]+$/g) || [src];
    let bad = 0; const out = parts.map(x => { const r = sentence(x.trim().replace(/\uE002/g, '.'), labels, labelMap); if (!r.ok) bad++; return r.text; });
    return { text: out.join(' '), bad, total: parts.length };
  }
  const head = (t, labelMap = new Map()) => { const h = HEADS.find(([en]) => en === String(t).trim()); if (h) return h[1]; const g = String(t).match(/^(.+) \(n=(\d+)\)$/); if (g) return `${labelMap.get(g[1]) || g[1]} (العدد=${g[2]})`; return labelMap.get(t) || ''; };
  function caption(t, labelMap = new Map()) {
    const labels = [...labelMap.keys()].sort((a, b) => b.length - a.length).map(k => [k]), p = protect(String(t), labels); let x = p.text;
    CAPS.forEach(([re, to]) => { x = x.replace(re, to); });
    return punct(restore(x, p.used, labelMap));
  }
  function footnote(t, labelMap = new Map()) {
    return String(t || '').replace(/\.$/, '').split(/, (?=[*A-Z][A-Za-z0-9]*:|Data are)/).map(part => { const labels = [...labelMap.keys()].sort((a, b) => b.length - a.length).map(k => [k]), p = protect(part, labels);
      let x = p.text; for (const [re, to] of FOOT) if (re.test(x)) { x = x.replace(re, to); break; } return restore(x, p.used, labelMap); }).join('، ') + '.';
  }
  return { translate, head, caption, footnote, heading: t => HEADINGS[t] || '', NUM };
})();
if (typeof module !== 'undefined') module.exports = Ar;
