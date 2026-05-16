# MoChi GPT image asset brief

Use this brief to generate additional MoChi source sheets that match the current sprite set.

## Style lock
- Same character as existing MoChi sprites: cute tan/brown hamster-like mascot, rounded body, small ears, simple expressive eyes, clean sticker illustration.
- Match the current lighting, outline weight, soft shadows, and saturated-but-friendly colors.
- Keep each pose isolated with enough spacing for crop/export.
- Prefer a plain high-contrast background for post-processing; `gpt-image-2` does not provide transparent background directly.
- Avoid text inside the image.

## Required full-body poses
- scan thinking: holding a small magnifier or looking at food.
- scan success: confident happy pose with small sparkle.
- scan error: gentle confused/sorry pose, not alarming.
- water nudge: holding a water cup, friendly reminder.
- meal nudge: holding a bowl/phone, inviting user to log a meal.
- sleepy idle: calm low-energy idle state.
- celebrate small: compact celebration without large props.
- diet coach: pointing at a nutrition card.
- voice listening: leaning toward a small microphone.
- account secure: holding a small shield/check icon.
- empty state: looking around with a soft question expression.

## Required head/notice variants
- scan thinking head.
- scan success head.
- scan error head.
- water nudge head.
- meal nudge head.
- voice listening head.
- compact island avatar with head and upper body centered in a circular crop.

## Export checklist
- [ ] Generate 2-3 source sheets using the locked style.
- [ ] Review against existing `src/assets/mascot/mochi/sprites`.
- [ ] Remove background locally and crop through `scripts/generate-mochi-sprites.py`.
- [ ] Add final PNGs to `src/assets/mascot/mochi/sprites`.
- [ ] Update `mochiAssets.ts`, `mochiPoseCatalog.ts`, and tests.
- [ ] Verify on Home, AI Scan, Profile, Voice, Stats, and empty/error states.
