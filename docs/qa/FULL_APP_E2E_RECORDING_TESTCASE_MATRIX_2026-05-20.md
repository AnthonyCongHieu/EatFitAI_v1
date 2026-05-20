# EatFitAI Full App E2E Recording Testcase Matrix

Created: 2026-05-20  
Scope: planning only, no build/install/device action performed while writing this document.

## Purpose

This matrix defines the end-to-end recording coverage required to review EatFitAI like a real user, not like a narrow smoke test. Each testcase is designed to produce one standalone video that starts from a known state, completes a meaningful user goal, and ends with an observable result.

The target is not just "screen opened". The target is:

```text
intent -> action -> system response -> user understands next step -> persisted/readback state
```

## Source Map Used For This Matrix

Repo navigation surfaces:

- Auth stack: `IntroCarousel`, `Welcome`, `Login`, `Register`, `VerifyEmail`, `ForgotPassword`, `Onboarding`
- Main tabs: `HomeTab`, `MealDiary`, `VoiceTab`, `StatsTab`, `ProfileTab`
- Diary stack: `FoodSearch`, `FoodDetail`, `CustomDish`, `CommonMeals`, `CommonMealTemplate`
- AI stack: `AiCamera`, `AddMealFromVision`, `VisionHistory`, `RecipeSuggestions`, `RecipeDetail`, `NutritionInsights`, `NutritionSettings`, `DietaryRestrictions`
- Profile stack: `EditProfile`, `BasicInfo`, `BodyMetrics`, `GoalSettings`, `WeightHistory`, `ChangePassword`, `NotificationCenter`, `NotificationsSettings`, `About`, `PrivacyPolicy`, `MoChiPoseGallery`
- Gamification stack: `Achievements`, `AllAchievements`

Recording constraints from Android official tooling:

- `adb screenrecord` produces MP4 screen video.
- It does not record audio.
- Default/max length is 180 seconds.
- Rotation during recording is not supported safely.
- Because of the 180-second cap, each flow must be a separate video.

## Global Pass/Fail Rules

Fail immediately if any of these appear:

- Crash, ANR, redbox, app killed, or impossible recovery.
- Auth loop after login.
- Stale APK or wrong package.
- Token/password/reset code leaked in written logs.
- Visible dev reset code in release UX.
- More than one MoChi surface visible at the same time unless one is clearly a static icon and the other is an intentional modal tutorial.
- Toast, overlay, keyboard, or MoChi blocks the primary CTA long enough to confuse a normal user.
- User completes an action but totals/readback do not update.
- A button appears tappable but does nothing without feedback.
- App jumps outside EatFitAI unexpectedly. Allowed exceptions: Google account picker, Gmail mailbox during reset flow, OS permission sheet, gallery picker, camera permission, notification permission.

Mark as UX issue if:

- Flow passes technically but next action is unclear.
- Loading state has no affordance or appears frozen.
- Animation feels like a delay rather than feedback.
- Back button returns to a surprising screen.
- Copy is judgmental, vague, or inconsistent with the daily nutrition loop.
- Vietnamese text is mojibake, clipped, truncated, or mixed with broken encoding.

## Required Evidence Per Testcase

Each testcase folder must contain:

- `video.mp4`: one complete E2E recording for that testcase.
- `notes.md`: actual result, pass/fail, observed blockers, UX notes.
- `logcat-redacted.txt`: tail around the flow, with tokens/passwords/reset codes removed.
- Optional `ui-dump.xml`: only if UIAutomator works.

Do not use one long "full app tour" video as primary evidence. A full app tour may be supplementary only.

## Test Data Profiles

### Profile A: Fresh Logged-Out User

Use for:

- First launch.
- Welcome.
- Email login.
- Google login.
- Register.
- Forgot password.

Reset expectation:

- App data cleared before start.
- No authenticated session.

### Profile B: Existing Demo User With Diary Data

Use for:

- Home daily loop.
- Diary CRUD.
- Recent/common foods.
- Stats.
- Profile.
- Notifications.

State expectation:

- At least one food entry exists today.
- At least one recent food exists.
- Body metrics and goal exist.

### Profile C: Weak/Empty Nutrition Data User

Use for:

- Home no-log/partial/rough state.
- Weekly review weak-data handling.
- Adaptive target blocked state.

State expectation:

- No complete days or too few complete days.
- App should coach logging quality instead of strong nutrition conclusions.

### Profile D: New Google User

Use for:

- Google sign-in first-time onboarding.

State expectation:

- Google account exists on device.
- EatFitAI account for that Google identity may be new.
- Onboarding may appear after Google sign-in.

## Full Testcase Matrix

### APK And Session Proof

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| APK-00 | P0 | Fresh APK proof | Device connected, app not trusted yet | App opens from clean install | Launcher icon, splash, first auth screen | Package id/version/timestamp prove latest APK; no crash on launch |
| APK-01 | P0 | Relaunch after force stop | App installed, no session | App returns to auth or main shell correctly | Launcher icon, splash/session restore | No blank splash hang; correct session routing |
| APK-02 | P1 | Background/foreground basic | App on Home | App resumes same screen | Android home, recent app, EatFitAI card | No forced logout; no duplicated modal |
| SESSION-01 | P0 | Logout then login again | Logged in | Logged in again | Profile logout, Login, submit | Session clears; protected surfaces unavailable until login; login restores Home |
| SESSION-02 | P1 | App kill during authenticated state | Logged in Home | Relaunch authenticated Home | Android recent kill, launcher | Session persistence works; no auth loop |

### Auth: Welcome, Email, Google, Register, Reset

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| AUTH-00 | P0 | Welcome choice map | Fresh app | Welcome remains stable | Continue with Google, Continue with Email, Register link, close/back if visible | Each visible CTA has clear destination; no dead button |
| AUTH-01 | P0 | Email login success | Logged out | Home | Email CTA, email input, password input, password eye, login button | Correct credentials authenticate; no token printed; Home loads |
| AUTH-02 | P0 | Wrong password | Logged out | Login with error | Email input, password input, login button | Clear error, no crash, password remains hidden, no session created |
| AUTH-03A | P0 | Google login returning user | Logged out, Google account on device | Home or last app surface | Google button, account picker, selected account | Account picker appears; app returns authenticated |
| AUTH-03B | P0 | Google login first-time user | Logged out, Google user has no app profile | Onboarding then Home | Google button, account picker, onboarding steps | Onboarding is required only once; after finish app enters Home |
| AUTH-03C | P1 | Google login canceled | Logged out | Login/Welcome | Google button, account picker back/cancel | User returns safely; clear cancel state; no spinner stuck |
| AUTH-04 | P0 | Forgot password request | Logged out | OTP step | Forgot password link, email field, send code | OTP screen appears; no dev code/autofill/dev toast |
| AUTH-05 | P0 | Reset code via Gmail | OTP step | OTP entered in app | Gmail app, search latest EatFitAI mail, back to app, OTP boxes | Real email code can be retrieved; only allowed external app is Gmail |
| AUTH-06 | P0 | Reset complete and login | New password step | Home with restored usable session | New password fields, reset submit, Login | Reset succeeds; user can login with new password; final password restoration documented |
| AUTH-07 | P1 | Reset wrong OTP | OTP step | OTP step with error | OTP boxes, confirm | Wrong OTP rejected; no move to new password |
| AUTH-08 | P1 | Reset resend/cooldown | OTP step | OTP step | Resend if available | Cooldown or resend feedback is clear; no repeated spam |
| AUTH-09 | P1 | Register happy path | Logged out | VerifyEmail or onboarding | Register link, fields, submit | Registration validates input and routes to verify/onboarding |
| AUTH-10 | P1 | Register invalid inputs | Register screen | Register with errors | Email, password, confirm, name fields | Inline errors visible; no backend crash |
| AUTH-11 | P1 | Verify email wrong code | VerifyEmail screen | VerifyEmail with error | OTP field, submit, resend | Wrong code rejected; resend behavior clear |
| AUTH-12 | P2 | Password eye controls | Login/Register/Reset | Same screen | Eye icon on each password field | Password visibility toggles only local field; no layout jump |

### Onboarding And First-Run Setup

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| ONB-01 | P0 | Complete onboarding minimal valid | New authenticated user | Home | Step next buttons, selectors, numeric fields, final submit | User can finish without hidden required field; Home appears |
| ONB-02 | P1 | Back through onboarding | Onboarding mid-flow | Previous step | Back button, Android back | State persists; no skipped validation |
| ONB-03 | P1 | Invalid onboarding values | Onboarding numeric step | Same step with validation | Height/weight/age inputs | Invalid values rejected with understandable copy |
| ONB-04 | P1 | Goal selection | Onboarding goal step | Next step | Lose/maintain/gain selections | Selected goal visually obvious; target copy not medical |
| ONB-05 | P1 | First-login MoChi tutorial | First Home after onboarding | Home usable | Tutorial next/finish/skip, highlighted targets | Only one MoChi tutorial surface; CTA not blocked after finish |

### Home Daily Nutrition Loop

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| HOME-01 | P0 | No-log Home | Logged in, no meals today | Home | One Job Today, quick actions, bottom tabs | Home tells next action; no redundant always-on card if MoChi already covers it |
| HOME-02 | P0 | Partial-day Home after one meal | One meal logged | Home | Daily totals, missing meals, next action | Home shows partial state and next missing action |
| HOME-03 | P0 | Complete-day Home | Day complete | Home | Daily totals, streak, next action | No unnecessary "log next meal" prompt when complete |
| HOME-04 | P0 | Over-target recovery Home | Calories above target | Home | Recovery card/copy, diary deep link | Non-judgmental recovery guidance; no suggestion to skip meals |
| HOME-05 | P0 | Under-target recovery Home | Calories far under target | Home | Snack suggestion, quick add | Suggests realistic snack; no alarmist language |
| HOME-06 | P1 | Water quick action | Home | Water total updated | Water plus/minus, focus water deep link | Increment/decrement clear; no negative water |
| HOME-07 | P1 | Header actions | Home | Target screens | Avatar, settings, notification, streak | Avatar -> Profile; settings -> Profile/settings; notification -> NotificationCenter; streak -> Achievements |
| HOME-08 | P1 | Quick add hub | Home | Selected input flow | Search, scan, voice actions | Each action opens correct route; overlay closes cleanly |
| HOME-09 | P1 | Pull refresh Home | Home | Home refreshed | Pull-to-refresh | Loading feedback visible; totals remain consistent |
| HOME-10 | P1 | MoChi single-surface audit | Any Home state | Home | Inline notice, overlay, tutorial, toast | At most one major MoChi surface visible; no MoChi stacked with toast in same area |

### Diary, Search, Food Detail, Recent, Common

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| DIARY-01 | P0 | Open diary by tab | Logged in | Diary | Bottom Diary tab, date selector | Today summary loads; no blank list without empty state |
| DIARY-02 | P0 | Search add catalog food | Diary | Diary with new entry | Add/search, search input, result row, add button | Meal appears in correct meal group; totals update |
| DIARY-03 | P0 | Food detail add with serving | Search result | Diary with saved serving | Result row, FoodDetail serving/grams, meal type, save | Calories/macros scale correctly; selected meal type honored |
| DIARY-04 | P0 | Edit existing meal | Existing entry | Diary with updated entry | Entry menu/edit, grams/serving, save | Totals update; entry not duplicated |
| DIARY-05 | P0 | Delete existing meal | Existing entry | Entry removed | Entry menu/delete, confirm/cancel | Delete confirmation clear; totals update after deletion |
| DIARY-06 | P1 | Delete cancel | Existing entry | Entry unchanged | Delete, cancel | No accidental deletion |
| DIARY-07 | P1 | Recent quick add | At least one recent food | Diary updated | Recent chip/list, quick add | Flow completes under 30 seconds; no FoodDetail required unless needed |
| DIARY-08 | P1 | Favorites add/remove | FoodSearch | Favorite state changed | Favorite heart, favorites tab | Favorite persists; can re-add from favorites |
| DIARY-09 | P1 | Common meals open | Diary/Search | Common meal templates | Common tab/button, template row | Template opens and can be applied or edited |
| DIARY-10 | P1 | Custom dish create | Diary/Search | New dish saved | CustomDish, ingredient search, grams, save | Ingredient totals calculated; dish reusable |
| DIARY-11 | P1 | Custom dish invalid | CustomDish | Validation visible | Empty name, no ingredients, invalid grams | Save blocked with useful message |
| DIARY-12 | P1 | Date navigation | Diary | Different date diary | Previous/next date/calendar | Date changes; no today data mixed into other day |
| DIARY-13 | P1 | Empty search | FoodSearch | No result state | Search nonsense term | MoChi/empty state helpful; no crash |
| DIARY-14 | P1 | Search error state | Backend unavailable or simulated error | Error state | Retry | Error copy and retry visible |
| DIARY-15 | P2 | Keyboard behavior | FoodSearch | Search remains usable | Focus input, type, clear, back | Keyboard does not hide result CTA permanently |

### AI Scan, Barcode, Vision Review

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| SCAN-01 | P0 | Gallery food scan save | Logged in, food image in album | Diary with saved meal | Scan, gallery, image picker, review, save | Detection review visible before save; saved meal readback works |
| SCAN-02 | P0 | Camera capture food scan | Camera permission available | Review screen | Scan, shutter, review | Capture does not crash; upload/loading has progress |
| SCAN-03 | P1 | Camera permission denied | Permission not granted | Permission guidance | Permission request, deny | App explains how to continue; no blank camera |
| SCAN-04 | P1 | Gallery cancel | Scan screen | Scan screen | Gallery, cancel/back | Returns to scan; no stuck loading |
| SCAN-05 | P1 | Low-confidence review | Low/uncertain image | Review requiring correction | Review card, edit food, grams | Low confidence cannot save silently as trusted |
| SCAN-06 | P1 | Edit detection before save | Review screen | Diary saved corrected item | Detection row, food search replace, grams edit | Corrected item persists; confidence/source clear |
| SCAN-07 | P1 | Barcode mode valid | Barcode product prepared | Food/detail or review | AI/barcode segmented control, scan barcode | Barcode source shown; no AI estimate badge if provider verified |
| SCAN-08 | P1 | Barcode invalid/not found | Barcode mode | Graceful fallback | Barcode scan, not found state | Offers manual/search fallback; no crash |
| SCAN-09 | P1 | Vision history | Prior scans exist | History detail | VisionHistory row, detail/back | History loads, images/result metadata not broken |
| SCAN-10 | P2 | Flash toggle | Scan screen | Flash state toggled | Flash button | Toggle feedback visible; no layout jump |

### Voice And Text Command

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| VOICE-01 | P0 | Text command add food | Logged in | Diary updated or review shown | Voice tab, text input, send/process | Command parsed; action visible; saved/readback if confirmed |
| VOICE-02 | P0 | Mic record happy path | Mic permission available | Parsed result | Mic button, stop, processing | Recording animation clear; no audio in video expected |
| VOICE-03 | P1 | Mic permission denied | Permission not granted | Permission guidance | Mic permission deny | Explains fallback to text; no hard block |
| VOICE-04 | P1 | Quick command chips | Voice screen | Result/action | Quick command chip | Chip fills/runs command; result clear |
| VOICE-05 | P1 | Unknown command | Voice text | Helpful fallback | Text input, process | Does not hallucinate meal; asks user to clarify |
| VOICE-06 | P1 | Reset voice state | Voice result visible | Clean input state | Reset button | Clears result and input; no stale action |
| VOICE-07 | P1 | Log weight by voice/text | Voice screen | Weight history/profile updated | Text command, process | Weight intent writes/readbacks in profile/stats |

### Stats, Insights, Weekly Review, Adaptive Target

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| STATS-01 | P0 | Open stats overview | Logged in | Stats overview | Stats tab | Calories/macros/trends load; empty state honest |
| STATS-02 | P0 | Weekly review weak data | Weak data user | Weekly review | Weekly tab/review card | Coaches logging quality, not strong nutrition conclusion |
| STATS-03 | P0 | Weekly review complete data | Demo data user | One action shown | Weekly review action | Shows one primary action, not insight spam |
| STATS-04 | P1 | Month stats | Stats | Month view | Month tab/selector | Month data loads without mixing week totals |
| STATS-05 | P1 | Nutrition insights | Stats/Home/Profile path | Insights screen | NutritionInsights route | Insight copy explainable; no unsafe medical claims |
| STATS-06 | P1 | Nutrition settings | Insights/settings path | Settings saved | NutritionSettings controls | Changes persist; no unsafe auto-apply |
| STATS-07 | P0 | Adaptive target suggestion | Enough clean data | Suggestion waiting user action | Adaptive card/apply/dismiss/undo if visible | No auto-apply without explicit action |
| STATS-08 | P1 | Stats refresh/error | Backend slow/unavailable | Error or refreshed stats | Pull refresh/retry | Loading/error state clear |

### Recipes And Dietary Preferences

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| RECIPE-01 | P1 | Recipe suggestions from available ingredients | Ingredients known | Recipe list | RecipeSuggestions route, recipe row | Recipes show match/missing ingredients |
| RECIPE-02 | P1 | Recipe detail | Recipe list | Detail screen | Recipe row, back, add to diary if visible | Nutrition and ingredients visible; no broken image/card |
| RECIPE-03 | P1 | Add recipe to diary | Recipe detail | Diary updated | Add to diary sheet, meal type, save | Entry saved with recipe source |
| RECIPE-04 | P1 | Dietary restrictions save | FoodSearch/settings path | Preferences saved | DietaryRestrictions chips, save | Selected diets/allergies persist and affect suggestions |
| RECIPE-05 | P2 | No recipe result | Restrictive preferences | Empty state | Suggestions load | Empty state useful; no fake recipe |

### Profile, Body Metrics, Goal, Account

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| PROF-01 | P0 | Profile overview navigation | Logged in | Profile | Profile tab | Account info and menu stable |
| PROF-02 | P0 | Edit basic profile | Profile | Profile updated | EditProfile, name/gender fields, save | Changes persist after back/reopen |
| PROF-03 | P0 | Body metrics update | Profile | Metrics updated | BodyMetrics, BasicInfo, height/weight, save | BMI/target dependent values refresh |
| PROF-04 | P0 | Goal settings update | Profile | Goal updated | GoalSettings, goal selector, save | Target recalculates safely; copy explains estimate |
| PROF-05 | P1 | Weight history add | Profile | Weight point added | WeightHistory, add weight, save | Trend updates; invalid weight blocked |
| PROF-06 | P1 | Change password success | Profile | Password changed then restored | ChangePassword fields, submit | Old password required; new login works; original restored |
| PROF-07 | P1 | Change password wrong current | ChangePassword | Error | Submit wrong current password | Error clear; session remains |
| PROF-08 | P1 | Notification settings | Profile | Settings saved | NotificationsSettings toggles, quiet hours if visible | Toggle persists; no noisy reminder claim |
| PROF-09 | P1 | Notification center | Home/Profile | Notification detail/action | Bell, NotificationCenter item, settings icon | Deep links work; no duplicate MoChi |
| PROF-10 | P1 | About/privacy | Profile | Static pages | About, PrivacyPolicy, back | Text readable; no mojibake; links safe |
| PROF-11 | P2 | Avatar/profile image | EditProfile if available | Avatar updated or clear unsupported state | Avatar control | Permission/image picker handled gracefully |

### MoChi, Notification, Overlay Governance

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| MOCHI-01 | P0 | First login tutorial | Fresh Home | Tutorial completed | Tutorial next/finish/skip | One overlay only; after finish no duplicate tutorial |
| MOCHI-02 | P0 | MoChi hub bottom command | Logged in | MoChi sheet/hub | Center bottom command, close | Opens intentionally; closes cleanly; does not stack with Home card |
| MOCHI-03 | P0 | Toast plus overlay collision | Trigger action with toast | App usable | Save meal/toast, MoChi overlay/inline | Toast does not cover critical CTA; no double MoChi |
| MOCHI-04 | P1 | Inline notice in empty/error search | FoodSearch empty/error | Search usable | Search no result, retry | Inline notice helpful and compact |
| MOCHI-05 | P1 | Notification nudge from center | NotificationCenter | Deep-linked surface | Notification item action | One MoChi surface after deep link |
| MOCHI-06 | P1 | Pose gallery | Profile | Pose gallery | MoChiPoseGallery route | Gallery opens; back works |

### Navigation, Back Behavior, System Boundaries

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| NAV-01 | P0 | Bottom tabs repeated | Logged in | Last selected tab | Home, Diary, MoChi center, Stats, Profile | No blank/frozen transition; selected state accurate |
| NAV-02 | P0 | Deep stack back behavior | FoodDetail/AddMeal/Profile subpage | Original parent | Header back, Android back | Back returns to expected parent, not auth/blank |
| NAV-03 | P1 | Keyboard back behavior | Input focused | Same screen usable | Android back, field focus | First back hides keyboard; second back navigates if expected |
| NAV-04 | P1 | Permission sheet boundaries | Scan/Voice | App or permission settings | OS permission allow/deny | Only expected OS surfaces appear |
| NAV-05 | P1 | External app boundary | Gmail/Google/gallery | EatFitAI returns | Recent apps/back/deep link | If outside app unexpectedly, stop and record blocker |

### Error, Offline, Performance Feel

| ID | Priority | Flow | Start State | End State | Buttons/Surfaces To Cover | Expected Result |
|---|---:|---|---|---|---|---|
| ERR-01 | P0 | Backend unavailable login protected call | Logged in | Error state | Pull refresh/retry | No crash; error says try again; no logout unless token invalid |
| ERR-02 | P0 | API validation error | Food/goal invalid input | Same screen with error | Save invalid values | Error copy useful, no mojibake |
| ERR-03 | P1 | Slow network scan/voice | Scan/Voice | Loading then result/error | Submit action | Loading not frozen; cancel/back behavior safe |
| ERR-04 | P1 | Offline launch with existing session | Device offline | Cached shell/error | Launch app | App explains connectivity; does not destroy session |
| PERF-01 | P1 | Home cold load perceived performance | Fresh launch logged in | Home ready | Splash -> Home | No long blank; skeleton appears if needed |
| PERF-02 | P1 | Heavy navigation tour | Logged in | Stable app | Visit all major screens | No accumulating overlays, obvious lag, or memory crash |

## Minimum Production Pass Set

P0 flows that must pass before public demo/release claim:

- `APK-00`, `APK-01`
- `AUTH-01`, `AUTH-02`, `AUTH-03A`, `AUTH-03B`, `AUTH-04`, `AUTH-05`, `AUTH-06`
- `ONB-01`, `ONB-05`
- `HOME-01`, `HOME-02`, `HOME-03`, `HOME-04`, `HOME-05`, `HOME-10`
- `DIARY-01`, `DIARY-02`, `DIARY-03`, `DIARY-04`, `DIARY-05`
- `SCAN-01`, `SCAN-02`
- `VOICE-01`, `VOICE-02`
- `STATS-01`, `STATS-02`, `STATS-03`, `STATS-07`
- `PROF-01`, `PROF-02`, `PROF-03`, `PROF-04`
- `MOCHI-01`, `MOCHI-02`, `MOCHI-03`
- `NAV-01`, `NAV-02`
- `ERR-01`, `ERR-02`

## Coverage Notes For The Next Execution

- Keep Google login split into returning-user and first-time-user flows. They are different products paths.
- Keep email reset split into request, Gmail retrieval, reset complete, login after reset, and password restoration.
- Keep scan split into gallery, camera, permission denied, low-confidence review, and barcode.
- Do not mark Stats/Target/Insight as passed by merely opening Profile. The nutrition loop requires reading the message and verifying it is useful.
- Do not mark MoChi as passed by unit tests only. It must be observed during real user actions where toast/overlay/inline surfaces collide.

