# LivePlay Companion Module — Implementation Status

## Overview

This document tracks the implementation status of the LivePlay Companion module.

## Architecture

### File Structure

```
src/
├── main.ts              # Orchestrator (init, destroy, lifecycle)
├── state.ts             # ModuleState class (all state + handlers)
├── actions.ts           # Action definitions
├── feedbacks.ts         # Feedback definitions
├── variables.ts         # Variable definitions
├── presets.ts           # Preset definitions
├── types.ts             # TypeScript interfaces
├── config.ts            # Configuration fields
├── liveplay-client.ts   # REST API client
├── websocket-client.ts  # WebSocket client
└── upgrades.ts          # Upgrade scripts
```

### Data Flow

```
LivePlay Server (port 4480)
├── REST API (/api/*)
│   ├── /api/health → connection check
│   ├── /api/project → full project document
│   ├── /api/cues → engine cue list
│   ├── /api/mixers → mixer channels
│   └── /api/devices → audio devices
│
└── WebSocket (/ws)
    ├── playback_snapshot → on connect (full state sync)
    ├── cue_state → on transport change
    ├── meters → ~60Hz (audio levels)
    ├── doc_patch → on document mutation
    └── set_selection → on UI selection
```

## Implementation Status

### Phase 1: Core Infrastructure ✅

- [x] REST API client with health check
- [x] WebSocket client with exponential backoff
- [x] Connection status monitoring
- [x] Configuration (host, port, timeout, debug, update interval)
- [x] Health check before WebSocket connection

### Phase 2: Project Management ✅

- [x] Load project from server
- [x] Sync project structure (items, groups, cart)
- [x] Handle project state changes via doc_patch
- [x] Incremental updates (item_added, item_updated, item_removed, items_reordered)

### Phase 3: Cue Control System ✅

- [x] Play/Stop/Pause/Resume cue
- [x] Toggle Play/Stop
- [x] Toggle Pause/Resume
- [x] Seek to position
- [x] Set cue gain
- [x] Set cue fade times
- [x] Stop all cues
- [x] Set master gain
- [x] Three lookup modes: UUID, cue_id, index

### Phase 4: Feedback System ✅

- [x] Connection status feedback
- [x] Any cue playing/paused feedbacks
- [x] Cue-specific playing/paused/stopped feedbacks
- [x] Cue ready to assign feedback (for learn workflow)

### Phase 5: Variable System ✅

- [x] Player state variables (state, position, progress)
- [x] Current cue metadata (id, uuid, name, artist, title, duration)
- [x] Selection tracking (selected_item_uuid)
- [x] Meter variables (master/mixer peak, RMS, gain reduction)
- [x] Project variables (name, item count)

### Phase 6: Advanced Features ⬜ Not Started

- [ ] Routing control (item→mixer, mixer→master, master→device)
- [ ] Mixer control (create/destroy, volume, mute/solo)
- [ ] Cart system (set/clear/play cart slots)
- [ ] Preview system (start/stop preview)

### Phase 7: Presets ✅

- [x] Play/Stop Cue preset with learn-to-assign
- [x] Feedback styling (green=playing, yellow=paused, red=stopped)

## Key Design Decisions

### State Management

- All state in `ModuleState` class (separated from `main.ts`)
- Maps for O(1) lookup: `projectItems`, `engineCues`, `cueStates`, etc.
- Cross-reference maps: `uuidToCueId`, `cueIdToUuid`

### Connection Flow

1. `init()` → status `Connecting`
2. REST health check → verify server is reachable
3. WebSocket connect → receive `playback_snapshot`
4. Load project state via REST → populate all Maps
5. Status `Ok`

### Update Loop

- `setVariableValues()` every `updateInterval` ms (default 100ms)
- `checkFeedbacks()` to re-evaluate feedback state
- **NEVER** re-register definitions in update loop

### Selection Tracking

- Via `playback_snapshot.selected_item_uuid` (on connect)
- Via `doc_patch { op: "selection_changed" }` (on UI click)
- NOT via meters frame (unnecessary 60Hz for infrequent changes)

## LivePlay API Reference

### Transport States

- `0` = Stopped
- `1` = Playing
- `2` = FadingOut
- `3` = Paused

### WebSocket Frames (Client → Server)

- `play`, `stop`, `pause`, `resume` — transport control
- `seek` — set playhead position
- `gain`, `fade` — per-cue audio settings
- `stop_all` — stop all cues
- `set_selection` — set UI selection
- `set_next_item` — set "Up Next" target

### doc_patch Operations

| Op                    | Description             |
| --------------------- | ----------------------- |
| `project_changed`     | Full reload needed      |
| `item_added`          | New item added          |
| `item_updated`        | Item properties changed |
| `item_removed`        | Item deleted            |
| `items_reordered`     | Item order changed      |
| `cart_slot_set`       | Cart slot assigned      |
| `cart_slot_cleared`   | Cart slot cleared       |
| `selection_changed`   | UI selection changed    |
| `master_gain_changed` | Master gain changed     |
| `next_item_set`       | Next item changed       |

## Build & Package

### Commands

```bash
yarn build    # TypeScript → dist/
yarn package  # Build + bundle → pkg/liveplay/ + .tgz
```

### Installation

Copy `pkg/liveplay` to Companion modules directory:

- Windows: `%APPDATA%/companion/modules/`
- Linux: `~/.companion/modules/`

### WSL Note

If `yarn package` fails with permission error on `pkg/`:

```bash
cmd.exe /c "rmdir /s /q C:\\Users\\DaniK\\companion_modules\\companion-module-liveplay\\pkg\\liveplay"
```
