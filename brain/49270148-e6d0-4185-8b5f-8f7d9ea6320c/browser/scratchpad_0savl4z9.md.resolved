# Task: Verify Gemini Keys Page Load and Error

## Checklist
- [x] Navigate to http://localhost:3000
- [x] Login as admin@eatfit.ai
- [x] Navigate to "Gemini Keys"
- [x] Wait for load and error (Confirmed 500 error in console)

## Observations
- The page is at `http://localhost:3000/gemini-keys`.
- The user logged in as `admin@eatfit.ai`. Note: The UI still displays `eatfitai.admin@example.com`, which suggests the UI might be using a hardcoded placeholder or not dynamic for the email field.
- The network request to `http://localhost:5247/api/admin-ai/keys` failed with a 500 Internal Server Error, as expected.
- The UI reflects this failure by showing "No keys found. Add your first Gemini key to start the pool." instead of populated data.
- Console logs explicitly show the 500 error.
