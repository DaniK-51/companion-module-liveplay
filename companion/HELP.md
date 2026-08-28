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

All cue actions support three lookup modes:

- **By UUID**: Use the item's UUID from the project
- **By Engine Cue ID**: Use the engine-level cue ID
- **By Index**: Use zero-based index path (e.g., `0`, `1,3`, `2/5`)

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

All cue feedbacks support the same three lookup modes as actions.

| Feedback                | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| **Cue Is Playing**      | True when specific cue is playing                               |
| **Cue Is Paused**       | True when specific cue is paused                                |
| **Cue Is Stopped**      | True when specific cue is stopped                               |
| **Cue Ready to Assign** | True when cue is not assigned and a cue is selected in LivePlay |

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
| `selected_item_uuid` | Currently selected item in LivePlay UI |

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

## Presets

### Play / Stop Cue (Learn)

A preset with learn-to-assign workflow:

1. Add the preset to a button
2. Select a cue in LivePlay (click on it in the playlist)
3. The button lights up green with "Learn" text
4. Press "Learn" in Companion (right-click → Learn)
5. The cue is now assigned to the button
6. Button toggles play/stop for the assigned cue

## Usage Examples

### Basic Playback Control

1. Create a button with "Toggle Play/Stop" action
2. Set lookup mode to "By UUID" and enter the cue UUID
3. Add "Cue Is Playing" feedback with green color
4. Add "Cue Is Paused" feedback with yellow color

### Learn-to-Assign Workflow

1. Add "Play / Stop Cue (Learn)" preset to a button
2. In LivePlay, click on the cue you want to control
3. In Companion, right-click the button and select "Learn"
4. The cue is now assigned and the button toggles playback

### Index-Based Control

1. Use "By Index" lookup mode
2. Enter index path: `0` for first item, `1,3` for nested items
3. Useful when UUIDs change but playlist order stays the same

## Troubleshooting

### Connection Issues

- **Cannot connect to server**: Check IP address and port
- **Connection timeout**: Increase timeout in configuration
- **Server unreachable**: Check network connectivity and firewall
- **Module shows "Connecting"**: Server may be starting up, wait a moment

### Project Issues

- **Project won't load**: Verify project file exists and is accessible
- **Cues not found**: Check if cues are properly loaded in LivePlay
- **Missing media**: Ensure media files are in correct location

### Performance Issues

- **Slow updates**: Reduce update frequency in settings (default: 100ms)
- **High CPU usage**: Increase update interval or disable debug logging

## Support

For issues and feature requests:

- LivePlay: https://github.com/tdoukinitsas/liveplay
- Companion module: https://github.com/DaniK-51/companion-module-liveplay
