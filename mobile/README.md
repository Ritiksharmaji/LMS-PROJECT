# Orbitly mobile

The Orbitly LMS as a React Native CLI app (iOS and Android) for all three roles. It talks straight to the Spring Boot
API with the same Orbitly design as the web app: Sora/Figtree type, coral accent, Phosphor duotone icons, and
Light / Dark / System themes.

| Area | Tabs | Also |
|---|---|---|
| **Learn** (everyone) | Home · Explore · My learning · Schedule · Profile | Course page with enroll/buy and wishlist, course player, video / reading / quiz / assignment lessons, discussions, grades, orders and refunds, certificates, notifications |
| **Teach** (instructors, admins) | Overview · Courses · Grading · Schedule · Profile | Learner roster, grade or return submissions, preview lessons |
| **Admin** (admins) | Analytics · People · Orders · Courses · Profile | Invite people, change roles, suspend, refund orders |

Staff switch area from **Profile**. Course building, quiz editing and uploads stay on the web app.

## Stack

React Native 0.87 (CLI, New Architecture, Hermes) · TypeScript · React Navigation 7 (native stack + bottom tabs) ·
TanStack Query 5 · react-native-keychain (refresh token in the iOS Keychain / Android Keystore) · AsyncStorage
(preferences) · react-native-video (HLS) · react-native-svg + phosphor-react-native.

## Run it

Start the API first (`backend/`), reachable from the phone's network.

```bash
cd mobile
npm install
cd ios && pod install && cd ..          # iOS only
npm start                                # Metro, for debug builds
npm run ios                              # or: npm run android
```

**Server address.** Phones can't reach your computer's `localhost`. `src/config.ts` holds the default API address
(your computer's Wi-Fi IP); you can also change it on the device from the sign-in screen → *Server*.

**On an iPhone.** Plug it in, open `ios/OrbitlyMobile.xcworkspace`, pick your team under *Signing & Capabilities*,
choose the phone and press Run — or from the command line:

```bash
xcodebuild -workspace ios/OrbitlyMobile.xcworkspace -scheme OrbitlyMobile -configuration Release \
  -destination 'id=<device-udid>' -derivedDataPath ios/build -allowProvisioningUpdates DEVELOPMENT_TEAM=<team-id> build
xcrun devicectl device install app --device <device-udid> ios/build/Build/Products/Release-iphoneos/OrbitlyMobile.app
```

The first time, trust the developer on the phone: *Settings → General → VPN & Device Management*. With a free
Apple ID the install lasts 7 days.

## Code

```
src/
  App.tsx                 providers: safe area, theme, React Query, session, navigation
  config.ts               API and web addresses, default organization
  lib/api.ts              fetch client: bearer token, one shared refresh on 401, RFC 9457 errors
  lib/session.tsx         sign in/up/out, restore from Keychain, active area
  lib/types.ts, format.ts shared with the web app (frontend/src/lib)
  theme/                  light and dark palettes from the web tokens, Light / Dark / System
  components/             UI kit (ui.tsx), Phosphor icon registry, Markdown, orbit animations
  navigation/             root stack + area-specific tabs
  screens/                auth, learn, teach, admin, account
```

Checks: `npx tsc --noEmit` and `npm run lint`.
