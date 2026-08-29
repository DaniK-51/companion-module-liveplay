# LivePlay Companion Module

## Overview

The LivePlay Companion module provides control over LivePlay, an open-source audio playback system for live productions. This module integrates LivePlay with Bitfocus Companion, allowing you to control audio cues and monitor playback status from your Companion buttons.

## Requirements

- LivePlay server running (version 2.0 or later)
- Network connection between Companion and LivePlay server
- LivePlay project loaded on the server

## Setup Instructions

### 1. Configure LivePlay Server

1. Start LivePlay on your audio playback machine
2. Note the server IP address and port (default: 4480)
3. Ensure the server is accessible from your Companion machine

### 2. Configure LivePlay Module in Companion

1. Add a new LivePlay instance in Companion
2. Enter the LivePlay server IP address
3. Set the port (default: 4480)
4. Configure connection timeout (default: 5000ms)
5. Enable debug logging if troubleshooting connection issues

### 3. Connection Status

- **Green**: Connected to LivePlay server
- **Red**: Connection failed or server unreachable
- **Yellow**: Connecting or reconnecting

## Actions

### Cue Controls

All cue actions support four lookup modes:

- **By UUID**: Use the item's UUID from the project
- **By Engine Cue ID**: Use the engine-level cue ID
- **By Index**: Use zero-based index path (e.g., `0`, `1,3`, `2/5`)
- **Selected in LivePlay**: Use the currently selected item in LivePlay UI

| Action                  | Description                       |
| ----------------------- | --------------------------------- |
| **Play Cue**            | Start playback of a cue           |
| **Stop Cue**            | Stop playback of a cue            |
| **Pause Cue**           | Pause a playing cue               |
| **Resume Cue**          | Resume a paused cue               |
| **Toggle Play/Stop**    | Toggle between play and stop      |
| **Toggle Pause/Resume** | Toggle between pause and resume   |
| **Seek Cue**            | Seek to position in cue (seconds) |
| **Set Cue Gain**        | Set cue volume (dB, -60 to +20)   |
| **Set Cue Fade**        | Set fade in/out times (ms)        |

### Transport Controls

| Action              | Description                   |
| ------------------- | ----------------------------- |
| **Stop All**        | Stop all playing cues         |
| **Set Master Gain** | Set master output volume (dB) |

### Preview Controls

| Action                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| **Play Cue Preview**   | Start preview playback (DJ-style pre-listen) |
| **Stop Cue Preview**   | Stop preview playback                        |
| **Toggle Cue Preview** | Toggle preview for a cue                     |

### Next Item Controls

| Action               | Description                   |
| -------------------- | ----------------------------- |
| **Set Next Item**    | Set a cue as "Up Next" target |
| **Toggle Next Item** | Toggle next status            |
| **Reset Next Item**  | Clear the "Up Next" target    |

### Mode Controls

| Action                  | Description                              |
| ----------------------- | ---------------------------------------- |
| **Toggle No-Play Mode** | Switch setup mode (assign/unassign only) |
| **Toggle Preview Mode** | Switch preview mode (pre-listen)         |
| **Toggle Next Mode**    | Switch next mode (set up next)           |

## Feedbacks

### Connection

| Feedback                | Description                     |
| ----------------------- | ------------------------------- |
| **Connected to Server** | True when connected to LivePlay |

### Global State

| Feedback            | Description                  |
| ------------------- | ---------------------------- |
| **Any Cue Playing** | True when any cue is playing |
| **Any Cue Paused**  | True when any cue is paused  |

### Cue-Specific

All cue feedbacks support the same four lookup modes as actions.

| Feedback                | Description                                         |
| ----------------------- | --------------------------------------------------- |
| **Cue Is Playing**      | True when specific cue is playing                   |
| **Cue Is Paused**       | True when specific cue is paused                    |
| **Cue Is Stopped**      | True when specific cue is stopped                   |
| **Cue Is Next**         | True when cue is the "Up Next" target               |
| **Cue Ready to Assign** | True when cue is not assigned and a cue is selected |

### Mode Feedbacks

| Feedback                  | Description                                    |
| ------------------------- | ---------------------------------------------- |
| **No-Play Mode Active**   | True when no-play mode is on                   |
| **No-Play Assigned**      | True when no-play on + button has assigned cue |
| **Preview Mode Active**   | True when preview mode is on                   |
| **Preview Mode Assigned** | True when preview on + button has assigned cue |
| **Next Mode Active**      | True when next mode is on                      |
| **Next Mode Assigned**    | True when next on + button has assigned cue    |

## Variables

### Player State

| Variable                    | Description                            |
| --------------------------- | -------------------------------------- |
| `player_state`              | Current state (playing/paused/stopped) |
| `player_position`           | Playhead position (seconds)            |
| `player_position_formatted` | Position (MM:SS)                       |
| `player_progress`           | Progress (0-100)                       |
| `master_gain`               | Master gain (dB)                       |
| `active_cue_count`          | Number of active cues                  |

### Current Cue

| Variable                         | Description            |
| -------------------------------- | ---------------------- |
| `current_cue_id`                 | Engine cue ID          |
| `current_cue_uuid`               | Item UUID              |
| `current_cue_name`               | Display name           |
| `current_cue_artist`             | Artist (from metadata) |
| `current_cue_title`              | Title (from metadata)  |
| `current_cue_duration`           | Duration (seconds)     |
| `current_cue_duration_formatted` | Duration (MM:SS)       |

### Selection & Navigation

| Variable             | Description                            |
| -------------------- | -------------------------------------- |
| `next_item_uuid`     | Next item UUID                         |
| `next_item_name`     | Next item display name                 |
| `selected_item_uuid` | Currently selected item in LivePlay UI |
| `selected_item_name` | Selected item display name             |

### Preview

| Variable            | Description               |
| ------------------- | ------------------------- |
| `preview_item_uuid` | Preview item UUID         |
| `preview_item_name` | Preview item display name |

### Meters

| Variable                   | Description                        |
| -------------------------- | ---------------------------------- |
| `master_peak_db`           | Master peak level (dB)             |
| `master_rms_db`            | Master RMS level (dB)              |
| `master_gain_reduction_db` | Master limiter gain reduction (dB) |
| `mixer_peak_db`            | First mixer peak level (dB)        |
| `mixer_rms_db`             | First mixer RMS level (dB)         |

### Project

| Variable             | Description                |
| -------------------- | -------------------------- |
| `project_name`       | Loaded project name        |
| `project_item_count` | Number of items in project |

### Mode State

| Variable       | Description                |
| -------------- | -------------------------- |
| `no_play_mode` | No-play mode (0=off, 1=on) |
| `preview_mode` | Preview mode (0=off, 1=on) |
| `next_mode`    | Next mode (0=off, 1=on)    |

## Presets

### Assign & Toggle

The main preset for controlling cues:

- **Short press (unassigned)**: Capture selected cue from LivePlay
- **Short press (assigned)**: Action depends on active mode:
  - Normal: Toggle play/stop
  - No-Play: Reset assignment
  - Preview: Toggle preview
  - Next: Toggle "Up Next"
- **Long press (1s)**: Stop cue and reset assignment

### Stop All

Red button that stops all playing cues.

### No-Play Mode

Toggle setup mode. When active, assigned buttons glow blue and pressing resets them.

### Preview Mode

Toggle preview mode. When active, assigned buttons glow purple and play through preview device. Shows song name when preview is active.

### Next Mode

Toggle next mode. When active, assigned buttons glow cyan and set as "Up Next". Shows song name when next is set.

## Usage Examples

### Basic Playback Control

1. Add "Assign & Toggle" preset to buttons
2. Select a cue in LivePlay
3. Press button to assign
4. Press again to toggle play/stop

### Setup Workflow

1. Press "No-Play Mode" to enter setup
2. Select cues in LivePlay and assign to buttons
3. Assigned buttons glow blue
4. Press "No-Play Mode" again to exit setup

### Preview Workflow

1. Press "Preview Mode" to enter preview
2. Press assigned buttons to preview through separate device
3. Button shows song name during preview

## Troubleshooting

### Connection Issues

- **Cannot connect to server**: Check IP address and port
- **Connection timeout**: Increase timeout in configuration
- **Server unreachable**: Check network connectivity and firewall

### Performance Issues

- **Slow updates**: Reduce update frequency in settings (default: 100ms)
- **High CPU usage**: Increase update interval or disable debug logging

## Support

For issues and feature requests:

- LivePlay: https://github.com/tdoukinitsas/liveplay
- Companion module: https://github.com/DaniK-51/companion-module-liveplay
