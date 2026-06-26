# HERS365 iOS App Store Deployment Guide

This guide walks through every step from a finished codebase (this PR) to a shipped iOS app on the App Store.

The code is done. Everything below is account setup, paid enrollment, and Xcode-driven distribution — all human-driven actions outside the repo.

---

## 1. Prerequisites checklist

Before starting:

- [ ] macOS machine with **Xcode 15 or newer** (Mac App Store, free, ~10 GB).
- [ ] Apple ID (the one you'll use to enroll).
- [ ] $99 USD for the Apple Developer Program.
- [ ] Ability to receive a verification call from Apple (D-U-N-S verification can take 24-48 hours for organizations; individual enrollment is faster).
- [ ] Production domain reachable over HTTPS — `https://hers365.vercel.app` for now.
- [ ] App icon source at `client/public/logo.png` (already present, used by `npm run mobile:icons`).
- [ ] Privacy policy, support page, and marketing page reachable on the same domain (already shipped at `/privacy`, `/help`, `/`).

Verify Xcode CLI is wired up:

```bash
xcode-select --install            # if not already
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version               # must succeed
```

---

## 2. Enroll in the Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/ and sign in with your Apple ID.
2. Choose **Individual** (faster, ~1 hour) or **Organization** (requires D-U-N-S number, 1-3 business days).
3. Pay $99 USD. Renewal is annual.
4. Wait for the confirmation email. Once confirmed, you can sign in at https://developer.apple.com/account/ and https://appstoreconnect.apple.com/.

**Your Team ID** appears in the top right of the Apple Developer account page. Write it down — it's needed for steps 3 and 17.

---

## 3. Register the App ID

1. Sign in at https://developer.apple.com/account/resources/identifiers/list.
2. Click the **+** button → **App IDs** → **App**.
3. Description: `HERS365`. Bundle ID (explicit): `com.hers365.app`.
4. Under **Capabilities**, enable:
   - **Push Notifications**
   - **Associated Domains**
   - **Sign In with Apple** (recommended — Apple may reject the app without it if any third-party social sign-in is shown)
5. Save.

---

## 4. Provisioning profile (Distribution)

1. https://developer.apple.com/account/resources/profiles/list → **+**.
2. Choose **App Store** under **Distribution**.
3. App ID: `com.hers365.app`.
4. Distribution certificate: create one if you don't have it (downloads a `.p12` you must keep safe).
5. Profile name: `HERS365 App Store Distribution`. Download.
6. Double-click the downloaded `.mobileprovision` file — Xcode installs it automatically.

For local testing during development, Xcode can manage a Development profile automatically via "Automatically manage signing" in the project settings.

---

## 5. APNs key (push notifications)

1. https://developer.apple.com/account/resources/authkeys/list → **+**.
2. Name: `HERS365 APNs`. Check **Apple Push Notifications service (APNs)**.
3. Download the `.p8` file (you can only download it ONCE — keep a backup).
4. Note the **Key ID** and your **Team ID**.
5. These three values (key file, Key ID, Team ID) go into the push backend (Railway env vars):
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_KEY` (the contents of the `.p8` file, base64-encoded if your provider requires it)
   - `APNS_BUNDLE_ID=com.hers365.app`

---

## 6. Xcode project setup

```bash
cd client
npm run mobile:ios            # builds web app, runs cap sync, opens Xcode
```

In Xcode:

1. Select the **App** project in the navigator → **App** target.
2. **Signing & Capabilities** tab:
   - Team: pick your team.
   - Bundle Identifier: confirm `com.hers365.app`.
   - Tick **Automatically manage signing** for Dev, or pick the Distribution profile manually for release builds.
3. **General** tab:
   - Deployment Target: **iOS 15.0**.
   - Display Name: `HERS365`.
   - Version: `1.0.0`. Build: `1` (bump on every TestFlight upload).
4. **Signing & Capabilities** → **+ Capability** and add:
   - **Push Notifications**
   - **Associated Domains** → add `applinks:hers365.vercel.app` and `webcredentials:hers365.vercel.app`
5. Run on a connected device or simulator to confirm the app boots, the splash shows, and the dashboard loads.

---

## 7. App Store Connect — create the app record

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**.
2. Platform: **iOS**. Name: `HERS365`. Primary language: English (US).
3. Bundle ID: `com.hers365.app`. SKU: `hers365-ios-001` (anything unique).
4. User Access: **Full Access**.

---

## 8. Screenshot requirements

Apple requires the largest device size you support; older sizes are optional but recommended.

- **6.7"** (iPhone 15 Pro Max / 14 Pro Max): **1290 × 2796**
- **6.5"** (iPhone 11 Pro Max / XS Max): **1242 × 2688**
- **5.5"** (iPhone 8 Plus): **1242 × 2208** — optional, only required for backwards compatibility
- **iPad Pro 12.9"** (6th gen): **2048 × 2732** — required only if iPad is supported

Capture 3-10 screenshots per size in Xcode's iOS Simulator (`File → Export As Image`). Recommended frames: hero / landing, profile, feed, recruiting board, analytics.

---

## 9. Replace TEAMID in the Universal Links file

In `client/public/.well-known/apple-app-site-association`, replace the literal string `TEAMID` (appears twice) with your real **Team ID** from step 2.

```bash
sed -i '' "s/TEAMID/<your-team-id>/g" client/public/.well-known/apple-app-site-association
```

Rebuild and redeploy the web app to Vercel so the file is served at `https://hers365.vercel.app/.well-known/apple-app-site-association` with `Content-Type: application/json` (the `vercel.json` `headers` rule in this PR already pins the content type).

Verify after deploy:

```bash
curl -sI https://hers365.vercel.app/.well-known/apple-app-site-association | grep -i content-type
curl -s https://hers365.vercel.app/.well-known/apple-app-site-association | head -20
```

You should see `Content-Type: application/json` and the JSON body with your real Team ID.

---

## 10. App Store metadata

- **Name**: `HERS365`
- **Subtitle**: `Get Seen. Get Recruited.`
- **Category (primary)**: Sports
- **Category (secondary)**: Social Networking
- **Description**: Use the marketing copy from `client/src/pages/LandingPage.tsx` as a starting point — keep it under 4000 characters.
- **Keywords**: `flag football, girls football, recruiting, athlete, ranking, scouting, sports, high school, college, NIL`
- **Promotional text** (170 chars): Pulled from your latest campaign.
- **What's new in this version**: First release notes.

---

## 11. Age rating

In App Store Connect → **App Information** → **Age Rating** → **Edit**:

- Set to **12+**.
- Reasons: **Infrequent/Mild** for **Cartoon or Fantasy Violence** (none), **Social Networking**, **User Generated Content**.

This rating matches the platform: athletes register from age 13+ with parent gating.

---

## 12. Privacy policy, support, marketing URLs

In App Store Connect → **App Privacy** and **App Information**:

- **Privacy Policy URL**: `https://hers365.vercel.app/privacy`
- **Support URL**: `https://hers365.vercel.app/help`
- **Marketing URL**: `https://hers365.vercel.app`

In **App Privacy → Data Collection**, declare:

- Email Address — Linked to user, used for App Functionality, not used for tracking.
- Name — Linked to user, App Functionality.
- Photos or Videos — Linked to user, App Functionality.
- User ID — Linked to user, App Functionality.

These four match the entries in `ios/App/App/PrivacyInfo.xcprivacy` shipped in this PR.

---

## 13. Switch APNs to production

Before the first **App Store** submission (not before TestFlight):

1. Open `client/ios/App/App/App.entitlements`.
2. Change:
   ```xml
   <key>aps-environment</key>
   <string>development</string>
   ```
   to:
   ```xml
   <key>aps-environment</key>
   <string>production</string>
   ```
3. Commit, rebuild, and regenerate the Distribution provisioning profile in the Developer portal so it picks up the new entitlement.

(TestFlight builds work with `development`. App Store review needs `production`.)

---

## 14. Archive and upload

In Xcode:

1. Select **Any iOS Device (arm64)** in the run target dropdown.
2. **Product → Archive**. Xcode builds a release archive.
3. The Organizer window opens automatically when the archive completes.
4. Click **Distribute App** → **App Store Connect** → **Upload**.
5. Walk through the signing/options screens — Xcode auto-fills with the distribution profile.
6. Upload takes 5-15 minutes. You'll get a confirmation email.

---

## 15. Submit for review

In App Store Connect → your app → **App Store** tab → **iOS App** version:

1. Pick the build you just uploaded.
2. Fill in all required metadata (steps 8, 10, 11, 12).
3. Answer the **Export Compliance** questions: select **No** because `ITSAppUsesNonExemptEncryption=false` is already set in `Info.plist`.
4. Answer the **Sign In** questions: confirm Sign In with Apple is offered (or get an exemption).
5. Click **Add for Review** → **Submit for Review**.

---

## 16. Review timeline

- Typical first submission: **24-48 hours** in 2026.
- Expect at least one reviewer question for a new app in **Social Networking** — usually about UGC moderation.
- Be ready to demo the moderation pipeline (`server/lib/moderation.ts`) and the parent gating flow.
- Common rejection reasons to pre-empt:
  - **3.1.1 IAP** — already handled: the Subscription page routes to Safari on iOS instead of Stripe.
  - **5.1.1 Privacy** — `PrivacyInfo.xcprivacy` is shipped and the Info.plist usage strings are present.
  - **2.5.13 Push prompts** — push notifications are requested via the explicit `usePushNotifications` hook, not on cold start.

---

## 17. After approval

1. In App Store Connect, set **Release this version** to **Manually release this version** so you control the launch moment.
2. Click **Release this version** when ready.
3. Live on the App Store in 1-4 hours.
4. Re-confirm Universal Links: open Notes on an iPhone, type `https://hers365.vercel.app/feed`, tap. The app should open instead of Safari.
5. Set up App Store Connect TestFlight for ongoing beta builds so internal testers don't go through full review.

---

## Quick command reference (from `client/`)

```bash
npm run mobile:build           # vite build + cap sync — refreshes ios/App/App/public
npm run mobile:sync            # cap sync only (after JS-only changes)
npm run mobile:icons           # regenerate the iOS app icon set from public/logo.png
npm run mobile:ios             # mobile:build then open Xcode
npx tsc --noEmit               # type-check the client before any iOS build
npm run lint                   # ESLint the client
```

---

## What this PR does NOT do

- It does not pay the $99. That's on you.
- It does not push to TestFlight. That requires a paid account + Xcode signing.
- It does not replace `TEAMID` in the AASA file. That's step 9, after enrollment.
- It does not add Sign In with Apple natively. If Apple flags the OAuth-only sign-in, see https://developer.apple.com/sign-in-with-apple/ — the Capacitor plugin is `@capacitor-community/apple-sign-in`.
