# Echoes of Aether

A Phaser 3 / TypeScript action RPG built with Vite. Explore Greenleaf Village,
Whispering Forest and the Ancient Dungeon, and return the Aether fragment to
Elder Rowan. Characters, terrain, visual effects, and audio are generated
locally at runtime; no downloaded art or sound assets are required.

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
- Inventory: I or **BAG**; select an item to use or equip it, or select an
  equipped weapon or armor to unequip it.
- Quest journal: J or **QUEST**.
- Pause and audio: Escape or **PAUSE**.
- Android Back opens/closes pause or dismisses the active panel; the game saves
  when the app is backgrounded.
- Save: F5 or interact with the village save point. The game also autosaves.
- Keyboard menus: press the number displayed beside an option. In the
  inventory, 1–5 select items and 6–7 unequip the weapon or armor.

The first click, touch, or key press unlocks Web Audio and plays a short cue
unless audio is muted. Music changes with the area and boss encounter; the
audio setting persists. Browser or device volume and silent-mode settings
still control whether it is audible.

The hero faces the direction of movement and has walking frames. Buildings,
pillars, forest obstacles, and dungeon walls block movement. Dialogue and
notifications are exposed through a browser live region, and keyboard
instructions are available to assistive technology.

Saved games and the audio setting are stored locally in the browser or Android
WebView. Clearing app/browser storage removes them.

## Validate and build

```powershell
npm test
npm run build
npm run preview
```

## Android

Install Android Studio, JDK 21, and Android SDK platform 36. Build the web
game and sync it to the included Capacitor Android project:

```powershell
npm run build:android
npx cap open android
```

In Android Studio, allow Gradle to finish syncing, then use **Build > Build
Bundle(s) / APK(s) > Build APK(s)** for a debug APK. Alternatively, with the
SDK and Java configured, run `.\gradlew.bat assembleDebug` from the `android`
directory. A release build requires a private signing key. Keep the keystore
outside the repository and configure these environment variables before running
`.\gradlew.bat assembleRelease` in `android`:

```powershell
$env:AETHER_KEYSTORE = 'C:\secure\echoes-release.jks'
$env:AETHER_KEYSTORE_PASSWORD = '<keystore password>'
$env:AETHER_KEY_ALIAS = '<key alias>'
$env:AETHER_KEY_PASSWORD = '<key password>'
```

Set all four variables or none. Without them the release output is unsigned;
do not commit keys or passwords. Provision and protect your own signing key.
Re-run `npm run build:android` after web changes. No Android APK or device test
has been verified in this environment.

The GitHub Actions workflow in `.github/workflows/build-apk.yml` builds and
uploads a debug APK on pushes, pull requests, and manual dispatch. The artifact
is available from the workflow run after the job succeeds. It is not a signed
release APK, and the workflow itself must run successfully before claiming an
APK has been produced.

## Project layout

- `src/config/`: Phaser configuration.
- `src/data/`: item, quest, and save data types.
- `src/scenes/`: menu and gameplay scenes.
- `src/systems/`: inventory, progression, quest, audio, and save logic.
- `tests/`: focused system regression tests.
- `android/`: Capacitor Android project.

## Release status

The game is playable in a browser. Android device performance, accessibility
with assistive technology, native audio, and release signing still require
testing on actual devices. Screen-reader announcements do not make the
canvas-based action gameplay fully accessible. A signed release APK and
production-release QA have not been verified in this environment.
