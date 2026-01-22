# Mobile App: Computer Vision & Video Recording Architecture

> Research conducted January 2026 for BattleStadium mobile app with CV match tracking

> **📌 Architecture Context:**
>
> This document describes features built in the `apps/mobile/` folder of the [Next.js + Expo monorepo](./architecture-research-monorepo-vs-single-app.md). See also:
>
> - [Monorepo Implementation Guide](./monorepo-implementation-guide.md) — Project setup
> - [UI Libraries](./cross-platform-ui-libraries.md) — React Native Reusables + NativeWind

This document covers the technical architecture for the mobile app's computer vision capabilities, video recording, and local storage systems for tracking Pokemon VGC matches.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Core Technology Stack](#core-technology-stack)
3. [Computer Vision Architecture](#computer-vision-architecture)
4. [Video Recording System](#video-recording-system)
5. [Local Storage & Video Library](#local-storage--video-library)
6. [VGC Match Tracking Requirements](#vgc-match-tracking-requirements)
7. [ML Model Strategy](#ml-model-strategy)
8. [Project Structure Updates](#project-structure-updates)
9. [Technical Considerations](#technical-considerations)
10. [Sources](#sources)

---

## Feature Overview

### Mobile App Capabilities

The BattleStadium mobile app will provide:

1. **Full Feature Parity with Web**
   - Tournament browsing, registration, check-in
   - Match reporting, standings, brackets
   - Team management, profile settings
   - Real-time updates via Convex

2. **Computer Vision Match Tracking**
   - Point camera at Nintendo Switch/TV screen
   - Recognize Pokemon, HP bars, status conditions
   - Track game state changes in real-time
   - Detect match start/end automatically

3. **Video Recording & Library**
   - Record matches with CV overlay data
   - Store locally (not in Photos app)
   - Organized by tournament, date, opponent
   - Export to Photos app on demand
   - Sync metadata to Convex (optional)

---

## Core Technology Stack

### Required Libraries

| Purpose            | Library                               | Notes                                      |
| ------------------ | ------------------------------------- | ------------------------------------------ |
| **Camera + CV**    | react-native-vision-camera            | Industry standard, 60fps, Frame Processors |
| **ML Inference**   | react-native-fast-tflite              | GPU-accelerated TensorFlow Lite            |
| **OpenCV**         | react-native-fast-opencv              | JSI-based, works with VisionCamera         |
| **OCR**            | react-native-vision-camera-ocr-plus   | ML Kit Text Recognition                    |
| **Video Playback** | expo-video                            | Built-in caching, controls                 |
| **File System**    | expo-file-system                      | Document/cache directories                 |
| **Local DB**       | expo-sqlite + Drizzle ORM             | Video metadata, settings                   |
| **Camera Roll**    | @react-native-camera-roll/camera-roll | Export to Photos                           |

### Why These Choices

```
┌─────────────────────────────────────────────────────────────────┐
│              VISION CAMERA ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VisionCamera (Core)                                            │
│       │                                                         │
│       ├── Frame Processors (JSI) ───┬── Fast TFLite (ML)       │
│       │                             ├── Fast OpenCV (CV)        │
│       │                             └── OCR Plus (Text)         │
│       │                                                         │
│       └── Video Recording ──────────── File System (Storage)    │
│                                               │                 │
│                                               └── SQLite (Meta) │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Advantage:** VisionCamera's Frame Processor plugin system allows you to chain multiple CV/ML operations on each frame with near-zero overhead via JSI.

---

## Computer Vision Architecture

### VisionCamera + Frame Processors

VisionCamera provides GPU-based buffers directly to JavaScript via JSI, enabling real-time processing:

```typescript
// Example: Frame processor with multiple plugins
import { useFrameProcessor } from 'react-native-vision-camera';
import { detectPokemon } from './plugins/pokemon-detector';
import { readHPBars } from './plugins/hp-reader';
import { recognizeText } from './plugins/ocr';

function MatchRecorder() {
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    // Run Pokemon detection (custom TFLite model)
    const pokemon = detectPokemon(frame);

    // Read HP bar values (OpenCV pixel analysis)
    const hpValues = readHPBars(frame, pokemon.positions);

    // OCR for player names, timer, etc.
    const text = recognizeText(frame, ['playerName', 'timer']);

    // Update game state
    updateMatchState({ pokemon, hpValues, text });
  }, []);

  return (
    <Camera
      device={device}
      isActive={true}
      video={true}
      audio={true}
      frameProcessor={frameProcessor}
    />
  );
}
```

### Processing Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRAME PROCESSING PIPELINE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Camera Frame (GPU Buffer)                                        │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                             │
│  │ Pre-processing  │  Resize, color convert (Fast OpenCV)        │
│  └────────┬────────┘                                             │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Pokemon Detect  │  │   HP Bar Read   │  │   OCR/Text      │  │
│  │ (TFLite YOLO)   │  │   (OpenCV)      │  │   (ML Kit)      │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                  │
│                                ▼                                  │
│                    ┌─────────────────┐                           │
│                    │  Game State     │                           │
│                    │  Aggregator     │                           │
│                    └────────┬────────┘                           │
│                             │                                     │
│           ┌─────────────────┼─────────────────┐                  │
│           ▼                 ▼                 ▼                  │
│    ┌───────────┐     ┌───────────┐     ┌───────────┐            │
│    │ UI Update │     │ Video     │     │ Event     │            │
│    │ (Overlay) │     │ Metadata  │     │ Timeline  │            │
│    └───────────┘     └───────────┘     └───────────┘            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Available Frame Processor Plugins

| Plugin                          | Purpose             | Performance          |
| ------------------------------- | ------------------- | -------------------- |
| **react-native-fast-tflite**    | Custom ML models    | 3-5x faster than CPU |
| **react-native-fast-opencv**    | Image processing    | Real-time at 60fps   |
| **vision-camera-ocr-plus**      | Text recognition    | ML Kit powered       |
| **vision-camera-resize-plugin** | Frame preprocessing | SIMD accelerated     |

---

## Video Recording System

### Recording with VisionCamera

```typescript
import { Camera, useCameraDevice } from "react-native-vision-camera";
import * as FileSystem from "expo-file-system";

const VIDEOS_DIR = FileSystem.documentDirectory + "match-recordings/";

async function startRecording(cameraRef: React.RefObject<Camera>) {
  // Ensure directory exists
  await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });

  // Generate unique filename
  const filename = `match_${Date.now()}.mp4`;
  const path = VIDEOS_DIR + filename;

  cameraRef.current?.startRecording({
    fileType: "mp4",
    videoCodec: "h265", // Better compression
    videoBitRate: "high",
    onRecordingFinished: async (video) => {
      // Video saved to temp, move to permanent storage
      await FileSystem.moveAsync({
        from: video.path,
        to: path,
      });

      // Save metadata to SQLite
      await saveVideoMetadata({
        path,
        duration: video.duration,
        timestamp: Date.now(),
        // ... tournament info, opponent, etc.
      });
    },
    onRecordingError: (error) => {
      console.error("Recording error:", error);
    },
  });
}
```

### Video Codec Considerations

| Codec            | Pros                              | Cons                 |
| ---------------- | --------------------------------- | -------------------- |
| **H.265 (HEVC)** | 50% smaller files, better quality | Older device support |
| **H.264**        | Universal support                 | Larger files         |

**Recommendation:** Use H.265 with H.264 fallback for older devices.

### Storage Locations

```typescript
// Expo File System directories
const directories = {
  // Permanent storage (survives app updates, user-deletable)
  documents: FileSystem.documentDirectory,

  // Temporary (can be cleared by OS)
  cache: FileSystem.cacheDirectory,

  // App bundle (read-only)
  bundle: FileSystem.bundleDirectory,
};

// Recommended structure for match recordings
const STORAGE_STRUCTURE = `
${FileSystem.documentDirectory}
└── battle-stadium/
    ├── recordings/
    │   ├── 2026/
    │   │   └── 01/
    │   │       ├── match_1705123456789.mp4
    │   │       └── match_1705123456789.json  (metadata)
    │   └── thumbnails/
    │       └── match_1705123456789.jpg
    └── exports/
        └── (temp files for sharing)
`;
```

---

## Local Storage & Video Library

### Database Schema (Drizzle ORM + SQLite)

```typescript
// packages/mobile-db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const matchRecordings = sqliteTable("match_recordings", {
  id: text("id").primaryKey(), // UUID
  filePath: text("file_path").notNull(),
  thumbnailPath: text("thumbnail_path"),

  // Match info
  tournamentId: text("tournament_id"), // Convex ID reference
  tournamentName: text("tournament_name"),
  opponentName: text("opponent_name"),
  result: text("result"), // 'win' | 'loss' | 'tie'
  gameCount: integer("game_count"),

  // Video metadata
  duration: real("duration"), // seconds
  fileSize: integer("file_size"), // bytes
  codec: text("codec"),
  resolution: text("resolution"),

  // Timestamps
  recordedAt: integer("recorded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),

  // Sync status
  syncedToCloud: integer("synced_to_cloud", { mode: "boolean" }).default(false),
  convexFileId: text("convex_file_id"),
});

export const matchEvents = sqliteTable("match_events", {
  id: text("id").primaryKey(),
  recordingId: text("recording_id").references(() => matchRecordings.id),

  // Event data
  eventType: text("event_type"), // 'ko', 'switch', 'tera', 'match_start', 'match_end'
  timestamp: real("timestamp"), // Video timestamp in seconds

  // Pokemon involved
  pokemon1: text("pokemon_1"),
  pokemon2: text("pokemon_2"),

  // Additional data (JSON)
  data: text("data"), // { hp: 50, damage: 30, move: 'Earthquake' }
});

export const userSettings = sqliteTable("user_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
```

### Video Library UI Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      VIDEO LIBRARY SCREEN                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Filter: [All] [Wins] [Losses] | Sort: [Date ▼]         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ ┌──────────────────┐ │  │ ┌──────────────────┐ │            │
│  │ │   [Thumbnail]    │ │  │ │   [Thumbnail]    │ │            │
│  │ │    2:34 ▶        │ │  │ │    3:12 ▶        │ │            │
│  │ └──────────────────┘ │  │ └──────────────────┘ │            │
│  │ vs. TrainerMike      │  │ vs. ChampionSara     │            │
│  │ Regional Cup R3      │  │ Regional Cup R4      │            │
│  │ W 2-1 • Jan 13       │  │ L 1-2 • Jan 13       │            │
│  │ [Share] [Delete]     │  │ [Share] [Delete]     │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                  │
│  Storage Used: 2.3 GB / 10 GB                                   │
│  [Manage Storage]                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## VGC Match Tracking Requirements

### What Needs to Be Detected

| Element             | Detection Method                    | Difficulty |
| ------------------- | ----------------------------------- | ---------- |
| **Pokemon sprites** | Object detection (YOLO)             | Medium     |
| **HP bars**         | Color segmentation + pixel analysis | Easy       |
| **Status icons**    | Template matching or classification | Easy       |
| **Tera type**       | Classification model                | Medium     |
| **Player names**    | OCR (ML Kit)                        | Easy       |
| **Turn timer**      | OCR (ML Kit)                        | Easy       |
| **Move names**      | OCR (ML Kit)                        | Medium     |
| **Damage numbers**  | OCR (ML Kit)                        | Easy       |

### VGC Battle Screen Regions

```
┌─────────────────────────────────────────────────────────────────┐
│                    VGC BATTLE SCREEN LAYOUT                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Opponent Name]                    [Turn Timer: 0:45]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────┐                    ┌───────────────┐        │
│  │ Opponent      │                    │ Opponent      │        │
│  │ Pokemon 1     │                    │ Pokemon 2     │        │
│  │ ████████ HP   │                    │ ██████░░ HP   │        │
│  │ [Status]      │                    │ [Status]      │        │
│  └───────────────┘                    └───────────────┘        │
│                                                                  │
│                    [ Battle Animation Area ]                     │
│                                                                  │
│  ┌───────────────┐                    ┌───────────────┐        │
│  │ Your          │                    │ Your          │        │
│  │ Pokemon 1     │                    │ Pokemon 2     │        │
│  │ ██████████ HP │                    │ ████████░░ HP │        │
│  │ [Tera: Fire]  │                    │ [Status]      │        │
│  └───────────────┘                    └───────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Your Name]                        [Back Pokemon: 2]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Match State Data Structure

```typescript
interface MatchState {
  // Match metadata
  gameNumber: number; // 1, 2, or 3
  turnNumber: number;
  turnTimer: number; // seconds remaining

  // Players
  player: PlayerState;
  opponent: PlayerState;

  // Match status
  status: "pre-battle" | "team-preview" | "in-battle" | "post-battle";
}

interface PlayerState {
  name: string;
  activePokemon: PokemonState[]; // Max 2 in doubles
  benchPokemon: number; // Count remaining
}

interface PokemonState {
  species: string; // e.g., "Koraidon"
  hp: number; // 0-100 percentage
  status: StatusCondition | null;
  teraType: Type | null;
  teraActive: boolean;
  position: "left" | "right";
}

type StatusCondition = "burn" | "poison" | "paralysis" | "sleep" | "freeze";
type Type = "normal" | "fire" | "water" | /* ... */ "fairy";
```

### Event Detection

```typescript
interface MatchEvent {
  type: EventType;
  timestamp: number; // Video timestamp
  gameNumber: number;
  turnNumber: number;
  data: EventData;
}

type EventType =
  | "match_start"
  | "match_end"
  | "game_start"
  | "game_end"
  | "turn_start"
  | "pokemon_faint"
  | "pokemon_switch"
  | "tera_activate"
  | "status_inflict"
  | "damage_dealt";

// Example: KO event
const koEvent: MatchEvent = {
  type: "pokemon_faint",
  timestamp: 45.3,
  gameNumber: 1,
  turnNumber: 5,
  data: {
    pokemon: "Koraidon",
    owner: "opponent",
    cause: "Earthquake", // If detected
  },
};
```

---

## ML Model Strategy

### Custom Model Requirements

You'll need to train custom models for VGC-specific detection:

#### 1. Pokemon Sprite Detector

**Purpose:** Identify which Pokemon are on screen

**Approach:**

- Train YOLOv8 Nano/Small on Pokemon sprites
- Classes: All legal VGC Pokemon (100-200 species)
- Training data: Screenshots from Scarlet/Violet battles

**Training Pipeline:**

```
Screenshots → Roboflow Annotation → YOLOv8 Training → TFLite Export → Mobile
```

#### 2. HP Bar Reader

**Purpose:** Determine HP percentage

**Approach:**

- Use OpenCV color segmentation (HP bar is green/yellow/red)
- Calculate percentage based on bar fill
- No ML needed, pure image processing

```typescript
function readHPBar(frame: Frame, region: Rect): number {
  "worklet";

  // Crop to HP bar region
  const hpRegion = cropFrame(frame, region);

  // Convert to HSV for color detection
  const hsv = cvtColor(hpRegion, COLOR_BGR2HSV);

  // Mask green/yellow/red pixels (HP bar colors)
  const mask = inRange(hsv, HP_BAR_LOWER, HP_BAR_UPPER);

  // Calculate fill percentage
  const filled = countNonZero(mask);
  const total = region.width;

  return (filled / total) * 100;
}
```

#### 3. Status/Tera Classifier

**Purpose:** Detect status conditions and Tera types

**Approach:**

- Small CNN classifier
- Classes: Burn, Poison, Paralysis, Sleep, Freeze, None
- Plus 18 Tera types

### Model Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODEL DEPLOYMENT FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Development                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Roboflow   │ →  │  Training   │ →  │  Validate   │         │
│  │  Annotate   │    │  (YOLOv8)   │    │  (mAP > 85) │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                              │                   │
│                                              ▼                   │
│  Export                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  TFLite     │ →  │  Quantize   │ →  │  Test on    │         │
│  │  Export     │    │  (INT8)     │    │  Device     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                              │                   │
│                                              ▼                   │
│  Deployment                                                      │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │  Bundle in  │ or │  OTA Model  │  (Update without app store)│
│  │  App        │    │  Updates    │                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Model Sizes & Performance

| Model                | Size  | Inference Time | Use Case          |
| -------------------- | ----- | -------------- | ----------------- |
| **YOLOv8 Nano**      | ~6MB  | ~15ms          | Pokemon detection |
| **YOLOv8 Small**     | ~22MB | ~30ms          | Higher accuracy   |
| **MobileNetV3**      | ~5MB  | ~10ms          | Classification    |
| **Custom HP Reader** | N/A   | ~5ms           | OpenCV only       |

**Target:** 30+ fps overall pipeline on iPhone 12+/Pixel 6+

---

## Project Structure Updates

### Updated Monorepo Structure

```
battle-stadium/
├── apps/
│   ├── web/                          # Next.js (unchanged)
│   │
│   └── mobile/                       # Expo app
│       ├── app/                      # Expo Router
│       │   ├── (tabs)/
│       │   │   ├── index.tsx         # Dashboard
│       │   │   ├── tournaments.tsx   # Tournament list
│       │   │   ├── recordings.tsx    # Video library
│       │   │   └── profile.tsx       # Profile
│       │   │
│       │   ├── record/
│       │   │   ├── index.tsx         # Recording screen
│       │   │   └── preview.tsx       # Post-recording review
│       │   │
│       │   └── recordings/
│       │       └── [id].tsx          # Single recording view
│       │
│       ├── components/
│       │   ├── camera/
│       │   │   ├── MatchCamera.tsx   # VisionCamera wrapper
│       │   │   ├── CVOverlay.tsx     # AR-style overlay
│       │   │   └── RecordingControls.tsx
│       │   │
│       │   └── library/
│       │       ├── VideoCard.tsx
│       │       ├── VideoPlayer.tsx
│       │       └── StorageManager.tsx
│       │
│       ├── lib/
│       │   ├── cv/
│       │   │   ├── frame-processors.ts
│       │   │   ├── pokemon-detector.ts
│       │   │   ├── hp-reader.ts
│       │   │   └── ocr.ts
│       │   │
│       │   ├── storage/
│       │   │   ├── video-manager.ts
│       │   │   └── file-utils.ts
│       │   │
│       │   └── db/
│       │       ├── schema.ts         # Drizzle schema
│       │       ├── client.ts         # SQLite client
│       │       └── queries.ts        # Common queries
│       │
│       ├── assets/
│       │   └── models/
│       │       ├── pokemon-detector.tflite
│       │       ├── status-classifier.tflite
│       │       └── tera-classifier.tflite
│       │
│       ├── app.json                  # Expo config
│       └── package.json
│
├── packages/
│   ├── ui/                           # Shared design tokens
│   ├── lib/                          # Shared business logic
│   ├── types/                        # Shared types
│   │   └── match-tracking.ts         # MatchState, MatchEvent types
│   └── validation/                   # Shared Zod schemas
│
├── convex/                           # Shared backend
│   ├── recordings/                   # NEW: Recording metadata
│   │   ├── queries.ts
│   │   └── mutations.ts
│   └── ...
│
├── ml/                               # NEW: ML training (separate from app)
│   ├── pokemon-detector/
│   │   ├── dataset/                  # Training images
│   │   ├── train.py
│   │   └── export.py
│   │
│   └── status-classifier/
│       ├── dataset/
│       ├── train.py
│       └── export.py
│
└── turbo.json
```

### Mobile Package Dependencies

```json
// apps/mobile/package.json
{
  "dependencies": {
    // Core
    "expo": "~54.0.0",
    "react": "19.0.0",
    "react-native": "0.81.0",

    // Camera & CV
    "react-native-vision-camera": "^4.0.0",
    "react-native-fast-tflite": "^2.0.0",
    "react-native-fast-opencv": "^1.0.0",
    "react-native-vision-camera-ocr-plus": "^1.0.0",
    "vision-camera-resize-plugin": "^3.0.0",

    // Video
    "expo-video": "~2.0.0",
    "@react-native-camera-roll/camera-roll": "^7.0.0",

    // Storage
    "expo-file-system": "~18.0.0",
    "expo-sqlite": "~15.0.0",
    "drizzle-orm": "^0.35.0",

    // Convex (shared with web)
    "convex": "^1.31.4",

    // Auth
    "@clerk/clerk-expo": "^2.0.0",

    // UI (React Native Reusables + NativeWind)
    "nativewind": "^4.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0"
  }
}
```

---

## Technical Considerations

### Expo Development Build Required

VisionCamera and other native modules require a development build (not Expo Go):

```bash
# Install dev client
npx expo install expo-dev-client

# Create development build
npx expo prebuild
npx expo run:ios  # or run:android
```

### Performance Optimization

1. **Frame Rate Management**
   - CV processing: 15-30 fps (sufficient for game tracking)
   - Video recording: 30 fps
   - Don't process every frame—skip frames under load

2. **Memory Management**
   - Release frames after processing
   - Use frame pools for buffer reuse
   - Monitor memory pressure

3. **Battery Optimization**
   - Reduce processing when battery is low
   - Option to record without CV analysis
   - Background recording limits

### Privacy & Permissions

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "BattleStadium needs camera access to record your matches",
          "enableMicrophonePermission": true,
          "microphonePermissionText": "BattleStadium needs microphone access to record match audio"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Record Pokemon VGC matches",
        "NSMicrophoneUsageDescription": "Record match audio",
        "NSPhotoLibraryAddUsageDescription": "Save recordings to Photos"
      }
    }
  }
}
```

### Existing App Reference: VGC Helper

VGC Helper (vgchelper.com) has implemented team scanning from Switch screens. While they don't publish technical details, they demonstrate that:

- Camera-based Pokemon recognition is feasible
- Real-time processing on mobile is achievable
- The feature has user demand

---

## Development Phases

### Phase 1: Basic Recording

- VisionCamera integration
- Video recording to local storage
- SQLite metadata storage
- Basic video library UI

### Phase 2: CV Foundation

- Frame processor setup
- HP bar detection (OpenCV)
- OCR for player names/timer
- Basic overlay UI

### Phase 3: Pokemon Detection

- Train Pokemon detection model
- Integrate with VisionCamera
- Match state tracking
- Event timeline generation

### Phase 4: Polish & Sync

- Cloud sync for metadata
- Export/sharing features
- Match analysis views
- Tournament integration

---

## Sources

### VisionCamera & Frame Processors

- [VisionCamera Documentation](https://react-native-vision-camera.com/docs/guides)
- [Frame Processors Guide](https://react-native-vision-camera.com/docs/guides/frame-processors)
- [Recording Videos](https://react-native-vision-camera.com/docs/guides/recording-videos)
- [Community Frame Processor Plugins](https://react-native-vision-camera.com/docs/guides/frame-processor-plugins-community)

### ML/TensorFlow Lite

- [react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite)
- [React Native Fast TFLite Guide 2025](https://javascript.plainenglish.io/react-native-fast-tflite-on-device-machine-learning-guide-2025-906b1a8181b1)
- [TensorFlow Lite GPU in React Native](https://mrousavy.com/blog/Reinventing-Camera-Processing)
- [Pose Detection with VisionCamera + TFLite](https://mrousavy.com/blog/VisionCamera-Pose-Detection-TFLite)

### OpenCV

- [React Native Fast OpenCV](https://lukaszkurantdev.github.io/react-native-fast-opencv/)
- [FastOpenCV with VisionCamera](https://medium.com/@lukasz.kurant/fastopencv-how-to-easily-use-opencv-in-react-native-also-with-visioncamera-in-2024-1c96d918b6e8)
- [OpenCV in React Native 2025](https://brainhub.eu/library/opencv-react-native-image-processing)

### OCR

- [vision-camera-ocr-plus](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus)
- [expo-ocr](https://github.com/barthap/expo-ocr)
- [react-native-mlkit-ocr](https://github.com/agoldis/react-native-mlkit-ocr)

### Storage & Database

- [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Drizzle ORM with Expo SQLite](https://blog.logrocket.com/drizzle-react-native-expo-sqlite/)
- [Local-first Architecture with Expo](https://docs.expo.dev/guides/local-first/)
- [React Native Database Options 2025](https://www.powersync.com/blog/react-native-local-database-options)

### Model Training & Deployment

- [Roboflow iOS SDK](https://docs.roboflow.com/developer/ios-sdk/using-the-ios-sdk)
- [Custom Mobile Object Detection Training](https://blog.roboflow.com/how-to-train-a-custom-mobile-object-detection-model/)
- [YOLOv8 Pokemon Object Detection](https://github.com/vovod/yolov8-pokemon-object-detection)

### Pokemon References

- [VGC Helper](https://vgchelper.com/) - Existing app with team scanning
- [PokéAPI](https://pokeapi.co/) - Pokemon data API
- [Game UI Database - Pokemon SV](https://www.gameuidatabase.com/gameData.php?id=1579) - UI reference screenshots

### Expo & Native Modules

- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Add Custom Native Code](https://docs.expo.dev/workflow/customizing/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)

---

_Last updated: January 2026_
