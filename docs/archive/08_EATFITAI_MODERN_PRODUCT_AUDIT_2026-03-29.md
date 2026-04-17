# EATFITAI MODERN PRODUCT AUDIT

Ngay cap nhat: 2026-03-29  
Pham vi: product + technical audit dua tren codebase, QA runtime that, va benchmark ngoai repo  
Doi tuong doc: founder, product lead, engineering lead

---

## 1. Executive Summary

EatFitAI dang o mot diem rat ro rang: app khong thieu feature surfaces, nhung gia tri lap lai hang ngay van chua duoc khoa chat. So voi benchmark app AI hien dai va app dinh duong/mobile health co kha nang giu user lau dai, EatFitAI hien co 3 uu diem that va 4 lo hong lon:

### Uu diem that

- App da co shape cua mot san pham AI-native, khong chi la calorie tracker co them mot nut AI.
- Cum `Nutrition Settings + Nutrition Insights + Home/Diary/Stats sync` la hero-flow thuc su, vi no dua ra de xuat, cho phep apply, va phan anh lai tren dashboard.
- App co da kenh input: manual search, AI scan, voice, diary edit, settings, profile. Ve mat tham vong san pham, day la huong hien dai.

### Lo hong lon

- `Food Search` dang hong o flow that, nen manual logging bi chan. Theo benchmark behavioral nutrition, day khong chi la bug; day la blocker cua self-monitoring.
- `Voice` dang o tinh trang "promise vuot qua chat luong thuc te": latency cao, intent fail dien rong, feedback trust thap. Trong app health, day lam hao mon niem tin nhanh.
- `AI Scan` co gia tri demo, nhung trust loop chua du: review/edit/confidence/fallback/discoverability chua day du de tro thanh kenh log chinh.
- `VisionHistory` va `RecipeSuggestions` ton tai trong source va route, nhung completion path tu UI that chua chac tay. Day la dau hieu coherence san pham chua cao.

### Ket luan dieu hanh

Verdict van la: `Internal demo only`.

Ly do:

1. App da co nhieu khoi san pham dung huong.
2. Nhung core loop quan trong nhat de tao habit hang ngay van chua dat muc tin cay can thiet.
3. Theo benchmark ngoai repo, van de cua EatFitAI khong nam o "thieu them AI", ma nam o "AI va non-AI loop chua du reviewable, fast, trustworthy, va repeatable".

---

## 2. Expanded Benchmark Framework

Audit nay duoc chot theo 5 lop benchmark, de tranh danh gia cam tinh:

### 2.1 AI product patterns

- OpenAI Codex Use Cases: AI co gia tri cao khi task duoc scope ro, co visual check/review loop, va gan vao workflow lap lai thay vi mot lan dung thu.  
  Nguon: [Codex Use Cases](https://developers.openai.com/codex/use-cases)
- OpenAI "How OpenAI uses Codex": utility ben vung den tu code understanding, flow support, performance optimization, tang velocity, va giam context switching.  
  Nguon: [How OpenAI uses Codex](https://openai.com/business/guides-and-resources/how-openai-uses-codex/)

### 2.2 Mobile UX / performance

- Android Developers ve launch time, startup analysis, slow rendering.  
  Nguon: [App startup time](https://developer.android.com/topic/performance/vitals/launch-time), [App startup analysis and optimization](https://developer.android.com/topic/performance/appstartup/analysis-optimization), [Slow rendering](https://developer.android.com/topic/performance/vitals/render)
- Material Design ve progress indicators va error states.  
  Nguon: [Material Errors](https://m1.material.io/patterns/errors.html), [Material Progress Indicators](https://m3.material.io/components/progress-indicators/overview)
- Nielsen Norman Group ve visibility of system status, heuristics, va error prevention.  
  Nguon: [Ten Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)

### 2.3 Nutrition tracking product patterns

- MyFitnessPal benchmark cho `speed of logging` va `capture variety`: add food, barcode, meal scan, meal creation.  
  Nguon: [Add food to diary](https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-do-I-add-a-food-to-my-food-diary-), [Barcode scanner](https://support.myfitnesspal.com/hc/en-us/articles/360032624771-How-do-I-use-the-barcode-scanner-to-log-foods-), [Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ), [Meal Creation FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360032625331-Meal-Creation-FAQ)
- Cronometer benchmark cho `trust in data` va `nutrition depth`.  
  Nguon: [Nutrition Scores](https://support.cronometer.com/hc/en-us/articles/360042110112-Nutrition-Scores), [How Nutrition Scores Are Calculated](https://support.cronometer.com/hc/en-us/articles/44414065586836-How-are-Nutrition-Scores-calculated), [Nutrition Report](https://support.cronometer.com/hc/en-us/articles/360018569691-Nutrition-Report)
- Noom benchmark cho `coaching + habit formation`.  
  Nguon: [What Is Noom and How Does It Work](https://www.noom.com/blog/what-is-noom-how-does-noom-work/), [Weight Loss Zone and Progress Tracking](https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/biometrics/2025/10/how-noom-sets-your-weight-loss-zone-and-tracks-your-progress/)
- Lose It benchmark cho `easy logging + streak + multiple capture modes`.  
  Nguon: [Lose It App Store listing](https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629)

### 2.4 Digital health / behavior change evidence

- App-based nutrition interventions co tac dung, nhung hieu qua tang len khi co goals/planning, feedback/monitoring, shaping knowledge, va social support.  
  Nguon: [PubMed 31353783](https://pubmed.ncbi.nlm.nih.gov/31353783/)
- Self-monitoring adherence va personalized feedback co lien quan ro den weight-loss outcomes.  
  Nguon: [PubMed 41539436](https://pubmed.ncbi.nlm.nih.gov/41539436/), [PubMed 39962997](https://pubmed.ncbi.nlm.nih.gov/39962997/), [PubMed 22536058](https://pubmed.ncbi.nlm.nih.gov/22536058/)
- Smartphone dietary tools phat huy tac dung khi data capture day du, de su dung, va co co che dam bao completeness.  
  Nguon: [PubMed 34875978](https://pubmed.ncbi.nlm.nih.gov/34875978/)
- Tong quan lon hon cho thay mobile interventions co tac dung, nhung tac dung dung khi tracking loop khong bi dut mach.  
  Nguon: [PubMed 32706724](https://pubmed.ncbi.nlm.nih.gov/32706724/), [PubMed 37071452](https://pubmed.ncbi.nlm.nih.gov/37071452/), [PubMed 40829125](https://pubmed.ncbi.nlm.nih.gov/40829125/)

### 2.5 AI trust / health governance

- WHO khuyen nghi AI cho health phai co transparency, stakeholder input, accuracy cho task duoc scope ro, va post-release monitoring.  
  Nguon: [WHO 2024 LMM guidance](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models), [WHO 2021 ethics guidance](https://www.who.int/publications/i/item/9789240029200), [WHO 2023 caution on LLMs in health](https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health)
- FDA de cao kha nang cho user/clinician xem duoc co so cua recommendation, biet input, quality, va logic chinh.  
  Nguon: [FDA Clinical Decision Support Software](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software), [FDA Step 6 on independent review of recommendations](https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support)
- Empirical review cho thay explainability khong tu dong tao trust, nhung thieu no thi adoption trong health rat yeu.  
  Nguon: [PubMed 39476365](https://pubmed.ncbi.nlm.nih.gov/39476365/), [PubMed 38698888](https://pubmed.ncbi.nlm.nih.gov/38698888/)

---

## 3. Current Product Shape

Can nhin EatFitAI theo dung shape hien tai, khong theo slide marketing:

- Day la mot `AI-enabled nutrition app`, khong phai mot medical app va cung chua phai mot daily habit engine da chin.
- Ve shape san pham, EatFitAI dung o giua 3 mo hinh:
  - calorie tracker / diary app
  - multimodal logging app
  - AI coaching companion
- Van de cua app khong nam o cho "co qua it feature". Nguoc lai, app dang bi tan man giua qua nhieu promise so voi muc on dinh thuc te.

Neu quy ve capability clusters:

| Cluster | Hien trang EatFitAI | Nhan xet |
| --- | --- | --- |
| Capture | Search, AI scan, voice, diary edit | Da dang, nhung Search va Voice dang lam dut loop |
| Review | Co confidence va edit mot phan trong scan | Chua du manh va chua ro fallback |
| Coach | Nutrition settings + insights hoat dong tot | Day la cum manh nhat hien tai |
| Retain | Stats, achievements, profile menus | Retention loop con mong, achievements sync chua chac |
| Trust | Co confidence score, nhung explainability va fallback con mong | Chua du cho health-adjacent AI |
| Performance | Co startup scan/discovery, local AI, sync | Cold start, voice latency, AI flow instability van ro |

---

## 4. User Flow Audit

### 4.1 Phan loai theo user-facing reality

| Flow | Phan loai | Nhan xet |
| --- | --- | --- |
| Welcome -> Register -> Verify -> vao app | Works but dated | Chay duoc, nhung resend verification va onboarding redirect chua nhat quan |
| Login -> Home | Works but fragile | Login thanh cong, nhung trust giam vi warning overlay va onboarding mismatch |
| Home -> Diary -> Stats | Works and modern | Day la flow co coherence tot nhat hien tai |
| Home -> Food Search -> Manual add | Broken but strategically important | Hu flow quan trong nhat cua daily logging |
| Home -> AI Scan -> Result -> Quick save | Works but low-trust | Demo duoc, nhung chua du review loop de tro thanh flow chinh |
| AI Scan -> Ingredient basket -> Recipe | Hidden / unstable | Co route va logic, nhung user flow that chua on dinh |
| Home/Profile -> Voice -> parse -> execute | Broken but strategically important | Promise lon, ket qua thuc te thap |
| Profile -> Nutrition Settings -> Apply -> Home sync | Works and modern | Flow co gia tri san pham ro nhat |
| Profile -> Nutrition Insights | Works and modern | Co tinh coaching va data loop that |
| Vision History | Hidden or unreachable | Tinh nang ton tai nhung discoverability kem |
| Profile/settings screens | Works but low-utility | Nhieu man pass, nhung khong tao gia tri lap lai manh |

### 4.2 Danh gia user flow tong quan

EatFitAI co 2 user journeys chinh:

1. `Log meal and stay on plan`
2. `Get AI help to improve eating`

Journey (1) dang bi ham boi Search fail. Journey (2) dang co 2 khoi sang gia:

- scan anh
- nutrition target / insights

Nhung scan anh lai chua du trust, con nutrition target / insights thi dung huong nhung chua duoc dat vao trung tam onboarding va habit loop mot cach sach se.

### 4.3 Ket luan cho user flow

Diem `User Flow`: `4.5/10`

Ly do:

- continuity cua flow cot loi chua dat
- time-to-value cho user thuong chua chac
- co qua nhieu route ton tai nhung khong de discover hoac khong on dinh trong completion path

---

## 5. Competitive Comparison

So sanh nay khong nham chung minh doi thu "tot hon o moi mat". Muc dich la tim pattern san pham da duoc xac lap.

| Truc | EatFitAI | MyFitnessPal | Cronometer | Noom | Lose It |
| --- | --- | --- | --- | --- | --- |
| Speed of logging | Yeu vi Search hong; AI scan partial; voice broken | Rat manh nho manual add, barcode, meal scan, saved meals | Tot cho manual logging chinh xac, nhung tap trung data depth hon speed | Logging gan voi coaching, khong qua da kenh nhu MFP | Rat manh o ease-of-entry, barcode, photo, voice, quick add |
| Trust in data | Trung binh-thap | Dua vao DB lon va flow edit ro | Cao nhat trong nhom ve data depth va score logic | Trust den tu coaching frame hon data granularity | Kha cao o practical logging, nhung ve micronutrients khong sau bang Cronometer |
| Coaching depth | Kha tot o Nutrition Settings/Insights, nhung chua lien tuc | Vua phai, tang dan qua meal planner | Manh ve report/scores, yeu hon ve behavior coaching | Rat manh ve behavior framing va progress loop | Trung binh, thien ve motivation va logging convenience |
| Retention / habit loop | Yeu | Manh nho low-friction logging | Manh voi reporting va serious trackers | Manh nho psychology + routine | Manh voi streaks, milestones, easy logging |
| Multimodal promise | Cao | Cao | Trung binh | Trung binh | Cao |
| Multimodal execution | Chua on dinh | Mature hon va reviewable hon | Khong dat scan/voice len trung tam | Khong dat scan/voice lam promise chinh | Da productize photo + voice nhu capture option, khong phai trung tam duy nhat |

### Nghia cua bang so sanh

- EatFitAI khong thua vi thieu ambition.
- EatFitAI thua vi chua quy ambition thanh workflow rat ngan, tin cay, co kha nang sua, va lap lai nhieu lan moi ngay.
- Doi thu manh nhat deu co mot nguyen tac chung: `capture phai cuc nhanh, review phai ro, va user phai luon co duong lui de sua`.

---

## 6. Modernity Audit

### 6.1 Diem manh

- App co tham vong multimodal that: image, voice, search, diary, AI target, AI insight.
- App khong giam AI thanh mot chatbot tab rieng. AI co duoc ngan vao log meal, target setting, insight generation.
- Local-first architecture va AI provider rieng tao ra mot huong rat "builder-native" va co the co gia tri cho demo ky thuat.

### 6.2 Diem yeu

- Hien dai o capability khong dong nghia voi hien dai o workflow. Chuan product AI hien dai nhan manh scope ro, reviewability, va visual checks; EatFitAI moi dat mot phan.
- App co nhieu AI surfaces hon muc no co the support bang feedback va fallbacks.
- Voice hien dang duoc dat nhu capability trung tam, trong khi quality thuc te chua du beta-grade.

### 6.3 Nhan dinh

EatFitAI la `modern in ambition, uneven in execution`.

Diem `Do hien dai`: `6.5/10`

Neu chi nhin qua screen inventory, diem co the cao hon. Nhung neu cham theo benchmark AI-native product, diem bi tru o cho:

- review loop
- workflow clarity
- trust signaling
- completion reliability

---

## 7. Usefulness Audit

### 7.1 Gia tri hang ngay cho user

App dinh duong chi that su huu dung neu user co the:

1. ghi log nhanh
2. xem tong quan de hieu ngay minh dang o dau
3. nhan duoc goi y de dieu chinh
4. lap lai dieu do hang ngay voi ma sat thap

EatFitAI hien lam tot buoc (2) va (3) o cum Home/Stats/Nutrition. Van de la buoc (1) chua chac. Khi logging bi dut mach, utility tong the giam rat nhanh.

### 7.2 Tai sao Search hong la product blocker

Theo evidence ngoai repo, adherence voi self-monitoring va feedback la predictor quan trong cua ket qua giam can/cai thien hanh vi an uong. Neu manual logging khong chay, app mat mot trong nhung duong capture ben vung nhat.  
Nguon: [PubMed 41539436](https://pubmed.ncbi.nlm.nih.gov/41539436/), [PubMed 39962997](https://pubmed.ncbi.nlm.nih.gov/39962997/), [PubMed 22536058](https://pubmed.ncbi.nlm.nih.gov/22536058/)

Vi vay:

- Search fail khong nen duoc xep vao nhom "bug o mot man".
- No la `P1 product blocker` vi no cat dut tan suat self-monitoring.

### 7.3 Hero-flow tiem nang

`Nutrition Settings + AI Suggest + Apply + Home sync + Insights`

Day la flow gan nhat voi benchmark digital coaching:

- co baseline
- co recommendation
- co apply
- co update lai state
- co feedback tren dashboard

Neu EatFitAI can chon 1 cum de productize truoc, day la cum nen duoc dat len tren.

Diem `Tinh huu dung`: `5.0/10`

---

## 8. Logic and System Coherence Audit

### 8.1 Product-level coherence

Cac flow manh nhat hien tai co coherence tot:

- Home <-> Diary <-> Stats
- Nutrition Settings <-> Home sync
- Nutrition Insights dua tren du lieu that

Nhung cac flow AI "hype-heavy" lai coherence kem hon:

- Search fail lam dut loop voi voice add food va manual add
- Voice parse fail lam user khong the tin ket qua AI
- Recipe / Vision History chua de tim thay va completion path chua chac

### 8.2 System-level coherence

Dua tren tai lieu noi bo va QA:

- voice boundary chua dong nhat
- onboarding co noi phu thuoc AI de recalculate
- route ton tai nhung discoverability chua tuong xung
- state sync co diem sang, nhung khong dong deu tren tat ca cum

### 8.3 Nhan dinh

Van de cua EatFitAI khong phai la logic trong tung man hinh le. Van de la logic product cross-flow:

- AI result nao la de tham khao?
- AI result nao co the apply ngay?
- AI result nao can user review?
- AI fail thi app lam gi?

Khi nhung cau hoi nay chua duoc tra loi nhat quan, trust va utility cung giam theo.

Diem `Logic xu ly / coherence`: `4.5/10`

---

## 9. Performance and Reliability Audit

### 9.1 Hieu nang cam nhan

QA runtime cho thay:

- cold start khoang `8.2s`
- voice parse khoang `11.2s`
- nutrition settings / insights chap nhan duoc
- AI scan thanh cong 1 lan nhung chua co logging timing on dinh

Theo Android quality guidance, startup, app responsiveness, va slow rendering la KPI can theo doi lien tuc; perceived speed cung phu thuoc rat manh vao feedback during wait.  
Nguon: [Android launch time](https://developer.android.com/topic/performance/vitals/launch-time), [Android startup analysis](https://developer.android.com/topic/performance/appstartup/analysis-optimization), [Android slow rendering](https://developer.android.com/topic/performance/vitals/render), [Material progress indicators](https://m3.material.io/components/progress-indicators/overview)

### 9.2 Van de trust do performance gay ra

- `8.2s` cold start da nam o nguong de user consumer bat dau cam thay app "nang".
- `11.2s` cho voice parse la qua cham doi voi mot interaction duoc hieu la conversation-like.
- Neu voice lai con fail sau khi cho lau, user mat trust nhanh hon nhieu so voi mot nut thong thuong bi loi.

### 9.3 Do tin cay

Reliability thap hon muc demo an toan vi:

- Search fail co he thong
- Voice fail co he thong
- Scan / gallery flow co flakiness
- discovery / startup / accessibility tree sau launch chua that on dinh

Diem `Hieu nang cam nhan`: `4.5/10`  
Diem `Do tin cay`: `4.0/10`

---

## 10. AI UX Audit

### 10.1 AI scan

Danh gia AI scan khong nen chi dua tren "nhan dien duoc ga". Trong nutrition app, AI scan phai dat 4 dieu:

1. detect du nhanh
2. confidence du de user biet co nen tin hay khong
3. sua du de user chinh serving / food match
4. fail an toan, khong du day user vao ket qua sai ma khong biet

EatFitAI hien dat mot phan:

- co confidence
- co quick save / add to diary
- co huong teach-label

Nhung chua dat du:

- trust loop sau detect
- clear explanation ve estimate
- easy compare giua AI guess va user correction
- stable entry/return flow de user lap lai nhieu lan

### 10.2 Voice

Voice dang la vi du ro nhat cua `AI UX vuot kha nang thuc te`:

- promise lon
- completion rate thap
- latency cao
- confidence thuc te thap
- fallback chua du an tam

Theo benchmark AI UX va trust trong health, capability nay nen duoc dinh vi la `beta capture mode`, khong nen la promise ngang hang voi manual logging.  
Nguon: [Codex Use Cases](https://developers.openai.com/codex/use-cases), [WHO 2024 guidance](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models), [PubMed 39476365](https://pubmed.ncbi.nlm.nih.gov/39476365/)

### 10.3 AI coaching

Cum AI coaching hien la AI UX tot nhat cua app, vi:

- co nguyen nhan/ket qua ro
- user co the apply
- state thay doi co the quan sat duoc
- khong bat user phai tin mo quang vao mot ket qua duy nhat

Diem `AI UX`: `4.5/10`

---

## 11. Trust, Safety, and Health Positioning

EatFitAI khong nen duoc dinh vi nhu mot cong cu diagnosis hay medical decision tool. Benchmark WHO va FDA khong bat EatFitAI phai tro thanh regulated device, nhung co 4 nguyen tac rat nen duoc hoc:

1. recommendation phai co co so de user co the xem lai
2. input / assumption phai duoc noi ro
3. fallback phai an toan va minh bach
4. task AI phai duoc scope hep, accuracy du, va monitor sau khi deploy

### 11.1 Hien trang EatFitAI

Diem tich cuc:

- co confidence score o scan
- co kha nang apply target thay vi ep auto-apply
- co phan tach mot so AI flow thanh screen rieng

Diem thieu:

- chua co thong diep position ro rang rang day la guidance, khong phai medical advice
- voice va scan chua giai thich du assumptions / uncertainty
- fallback messaging chua dong vai tro xay dung trust

### 11.2 Danh gia

Ve trust/safety, app hien o muc:

- du de demo
- chua du de khuyen khich user dua phan lon logging hoac dietary decisions vao AI ma khong review

---

## 12. Evidence-backed Improvement Opportunities

### 12.1 Giam friction khi log do an

External benchmark:

- MyFitnessPal, Lose It, va evidence behavioral deu cho thay logging phai nhanh, da duong, va luon co duong fallback.  
  Nguon: [MyFitnessPal add food](https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-do-I-add-a-food-to-my-food-diary-), [Lose It App Store](https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629), [PubMed 22536058](https://pubmed.ncbi.nlm.nih.gov/22536058/)

Current EatFitAI evidence:

- Search tra rong, manual add blocked.

Concrete improvement:

- dua `manual search reliability` len P1 cao nhat
- neu search backend chua on, them `quick add` va `recent meals` manh hon de mo lai daily logging

### 12.2 Tang trust loop cho AI scan

External benchmark:

- MyFitnessPal meal scan van cho manual search during scan; smartphone dietary tools can completeness va editability cao hon moi giup data co gia tri.  
  Nguon: [Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ), [PubMed 34875978](https://pubmed.ncbi.nlm.nih.gov/34875978/)

Current EatFitAI evidence:

- scan co detect duoc, nhung ket qua va flow tiep theo chua on dinh.

Concrete improvement:

- them "review before save" ro hon
- cho manual search/replace ngay trong flow scan
- luu lich su correction de tang trust va future quality

### 12.3 Xu ly Voice nhu beta capability, khong phai core promise

External benchmark:

- AI health trust phu thuoc vao accuracy, latency, va ability to inspect basis.  
  Nguon: [WHO 2024 guidance](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models), [PubMed 39476365](https://pubmed.ncbi.nlm.nih.gov/39476365/)

Current EatFitAI evidence:

- 3/3 voice text intents fail trong QA; latency ~11.2s.

Concrete improvement:

- doi label thanh beta
- dua expectation ro: "co the sai, vui long review"
- chi mo rong promise sau khi parse quality va latency duoc keo ve nguong chap nhan duoc

### 12.4 Tang behavior-change support thay vi chi them AI surfaces

External benchmark:

- interventions hieu qua hon khi co goals/planning, feedback/monitoring, shaping knowledge, coaching, va support loop.  
  Nguon: [PubMed 31353783](https://pubmed.ncbi.nlm.nih.gov/31353783/), [PubMed 37071452](https://pubmed.ncbi.nlm.nih.gov/37071452/), [PubMed 40829125](https://pubmed.ncbi.nlm.nih.gov/40829125/), [Noom](https://www.noom.com/blog/what-is-noom-how-does-noom-work/)

Current EatFitAI evidence:

- insights va target apply la flow manh, nhung chua duoc dat thanh vong lap hang ngay / hang tuan ro rang.

Concrete improvement:

- dat `weekly plan + daily check-in + adaptive target review` thanh backbone
- su dung scan/voice nhu accelerator, khong phai xuong song san pham

---

## 13. Scoring Matrix

| Hang muc | Diem | Tinh chat |
| --- | --- | --- |
| User Flow | 4.5/10 | Co nhieu flow, nhung core loop bi dut |
| Do hien dai cua app | 6.5/10 | Modern in ambition, uneven in execution |
| Tinh huu dung | 5.0/10 | Co gia tri that, nhung utility hang ngay chua on |
| Logic xu ly / coherence | 4.5/10 | Cum manh co coherence; cross-flow AI chua chac |
| Hieu nang cam nhan | 4.5/10 | Cold start va voice latency chua dat |
| Do tin cay | 4.0/10 | Search/voice/scan instability lam diem roi |
| AI UX | 4.5/10 | AI coaching kha hon AI capture |
| Product readiness | 3.5/10 | Chua du cho beta cong khai |

---

## 14. Top Strategic Risks

1. App bi nham la "co rat nhieu AI, nen phai tot", trong khi logging loop co ban lai chua on.
2. Search fail keo giam tan suat self-monitoring, lam mat co hoi retention va outcome.
3. Voice neu tiep tuc duoc dat ngang vai tro voi manual logging se lam suy giam trust nhanh.
4. Scan neu khong co reviewable correction loop se tro thanh demo trick hon la utility lane.
5. Qua nhieu route ton tai nhung khong de discover hoac khong completion-safe se lam san pham trong "trong code rat nhieu, trong tay user rat it".

---

## 15. Priority Recommendations

### Fix now

1. Sua `Food Search` va mo lai manual logging; day la product blocker so 1.
2. Doi dinh vi `Voice` thanh beta, giam promise, them fallback va do lai latency/intent success.
3. Cung co `AI Scan review loop`: replace, edit, confidence explanation, va save confirmation ro rang.
4. Sua onboarding redirect va resend verification de auth flow sach hon.

### Fix next

1. Day `Nutrition Settings + Insights` len thanh backbone coaching cua app.
2. Lam ro discoverability cua `VisionHistory` va `RecipeSuggestions`, hoac an tinh nang neu chua san sang.
3. Tang retention loop that: weekly review, progress summary, achievements sync dung, recent meals / remembered meals.
4. Them startup/performance instrumentation cho cold start, voice, detect, va key navigation hops.

### Strategic upgrades

1. Chuyen tu "nhieu AI surfaces" sang "it lanes nhung lane nao cung reviewable".
2. Dat health positioning ro: guidance, not diagnosis; minh bach assumptions va uncertainty.
3. Xay `capture -> review -> coach -> retain` thanh backbone san pham, thay vi phat trien tung AI feature rieng le.

---

## 16. Ship Readiness Verdict

### Verdict: `Internal demo only`

Can giai thich ro:

- EatFitAI da co the demo duoc mot tam nhin rat hop thoi.
- Nhung de len `internal beta ready`, app can dat 3 nguong toi thieu:
  1. manual logging khong bi blocker
  2. voice duoc ha cap promise hoac duoc nang quality that
  3. AI scan co trust loop va completion path on dinh hon

Neu 3 muc nay chua duoc xu ly, public beta se de sinh ra nhan xet rat xau theo huong:

- "AI rat hay tren slide nhung khong giup toi log nhanh hon"
- "App hien dai nhung toi khong the tin no"

---

## 17. Sources and Evidence

### Noi bo repo

- `docs/01_ARCHITECTURE_OVERVIEW.md`
- `docs/02_USERFLOW.md`
- `docs/03_AI_FLOW.md`
- `docs/QA_EATFITAI_FULL_APP_EVALUATION_2026-03-28.md`
- `artifacts/qa/2026-03-28/*`

### Nguon chinh thuc / benchmark / hoc thuat

- OpenAI: [Codex Use Cases](https://developers.openai.com/codex/use-cases)
- OpenAI: [How OpenAI uses Codex](https://openai.com/business/guides-and-resources/how-openai-uses-codex/)
- Android: [App startup time](https://developer.android.com/topic/performance/vitals/launch-time)
- Android: [App startup analysis and optimization](https://developer.android.com/topic/performance/appstartup/analysis-optimization)
- Android: [Slow rendering](https://developer.android.com/topic/performance/vitals/render)
- Material: [Errors](https://m1.material.io/patterns/errors.html)
- Material: [Progress indicators](https://m3.material.io/components/progress-indicators/overview)
- NNG: [Ten Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- NNG: [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)
- MyFitnessPal: [Add food to diary](https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-do-I-add-a-food-to-my-food-diary-)
- MyFitnessPal: [Barcode scanner](https://support.myfitnesspal.com/hc/en-us/articles/360032624771-How-do-I-use-the-barcode-scanner-to-log-foods-)
- MyFitnessPal: [Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ)
- MyFitnessPal: [Meal Creation FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360032625331-Meal-Creation-FAQ)
- Cronometer: [Nutrition Scores](https://support.cronometer.com/hc/en-us/articles/360042110112-Nutrition-Scores)
- Cronometer: [How Nutrition Scores are calculated](https://support.cronometer.com/hc/en-us/articles/44414065586836-How-are-Nutrition-Scores-calculated)
- Cronometer: [Nutrition Report](https://support.cronometer.com/hc/en-us/articles/360018569691-Nutrition-Report)
- Noom: [What Is Noom and How Does It Work](https://www.noom.com/blog/what-is-noom-how-does-noom-work/)
- Noom: [Weight Loss Zone and Progress Tracking](https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/biometrics/2025/10/how-noom-sets-your-weight-loss-zone-and-tracks-your-progress/)
- Lose It: [App Store listing](https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629)
- Academic: [PubMed 31353783](https://pubmed.ncbi.nlm.nih.gov/31353783/)
- Academic: [PubMed 41539436](https://pubmed.ncbi.nlm.nih.gov/41539436/)
- Academic: [PubMed 39962997](https://pubmed.ncbi.nlm.nih.gov/39962997/)
- Academic: [PubMed 22536058](https://pubmed.ncbi.nlm.nih.gov/22536058/)
- Academic: [PubMed 34875978](https://pubmed.ncbi.nlm.nih.gov/34875978/)
- Academic: [PubMed 32706724](https://pubmed.ncbi.nlm.nih.gov/32706724/)
- Academic: [PubMed 37071452](https://pubmed.ncbi.nlm.nih.gov/37071452/)
- Academic: [PubMed 40829125](https://pubmed.ncbi.nlm.nih.gov/40829125/)
- WHO: [Ethics and governance of AI for health](https://www.who.int/publications/i/item/9789240029200)
- WHO: [LMM guidance 2024](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models)
- WHO: [Safe and ethical AI for health](https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health)
- FDA: [Clinical Decision Support Software](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software)
- FDA: [CDS Step 6](https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support)
- Trust / XAI: [PubMed 39476365](https://pubmed.ncbi.nlm.nih.gov/39476365/)
- Trust / translation: [PubMed 38698888](https://pubmed.ncbi.nlm.nih.gov/38698888/)

---

## 18. Final Take

EatFitAI khong gap bai toan "thieu y tuong". App gap bai toan kho hon: co qua nhieu y tuong da duoc dua vao product shape, nhung chua duoc nen thanh vai workflow ngan, nhanh, de tin, va lap lai duoc hang ngay.

Neu phai tom mot cau:

`EatFitAI da modern enough de gay chu y, nhung chua trustworthy enough de giu nguoi dung quay lai moi ngay.`
