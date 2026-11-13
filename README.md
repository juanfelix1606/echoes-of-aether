# Echoes of Aether

A Phaser 3 / TypeScript action RPG built with Vite. Explore Greenleaf Village,
Whispering Forest and the Ancient Dungeon, and return the Aether fragment to
Elder Rowan. Graphics and audio are procedural placeholders, not final assets.

## Requirements and running

Use Node.js 22.12 or newer and npm.

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. Choose **New Game**, speak to the elder, and
follow the objective shown at the top of the screen.

## Controls

- Move: WASD or arrow keys; on touchscreens, drag the left joystick.
- Attack: Space or **ATK**; attacks follow the last movement direction.
- Aether skill: Q or **SKILL**, costs mana.
- Interact and advance dialogue: E, Enter, **TALK**, or **NEXT**.
- Potion: P or **USE**. Opens a health potion if health is missing, otherwise an ether potion.
- Inventory: I or **BAG**; select an item to use or equip it.
- Pause and audio: Escape or **PAUSE**.
- Save: F5 or interact with the village save point. The game also autosaves.

Saved games and the audio setting are stored locally in the browser or Android
WebView. Clearing app/browser storage removes them.

## Validate and build

```powershell
npm test
npm run build
npm run preview
```

## Android

Install Android Studio, a compatible JDK, and the Android SDK. Build the web
game and sync it to the included Capacitor Android project:

```powershell
npm run build:android
npx cap open android
```

In Android Studio, allow Gradle to finish syncing, then use **Build > Build
Bundle(s) / APK(s) > Build APK(s)** for a debug APK. Alternatively, with the
SDK and Java configured, run `.\gradlew.bat assembleDebug` from the `android`
directory. A release build requires an appropriately configured signing key.
Re-run `npm run build:android` after web changes. No Android APK or device test
has been verified in this environment.

## Project layout

- `src/config/`: Phaser configuration.
- `src/data/`: item, quest, and save data types.
- `src/scenes/`: menu and gameplay scenes.
- `src/systems/`: inventory, progression, quest, audio, and save logic.
- `tests/`: focused system regression tests.
- `android/`: Capacitor Android project.

The current build is a playable work in progress, not a finished production
release: artwork, animation, combat balancing, accessibility, device performance,
and release signing still need further work and real-device QA.
