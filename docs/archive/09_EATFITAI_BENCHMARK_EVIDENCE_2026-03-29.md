# EATFITAI BENCHMARK EVIDENCE PACK

Ngay cap nhat: 2026-03-29  
Muc dich: phu luc benchmark va evidence de bo tro cho `08_EATFITAI_MODERN_PRODUCT_AUDIT_2026-03-29.md`

---

## 1. Purpose and Method

Tai lieu nay tach rieng phan evidence de:

- gom benchmark ngoai repo vao mot cho de audit chinh khong bi qua dai
- phan biet ro `market positioning` va `evidence-backed implication`
- map moi nhan dinh lon cua audit thanh chuoi ro rang:
  - external benchmark
  - internal EatFitAI evidence
  - gap
  - implication
  - recommendation

Phuong phap:

1. Dung nguon chinh thuc truoc: OpenAI, Android, Material, WHO, FDA.
2. Dung nguon doi thu chinh thuc/support de benchmark capability shape, khong dung nhu bang chung lam sang.
3. Dung PubMed/peer-reviewed de xac dinh muc do quan trong cua self-monitoring, coaching, va image-based logging.
4. Doi chieu voi QA runtime that va tai lieu noi bo trong repo.

---

## 2. Source Map

### 2.1 Official platform / design

| Nguon | Vai tro |
| --- | --- |
| [OpenAI Codex Use Cases](https://developers.openai.com/codex/use-cases) | Benchmark AI-native workflow, reviewability, focused task utility |
| [How OpenAI uses Codex](https://openai.com/business/guides-and-resources/how-openai-uses-codex/) | Benchmark utility in real workflows, velocity, staying in flow |
| [Android app startup time](https://developer.android.com/topic/performance/vitals/launch-time) | Benchmark startup expectations |
| [Android app startup analysis and optimization](https://developer.android.com/topic/performance/appstartup/analysis-optimization) | Benchmark measurement and optimization discipline |
| [Android slow rendering](https://developer.android.com/topic/performance/vitals/render) | Benchmark jank / rendering quality |
| [Material errors](https://m1.material.io/patterns/errors.html) | Benchmark error semantics |
| [Material progress indicators](https://m3.material.io/components/progress-indicators/overview) | Benchmark loading feedback |
| [NNG heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Benchmark usability fundamentals |
| [NNG visibility of system status](https://www.nngroup.com/articles/visibility-system-status/) | Benchmark loading / feedback / trust |

### 2.2 Competitor official / support

| Nguon | Vai tro |
| --- | --- |
| [MyFitnessPal add food to diary](https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-do-I-add-a-food-to-my-food-diary-) | Benchmark low-friction logging entry points |
| [MyFitnessPal barcode scanner](https://support.myfitnesspal.com/hc/en-us/articles/360032624771-How-do-I-use-the-barcode-scanner-to-log-foods-) | Benchmark capture speed and correction loop |
| [MyFitnessPal meal scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ) | Benchmark scan flow with search/edit in the loop |
| [MyFitnessPal meal creation FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360032625331-Meal-Creation-FAQ) | Benchmark remembered meals and custom meal reuse |
| [Cronometer Nutrition Scores](https://support.cronometer.com/hc/en-us/articles/360042110112-Nutrition-Scores) | Benchmark score transparency and nutrition depth |
| [Cronometer score calculation](https://support.cronometer.com/hc/en-us/articles/44414065586836-How-are-Nutrition-Scores-calculated) | Benchmark explainability of scoring |
| [Cronometer Nutrition Report](https://support.cronometer.com/hc/en-us/articles/360018569691-Nutrition-Report) | Benchmark reporting depth |
| [Noom how it works](https://www.noom.com/blog/what-is-noom-how-does-noom-work/) | Benchmark behavior-change framing |
| [Noom progress / weight zone](https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/biometrics/2025/10/how-noom-sets-your-weight-loss-zone-and-tracks-your-progress/) | Benchmark progress explanation |
| [Lose It App Store listing](https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629) | Benchmark practical feature shape: photo logging, AI voice, barcode, streak-like program loops |

### 2.3 Academic / peer-reviewed

| Nguon | Vai tro |
| --- | --- |
| [PubMed 41539436](https://pubmed.ncbi.nlm.nih.gov/41539436/) | Self-monitoring adherence + personalized feedback -> weight loss |
| [PubMed 39962997](https://pubmed.ncbi.nlm.nih.gov/39962997/) | Adherence to self-monitoring and goals -> improved weight loss |
| [PubMed 22536058](https://pubmed.ncbi.nlm.nih.gov/22536058/) | Self-monitoring adherence as mechanism in technology-supported weight loss |
| [PubMed 31353783](https://pubmed.ncbi.nlm.nih.gov/31353783/) | Systematic review/meta-analysis of app-based nutrition interventions |
| [PubMed 34875978](https://pubmed.ncbi.nlm.nih.gov/34875978/) | Systematic review of smartphone-based dietary assessment tools |
| [PubMed 32706724](https://pubmed.ncbi.nlm.nih.gov/32706724/) | Meta-analysis of mobile app interventions for weight loss |
| [PubMed 37071452](https://pubmed.ncbi.nlm.nih.gov/37071452/) | Health coaching + self-monitoring apps |
| [PubMed 40829125](https://pubmed.ncbi.nlm.nih.gov/40829125/) | BCT resources linked with better outcomes |

### 2.4 Governance / trust / health AI

| Nguon | Vai tro |
| --- | --- |
| [WHO ethics and governance of AI for health](https://www.who.int/publications/i/item/9789240029200) | Ethical principles for AI in health |
| [WHO LMM guidance 2024](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models) | Governance for multimodal AI in health |
| [WHO caution on LLMs in health](https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health) | Trust and caution framing |
| [FDA CDS Software guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software) | Explainability / basis of recommendations |
| [FDA CDS Step 6](https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support) | Independent review of recommendation basis |
| [PubMed 39476365](https://pubmed.ncbi.nlm.nih.gov/39476365/) | Explainable AI and trust in healthcare |
| [PubMed 38698888](https://pubmed.ncbi.nlm.nih.gov/38698888/) | Why trustworthy AI in healthcare often fails to translate |

### 2.5 Internal evidence

| Nguon | Vai tro |
| --- | --- |
| `docs/01_ARCHITECTURE_OVERVIEW.md` | System boundaries |
| `docs/02_USERFLOW.md` | Intended flow map |
| `docs/03_AI_FLOW.md` | Intended AI flow map |
| `docs/QA_EATFITAI_FULL_APP_EVALUATION_2026-03-28.md` | Runtime truth |
| `artifacts/qa/2026-03-28/*` | Screenshots and evidence |

---

## 3. AI Product Benchmark

### 3.1 Principle extraction

Tu OpenAI materials, co 5 nguyen tac co the chuyen sang EatFitAI:

1. AI can co workflow cu the, khong nen chi la mot prompt box.
2. AI utility tang khi duoc gan vao task lap lai.
3. Reviewability la yeu to cot loi, dac biet cho workflow co visual output.
4. Integration value quan trong hon "wow moment" don le.
5. Utility ben vung den tu flow support, khong chi tu generation.

### 3.2 Implication for EatFitAI

- `Nutrition Settings + Insights` phu hop nhat voi benchmark nay vi no la workflow support.
- `AI Scan` chi moi dat duoc wow moment mot phan.
- `Voice` hien dang la prompt-like promise nhung chua co completion reliability.

### 3.3 Gap statement

EatFitAI da co AI surfaces, nhung chi mot so surfaces dat tieu chi `workflow-first`. Do do, san pham hien dai ve capability nhung chua hien dai ve orchestration.

---

## 4. Mobile UX and Performance Benchmark

### 4.1 Principle extraction

Tu Android, Material, va NNG:

- startup can duoc theo doi va toi uu, vi launch time co tac dong truc tiep den perceived quality
- loading lau can co progress indicators ro rang
- user can luon biet he thong dang lam gi
- error messages phai constructive, khong mo ho, khong mang tinh debug
- slow rendering va jank lam vo trust, nhat la tren interaction AI

### 4.2 Internal evidence mapping

| Internal evidence | Benchmark implication |
| --- | --- |
| Cold start ~8.2s | Consumer app quality chua dat |
| Voice parse ~11.2s | Qua cham cho mot interaction dang hoi dap |
| Scan/gallery flow co flakiness | User se nghi app "do hieu ung", khong phai cong cu tin cay |
| Save feedback cua mot so flows chua ro | Vi pham visibility of system status |

### 4.3 Product implication

Neu app muon giu AI surfaces, loading va status communication phai tot hon app thuong. Cang "AI", user cang can duoc tram an va feedback.

---

## 5. Nutrition App Benchmark

### 5.1 Benchmark by capability cluster

| Cluster | Benchmark observation | EatFitAI implication |
| --- | --- | --- |
| Capture | Doi thu lon deu toi uu cho barcode, search, remembered meals, quick add | Search reliability la xuong song |
| Review | Scan/photo logging mature deu cho user sua serving va replace food | Scan can review loop ro hon |
| Coach | Noom/Cronometer thanh cong o cho recommendation co context va explainability | Nutrition insights la lane nen dau tu |
| Retain | Streak, progress loops, reports, remembered meals rat quan trong | Achievements alone chua du |
| Trust | Cronometer lam manh o transparency cua scoring | EatFitAI can noi ro ly do cua target va suggestion |

### 5.2 Competitive implication

EatFitAI co the khong can danh bai MFP o database scale. Nhung EatFitAI bat buoc phai:

- khong de manual logging bi hong
- khong de AI scan/voice chay vuot trust loop
- tan dung diem khac biet: target setting + coaching sync that

---

## 6. Digital Health and Adherence Evidence

### 6.1 Core evidence

Tong hop tu systematic reviews va RCT/cohort:

- apps cho nutrition/weight management co tac dung nhung khong lon neu khong giu duoc adherence
- self-monitoring la co che trung tam
- feedback ca nhan hoa lam tang hieu qua cua self-monitoring
- health coaching va behavior change techniques bo sung gia tri
- smartphone dietary tools can completeness, low friction, va correction support

### 6.2 Strongest implications for EatFitAI

1. `Search broken` phai duoc nang len P1 product blocker.
2. `Nutrition Settings + Insights` la hero-flow vi ket hop duoc self-monitoring + feedback.
3. `Voice` khong nen duoc xem la fast lane cho toi khi no thuc su giam ma sat thay vi tang ma sat.
4. `AI Scan` phai duoc danh gia bang kha nang giup nguoi dung log day du va dung, khong chi bang recognizer success.

---

## 7. AI Trust and Health Governance Evidence

### 7.1 Principle extraction

WHO va FDA cho thay 4 principle quan trong co the ap dung du EatFitAI khong phai regulated device:

1. scope task hep va ro
2. recommendation co co so de user xem lai
3. transparency ve assumptions, uncertainty, va input quality
4. governance / post-release monitoring / fallback an toan

### 7.2 EatFitAI implication

- `AI target` de ap dung duoc can noi ro duoc tinh tu dau vao nao.
- `AI scan` can noi ro confidence co nghia gi va user nen lam gi neu confidence thap.
- `Voice` can co messaging rang output co the sai va phai review truoc khi luu.
- `Health positioning` can tranh language nghe nhu diagnosis hoac recommendation lam sang.

### 7.3 Failure mode to avoid

Trong app health-adjacent, that bai xau nhat khong phai la "AI tra loi sai". That bai xau nhat la:

- AI tra loi sai
- user khong biet no sai
- app khong de user review de sua

Day la ly do trust loop quan trong hon them 1 model moi.

---

## 8. Implications for EatFitAI

### 8.1 Product-level findings

1. App co them AI nhanh hon kha nang productization cua no.
2. Hero-flow that la `coaching sync`, khong phai `voice`.
3. Logging reliability quan trong hon them them AI lane moi.
4. Discoverability va completion path cua mot so route AI con thap.
5. Benchmark ngoai repo deu ung ho viec dau tu vao low-friction logging truoc.

### 8.2 System-level findings

1. Boundary va fallback chua du nhat quan tren tat ca AI lanes.
2. Instrumentation chua du de do chat luong AI lane theo cach product can.
3. Co kha nang app dang optimize cho demo breadth hon la repeatable utility.

---

## 9. Recommendation Mapping

| External benchmark | Current EatFitAI evidence | Gap | Why it matters | Concrete improvement |
| --- | --- | --- | --- | --- |
| Self-monitoring adherence lien quan manh den outcome ([41539436](https://pubmed.ncbi.nlm.nih.gov/41539436/), [39962997](https://pubmed.ncbi.nlm.nih.gov/39962997/), [22536058](https://pubmed.ncbi.nlm.nih.gov/22536058/)) | Food Search fail trong QA | Daily logging bi dut | Mat tan suat su dung va mat co hoi tao ket qua | Sua Search truoc tat ca AI lane khac |
| App interventions hieu qua hon khi co feedback/monitoring/coaching ([31353783](https://pubmed.ncbi.nlm.nih.gov/31353783/), [37071452](https://pubmed.ncbi.nlm.nih.gov/37071452/)) | Nutrition Settings + Insights pass va sync that | Hero-flow chua duoc dat o trung tam | Day la cum de giu utility | Day cum nay thanh backbone cua app |
| Smartphone dietary tools can completeness + correction ([34875978](https://pubmed.ncbi.nlm.nih.gov/34875978/)) | AI Scan detect duoc nhung review loop chua du | Recognition chua bang usefulness | Scan co the tao du lieu sai / thieu | Them replace/edit/search ngay trong scan flow |
| AI product value den tu focused workflow va reviewability ([Codex Use Cases](https://developers.openai.com/codex/use-cases)) | Voice va scan co wow moment nhung chua stable | AI surface vuot qua workflow maturity | User mat trust nhanh | Giam promise, tang reviewability |
| Visibility of system status va progress feedback quan trong ([NNG](https://www.nngroup.com/articles/visibility-system-status/), [Material Progress](https://m3.material.io/components/progress-indicators/overview)) | Save feedback mot so man chua ro, voice cho lau | User khong biet app dang lam gi | Tang anxiety, giam trust | Them progress states va done states ro hon |
| Health AI can minh bach basis cua recommendation ([FDA CDS guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software)) | AI target / scan / voice chua noi ro assumptions day du | Explanation gap | Health-adjacent AI can giai trinh duoc | Them "vi sao" va "du lieu dau vao" vao target/scan/voice |
| Competitor support docs cho thay low-friction logging la trung tam ([MyFitnessPal](https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-do-I-add-a-food-to-my-food-diary-), [Lose It](https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629)) | EatFitAI co nhieu kenh log nhung 2 kenh chinh dang thap reliability | Breadth > reliability | Feature breadth khong giu duoc habit | Rut focus ve logging lanes co kha nang chay that |
| Cronometer minh bach scoring va data quality ([Nutrition Scores](https://support.cronometer.com/hc/en-us/articles/360042110112-Nutrition-Scores)) | EatFitAI co score/insight nhung explainability con mong | Trust gap | Health app can giai thich score de user tin | Them explanation va quality marker cho insights |
| WHO khuyen nghi task AI phai well-defined, monitored, transparent ([WHO 2024](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models)) | Voice va scan chua duoc rao lai bang governance/product messaging | Scope gap | Rui ro user tin sai muc | Dinh vi ro "guidance, not diagnosis"; voice la beta |

---

## 10. Short Decision Summary

Neu can rut gon toan bo evidence pack thanh 5 quyet dinh:

1. Search phai duoc sua truoc, vi no la blocker hanh vi trung tam.
2. Nutrition coaching lane phai duoc nang thanh core story cua app.
3. Voice phai bi ha cap promise cho toi khi quality du beta.
4. AI scan phai duoc do bang correction completion, khong phai recognition success.
5. Moi AI recommendation quan trong hon nen co them basis, uncertainty, va fallback.

---

## 11. Notes on Interpretation

- Nguon competitor duoc dung chu yeu de benchmark shape san pham va workflow pattern, khong duoc dung nhu bang chung lam sang.
- Nguon hoc thuat duoc dung de xac dinh flow nao tac dong that den utility va outcomes.
- Nguon governance duoc dung de nang chat luong trust/safety positioning, khong de ep EatFitAI vao framing medical device.
- Cac ket luan trong tai lieu nay phai duoc doc cung voi QA runtime, vi benchmark ngoai repo chi co gia tri khi duoc doi chieu voi hanh vi that cua app.
