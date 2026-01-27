> [!WARNING]
> **ARCHIVED DOCUMENT** — This is an implementation guide from early development. The tech stack has changed (now Supabase instead of Convex, Tamagui instead of NativeWind, self-hosted PDS). Some patterns may still be useful but verify against current architecture. Kept for historical reference.

# Monorepo Implementation Guide

> ✅ **STATUS: IMPLEMENTED** (January 2026)
>
> The monorepo migration is complete and working. This document now serves as both a reference and historical record of the implementation.

## Implementation Summary

### What Was Implemented

| Component           | Status          | Notes                                                         |
| ------------------- | --------------- | ------------------------------------------------------------- |
| Turborepo setup     | ✅ Complete     | `turbo.json` with build/dev/lint/typecheck pipelines          |
| pnpm workspaces     | ✅ Complete     | `pnpm-workspace.yaml` configured                              |
| Web app migration   | ✅ Complete     | Moved to `apps/web/` with all functionality                   |
| Mobile app scaffold | ✅ Complete     | Expo app in `apps/mobile/` with NativeWind                    |
| Shared packages     | ✅ Placeholders | `packages/{lib,types,validation,ui}` ready for code migration |
| Convex backend      | ✅ Unchanged    | Stays at root, both apps import via `../../convex/`           |

### Key Deviations from Original Plan

1. **Package Manager**: Using pnpm (not Bun) for React Native compatibility
2. **React Types Override**: Added `pnpm.overrides` for React 18 types (RN ecosystem not ready for React 19 types)
3. **Prettier Ignore**: Mobile app excluded from prettier due to Tailwind v3/v4 plugin conflicts
4. **Scripts**: Replaced Bun-specific `import.meta.dir` with Node.js compatible `fileURLToPath()`

### Current Commands

```bash
pnpm install          # Install all dependencies
pnpm dev:web          # Start Next.js (http://localhost:3000)
pnpm dev:mobile       # Start Expo (http://localhost:8081)
pnpm dev:convex       # Start Convex backend
pnpm typecheck        # TypeScript checks (all packages)
pnpm lint             # ESLint (all packages)
pnpm build:web        # Production build
```

---

> **Related Documentation:**
>
> - [Architecture Decision](./architecture-research-monorepo-vs-single-app.md) — Why we chose this approach
> - [UI Libraries](./cross-platform-ui-libraries.md) — React Native Reusables + NativeWind
> - [CV Architecture](./mobile-cv-video-architecture.md) — Mobile computer vision features

The rest of this document provides the original step-by-step implementation guidance, preserved for reference.

**Note:** NativeWind v4 requires Tailwind CSS 3.4.x (not v4.x) for the mobile app. The web app can remain on Tailwind v4 since they're separate apps with independent configurations.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Step 1: Initialize Turborepo](#step-1-initialize-turborepo)
4. [Step 2: Configure pnpm Workspaces](#step-2-configure-pnpm-workspaces)
5. [Step 3: Move Web App](#step-3-move-web-app)
6. [Step 4: Create Shared Packages](#step-4-create-shared-packages)
7. [Step 5: Create Expo Mobile App](#step-5-create-expo-mobile-app)
8. [Step 6: Configure NativeWind](#step-6-configure-nativewind)
9. [Step 7: Set Up Development Builds](#step-7-set-up-development-builds)
10. [Step 8: CI/CD with EAS Build](#step-8-cicd-with-eas-build)
11. [Common Issues & Solutions](#common-issues--solutions)
12. [Sources](#sources)

---

## Prerequisites

### Required Tools

```bash
# Node.js 20+ (LTS recommended)
node --version  # v20.x or higher

# pnpm (required for monorepo)
npm install -g pnpm
pnpm --version  # v8.x or higher

# Expo CLI
npm install -g expo-cli eas-cli

# Turborepo (will be installed as dev dependency)
```

### Existing Stack Compatibility

Your current stack is fully compatible:

- Next.js 15 ✅
- Convex ✅ (works perfectly in monorepos)
- Clerk ✅ (has React Native SDK)
- Tailwind CSS 4 ✅ (NativeWind compatible)
- TypeScript ✅

---

## Project Structure

### Target Structure

```
battle-stadium/
├── apps/
│   ├── web/                          # Next.js 15 (existing app, moved)
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   ├── components/           # Web-specific components
│   │   │   └── ...
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                       # Expo SDK 54 (new)
│       ├── app/                      # Expo Router pages
│       │   ├── (tabs)/
│       │   ├── _layout.tsx
│       │   └── ...
│       ├── components/               # Mobile-specific components
│       ├── lib/
│       │   ├── cv/                   # Computer vision
│       │   ├── storage/              # Video storage
│       │   └── db/                   # Local SQLite
│       ├── assets/
│       │   └── models/               # TFLite models
│       ├── app.json
│       ├── metro.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── lib/                          # Shared business logic
│   │   ├── src/
│   │   │   ├── tournament/
│   │   │   │   ├── swiss-pairing.ts
│   │   │   │   ├── standings.ts
│   │   │   │   └── index.ts
│   │   │   ├── pokemon/
│   │   │   │   └── team-validation.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── tournament.ts
│   │   │   ├── organization.ts
│   │   │   ├── match-tracking.ts     # CV/video types
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── validation/                   # Shared Zod schemas
│   │   ├── src/
│   │   │   ├── tournament.ts
│   │   │   ├── team.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                           # Shared design tokens
│   │   ├── src/
│   │   │   ├── tokens.ts             # Colors, spacing, etc.
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                       # Shared configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── convex/                           # Convex backend (stays at root)
│   ├── schema.ts
│   ├── tournaments/
│   ├── organizations/
│   ├── recordings/                   # NEW: Video metadata
│   └── ...
│
├── ml/                               # ML training (not in app builds)
│   ├── pokemon-detector/
│   └── status-classifier/
│
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml               # Workspace config
├── package.json                      # Root package.json
└── .npmrc                            # pnpm config
```

---

## Step 1: Initialize Turborepo

### Create turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", ".expo/**"],
      "env": ["NEXT_PUBLIC_CONVEX_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

---

## Step 2: Configure pnpm Workspaces

### Create pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Create .npmrc

```ini
# Required for React Native compatibility
node-linker=hoisted

# Shamefully hoist all packages (needed for some RN libraries)
shamefully-hoist=true

# Auto-install peers
auto-install-peers=true
```

### Update Root package.json

```json
{
  "name": "battle-stadium",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "dev:web": "turbo dev --filter=@battle-stadium/web",
    "dev:mobile": "turbo dev --filter=@battle-stadium/mobile",
    "dev:convex": "convex dev --tail-logs disable"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

---

## Step 3: Move Web App

### Directory Structure

```bash
# Create apps directory
mkdir -p apps/web

# Move web-specific files
mv src apps/web/
mv public apps/web/
mv next.config.ts apps/web/
mv tailwind.config.ts apps/web/
mv postcss.config.mjs apps/web/
mv tsconfig.json apps/web/
```

### apps/web/package.json

```json
{
  "name": "@battle-stadium/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ./",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@battle-stadium/lib": "workspace:*",
    "@battle-stadium/types": "workspace:*",
    "@battle-stadium/validation": "workspace:*",
    "@battle-stadium/ui": "workspace:*",
    "@clerk/nextjs": "^6.36.7",
    "convex": "^1.31.4",
    "next": "^15.5.9",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "zod": "^3.25.76"
    // ... other existing dependencies
  },
  "devDependencies": {
    "@types/react": "^19.2.8",
    "typescript": "^5.9.3",
    "tailwindcss": "^4.1.18"
    // ... other existing devDependencies
  }
}
```

### Update Path Aliases

Update `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/convex/*": ["../../convex/*"],
      "@battle-stadium/lib": ["../../packages/lib/src"],
      "@battle-stadium/types": ["../../packages/types/src"],
      "@battle-stadium/validation": ["../../packages/validation/src"],
      "@battle-stadium/ui": ["../../packages/ui/src"]
    }
  }
}
```

---

## Step 4: Create Shared Packages

### packages/lib/package.json

```json
{
  "name": "@battle-stadium/lib",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tournament": "./src/tournament/index.ts",
    "./pokemon": "./src/pokemon/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

### packages/types/package.json

```json
{
  "name": "@battle-stadium/types",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

### packages/validation/package.json

```json
{
  "name": "@battle-stadium/validation",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

---

## Step 5: Create Expo Mobile App

### Initialize Expo App

```bash
cd apps
npx create-expo-app mobile --template tabs
cd mobile
```

### apps/mobile/package.json

```json
{
  "name": "@battle-stadium/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:dev": "eas build --profile development",
    "build:preview": "eas build --profile preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@battle-stadium/lib": "workspace:*",
    "@battle-stadium/types": "workspace:*",
    "@battle-stadium/validation": "workspace:*",
    "@battle-stadium/ui": "workspace:*",

    "expo": "~54.0.0",
    "expo-router": "~4.0.0",
    "expo-dev-client": "~5.0.0",
    "expo-file-system": "~18.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-video": "~2.0.0",

    "react": "19.0.0",
    "react-native": "0.81.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-safe-area-context": "~5.6.0",

    "react-native-vision-camera": "^4.0.0",
    "react-native-fast-tflite": "^2.0.0",
    "react-native-fast-opencv": "^1.0.0",

    "@clerk/clerk-expo": "^2.0.0",
    "convex": "^1.31.4",

    "nativewind": "^4.2.1",
    "drizzle-orm": "^0.35.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/react": "~19.0.0",
    "typescript": "^5.9.3",
    "tailwindcss": "^3.4.17",
    "drizzle-kit": "^0.30.0"
  }
}
```

### apps/mobile/app.json

```json
{
  "expo": {
    "name": "BattleStadium",
    "slug": "battle-stadium",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "battlestadium",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.battlestadium.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Record Pokemon VGC matches",
        "NSMicrophoneUsageDescription": "Record match audio",
        "NSPhotoLibraryAddUsageDescription": "Save recordings to Photos"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.battlestadium.app",
      "permissions": ["CAMERA", "RECORD_AUDIO", "WRITE_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "BattleStadium needs camera access to record your matches",
          "enableMicrophonePermission": true,
          "microphonePermissionText": "BattleStadium needs microphone access to record match audio"
        }
      ],
      [
        "expo-sqlite",
        {
          "enableFTS": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## Step 6: Configure NativeWind

### apps/mobile/tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match web app colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [],
};
```

### apps/mobile/babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

### apps/mobile/metro.config.js

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Configure package resolution for monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Ensure convex directory is included
config.resolver.extraNodeModules = {
  "@convex": path.resolve(monorepoRoot, "convex"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
```

### apps/mobile/global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

### apps/mobile/nativewind-env.d.ts

```typescript
/// <reference types="nativewind/types" />
```

---

## Step 7: Set Up Development Builds

### Why Development Builds?

VisionCamera and other native modules require a **development build** (not Expo Go).

### Install expo-dev-client

```bash
cd apps/mobile
npx expo install expo-dev-client
```

### Create eas.json

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### Build Development Client

```bash
# For iOS simulator
eas build --profile development --platform ios

# For Android emulator
eas build --profile development --platform android

# For physical devices
eas build --profile development --platform all
```

### Run with Development Client

```bash
# Start dev server
npx expo start --dev-client

# Or with Turborepo from root
pnpm dev:mobile
```

---

## Step 8: CI/CD with EAS Build

### GitHub Actions Workflow

Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build

on:
  push:
    branches: [main]
    paths:
      - "apps/mobile/**"
      - "packages/**"
      - "convex/**"
  pull_request:
    branches: [main]
    paths:
      - "apps/mobile/**"
      - "packages/**"
      - "convex/**"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build (Preview)
        if: github.event_name == 'pull_request'
        run: |
          cd apps/mobile
          eas build --platform all --profile preview --non-interactive --no-wait

      - name: Build (Production)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: |
          cd apps/mobile
          eas build --platform all --profile production --non-interactive --no-wait
```

### Required Secrets

Set these in your GitHub repository settings:

- `EXPO_TOKEN`: Get from https://expo.dev/accounts/[username]/settings/access-tokens

---

## Common Issues & Solutions

### Issue: Metro can't find monorepo packages

**Solution:** Ensure `metro.config.js` includes:

```javascript
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
```

### Issue: NativeWind styles not applying (Expo SDK 54)

**Solution:** Use specific versions:

```json
{
  "nativewind": "^4.2.1",
  "react-native-reanimated": "~4.1.1",
  "tailwindcss": "^3.4.17"
}
```

Don't use Tailwind v4.x with NativeWind v4. NativeWind v5 (preview) uses Tailwind v4.

### Issue: React Native duplicate versions

**Solution:** Add to root `.npmrc`:

```ini
node-linker=hoisted
shamefully-hoist=true
```

### Issue: Convex imports not working in Expo

**Solution:** Convex works at the root, not in apps. Import via path alias:

```typescript
// In apps/mobile
import { api } from "@/convex/_generated/api";
```

Configure in `metro.config.js`:

```javascript
config.resolver.extraNodeModules = {
  "@convex": path.resolve(monorepoRoot, "convex"),
};
```

### Issue: VisionCamera not working in Expo Go

**Expected behavior.** VisionCamera requires a development build:

```bash
eas build --profile development --platform ios
```

---

## Sources

### Turborepo

- [Turborepo Documentation](https://turborepo.dev/docs)
- [Turborepo + Next.js Guide](https://turborepo.dev/docs/guides/frameworks/nextjs)
- [2025 Monorepo Guide](https://medium.com/@TheblogStacker/2025-monorepo-that-actually-scales-turborepo-pnpm-for-next-js-ab4492fbde2a)

### Expo Monorepos

- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example)
- [Universal React Monorepo](https://www.gurselcakar.com/monorepo)

### NativeWind

- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation)
- [NativeWind + Expo SDK 54 Fix](https://medium.com/@matthitachi/nativewind-styling-not-working-with-expo-sdk-54-54488c07c20d)
- [Expo Tailwind Guide](https://docs.expo.dev/guides/tailwind/)

### EAS Build

- [Trigger builds from CI](https://docs.expo.dev/build/building-on-ci/)
- [Expo GitHub Action](https://github.com/expo/expo-github-action)
- [EAS Build Profiles](https://docs.expo.dev/build/eas-json/)

### Convex

- [Convex Monorepo Template](https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo)
- [Convex + React Native](https://docs.convex.dev/client/react)

---

_Last updated: January 2026_
