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

## Presets

### Assign & Toggle

The main preset for controlling cues. Features three status indicator squares at the bottom:

- **Green** (left): Cue is currently playing
- **Purple** (center): Cue is in preview
- **Cyan** (right): Cue is set as next (manual or auto)

Button behavior:

- **Short press (unassigned)**: Capture selected cue from LivePlay
- **Short press (assigned)**: Action depends on active mode:
  - Normal: Toggle play/stop
  - No-Play: Reset assignment
  - Preview: Toggle preview
  - Next: Toggle "Up Next"
- **Long press (1s)**: Stop cue and reset assignment

### Transport Controls

All transport buttons share a unified design with fontsize 36:

| Preset        | Default         | Active            | Description                              |
| ------------- | --------------- | ----------------- | ---------------------------------------- |
| **Stop All**  | Gray, ⏹ icon    | Red background    | Stop all playing cues                    |
| **Play Next** | Gray, ▶ icon    | Cyan background   | Play the next item (manual or auto-next) |
| **Setup**     | Gray, "Setup"   | Orange background | Toggle no-play mode                      |
| **Preview**   | Gray, "Preview" | Purple background | Toggle preview mode                      |
| **Next**      | Gray, "Next"    | Cyan background   | Toggle next mode                         |

### Play Next

Plays the next item in sequence. Supports two sources:

- **Manual next**: Set via "Toggle Next Item" action (takes priority)
- **Auto-next**: Computed from the current cue's `endBehavior` setting

When the current cue has `endBehavior: "next"`, the button automatically knows which item comes next.

## Actions

### Cue Controls

All cue actions support four lookup modes:

- **By UUID**: Use the item's UUID from the project
- **By Engine Cue ID**: Use the engine-level cue ID
- **By Index**: Use zero-based index path (e.g., `0`, `1,3`, `2/5`)
- **Selected in LivePlay**: Use the currently selected item in LivePlay UI

| Action                  | Description                                |
| ----------------------- | ------------------------------------------ |
| **Play Cue**            | Start playback of a cue                    |
| **Stop Cue**            | Stop playback of a cue                     |
| **Pause Cue**           | Pause a playing cue                        |
| **Resume Cue**          | Resume a paused cue                        |
| **Toggle Play/Stop**    | Start playback if stopped, stop if playing |
| **Toggle Pause/Resume** | Pause if playing, resume if paused         |
| **Seek Cue**            | Seek to a specific position in seconds     |
| **Set Cue Gain**        | Set the gain level for a cue in dB         |
| **Set Cue Fade**        | Set fade in/out durations for a cue        |

### Transport Controls

| Action              | Description                      |
| ------------------- | -------------------------------- |
| **Stop All**        | Stop all currently playing cues  |
| **Set Master Gain** | Set the master output gain in dB |

### Preview Controls

| Action                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| **Play Cue Preview**   | Start preview playback (DJ-style pre-listen) |
| **Stop Cue Preview**   | Stop preview playback                        |
| **Toggle Cue Preview** | Toggle preview for a cue                     |

### Next Item Controls

| Action               | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| **Set Next Item**    | Set a cue as the "Up Next" target                                  |
| **Toggle Next Item** | Toggle a cue as "Up Next" (set if not next, clear if already next) |
| **Reset Next Item**  | Clear the "Up Next" target                                         |

### Mode Controls

| Action                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| **Toggle No-Play Mode** | Switch between normal and no-play mode for button setup |
| **Toggle Preview Mode** | Switch between normal and preview mode (pre-listen)     |
| **Toggle Next Mode**    | Switch between normal and next mode (set Up Next)       |

## Feedbacks

### Global State

| Feedback            | Description                    |
| ------------------- | ------------------------------ |
| **Any Cue Playing** | Active when any cue is playing |
| **Any Cue Paused**  | Active when any cue is paused  |

### Cue-Specific

All cue feedbacks support the same four lookup modes as actions.

| Feedback                | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| **Cue Is Playing**      | Active when the specified cue is playing                       |
| **Cue Is Paused**       | Active when the specified cue is paused                        |
| **Cue Is Stopped**      | Active when the specified cue is stopped                       |
| **Cue Is Next**         | Active when the cue is set as next (manual or auto-next)       |
| **Cue Ready to Assign** | Active when no cue is assigned and one is selected in LivePlay |

### Mode Feedbacks

| Feedback                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| **No-Play Mode Active**   | Active when no-play mode is enabled                  |
| **No-Play Assigned**      | Active when no-play mode is on and a cue is assigned |
| **Preview Mode Active**   | Active when preview mode is enabled                  |
| **Preview Mode Assigned** | Active when preview mode is on and a cue is assigned |
| **Next Mode Active**      | Active when next mode is enabled                     |
| **Next Mode Assigned**    | Active when next mode is on and a cue is assigned    |

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

| Variable                         | Description                                          |
| -------------------------------- | ---------------------------------------------------- |
| `current_cue_id`                 | Engine cue ID                                        |
| `current_cue_uuid`               | Item UUID                                            |
| `current_cue_name`               | Display name                                         |
| `current_cue_artist`             | Artist (from metadata)                               |
| `current_cue_title`              | Title (from metadata)                                |
| `current_cue_duration`           | Duration (seconds)                                   |
| `current_cue_duration_formatted` | Duration (MM:SS)                                     |
| `current_cue_end_behavior`       | End behavior of current cue (next, loop, nothing...) |

### Selection & Navigation

| Variable                   | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `next_item_uuid`           | UUID of the manually set next item                           |
| `next_item_name`           | Name of the manually set next item                           |
| `selected_item_uuid`       | UUID of the item currently selected in LivePlay              |
| `selected_item_name`       | Name of the item currently selected in LivePlay              |
| `auto_next_item_uuid`      | UUID of the auto-next item based on endBehavior              |
| `auto_next_item_name`      | Name of the auto-next item based on endBehavior              |
| `effective_next_item_uuid` | UUID of the effective next (manual takes priority over auto) |
| `effective_next_item_name` | Name of the effective next (manual takes priority over auto) |

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

## Usage Examples

### Basic Playback Control

1. Add "Assign & Toggle" preset to buttons
2. Select a cue in LivePlay
3. Press button to assign
4. Press again to toggle play/stop

### Setup Workflow

1. Press "Setup" to enter no-play mode
2. Select cues in LivePlay and assign to buttons
3. Assigned buttons show green indicator
4. Press "Setup" again to exit

### Preview Workflow

1. Press "Preview" to enter preview mode
2. Press assigned buttons to preview through separate device
3. Purple indicator shows on previewing cue

### Next Item Workflow

**Manual next:**

1. Press "Next" to enter next mode
2. Press an assigned button to set it as "Up Next"
3. Cyan indicator shows on the next cue
4. Press "▶" (Play Next) to play it immediately

**Auto-next:**

- When a cue has `endBehavior: "next"`, the module automatically computes which item comes next
- The "▶" button plays it when the current cue ends
- Manual next always takes priority over auto-next

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
