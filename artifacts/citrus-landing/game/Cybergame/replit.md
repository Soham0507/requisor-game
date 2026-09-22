# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### GestureSec Runner (`artifacts/gesturesec-runner`)
- **Type**: React + Vite web app
- **Preview path**: `/`
- **Description**: Cybersecurity-themed endless runner game. A character auto-runs and cyber attacks appear randomly. Players must select the correct defense using 1–4 finger webcam gestures (via MediaPipe Hands) or by clicking.
- **Key features**:
  - MediaPipe Hands gesture detection (1–4 fingers via webcam)
  - 1-second gesture confirmation with progress bar
  - 5 cyber attack types: Phishing, Malware, SQL Injection, Brute Force, Data Exfiltration
  - Running character animation with Framer Motion
  - Sound effects for correct/wrong answers (Web Audio API)
  - Difficulty scaling (speed increases over time)
  - Score system with rank badges
  - Start screen, game screen, game over screen
- **Components**: `StartScreen`, `GameScreen`, `AttackCard`, `OptionsPanel`, `CameraFeed`, `RunningCharacter`, `GameOver`
- **Hooks**: `useGestureDetection` — handles MediaPipe Hands initialization, finger counting, confirmation timer
- **Dependencies**: `@mediapipe/hands`, `@mediapipe/camera_utils`, `framer-motion`
