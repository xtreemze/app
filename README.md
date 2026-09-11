# xtreemze keyboard configurator

This repository is a custom VIA/Vial-compatible web configurator fork used to expose keyboard capabilities that are not fully represented by the stock VIA application.

## Hosted application

The Vial-compatible configurator is hosted directly by GitHub Pages at:

**https://xtreemze.github.io/app/**

`main` is the authoritative source. GitHub Actions builds the production Vite application, refreshes keyboard definitions, derives the correct Pages base path from the repository name, adds the SPA fallback, and deploys the resulting `dist/` artifact directly to GitHub Pages. No Cloudflare or secondary hosting workflow is used.

For this project repository, GitHub Pages serves the app from `/app/`. Client-side routes and static/PWA assets use the same deployment base. If the repository is ever renamed to `xtreemze.github.io`, the workflow automatically switches to the root `/` Pages base.

GitHub requires the repository Pages publishing source to be enabled once under **Settings → Pages → Build and deployment → Source → GitHub Actions**. After that, pushes to `main`, keyboard-definition dispatches, and manual workflow runs deploy the configurator directly.

## Fork direction

In addition to tracking upstream VIA compatibility, this fork is intended to expose richer capabilities from custom firmware without weakening behavior for standard VIA keyboards. Device-specific extensions should be capability-detected and isolated behind typed adapters so unsupported keyboards continue to receive the normal VIA experience.

The current extension direction includes richer RGB Matrix configuration, including explicit profiles for layers, modifier families, combos, and supported per-key lighting rather than relying only on fixed global lighting controls.

---

# [VIA Web Application](https://usevia.app) - Your keyboards best friend

![android-chrome-192x192](https://user-images.githubusercontent.com/1714072/222621960-ddfb8ee6-a486-4c66-8852-b204ba7c807b.png)

VIA is a powerful, open-source web-based interface for configuring your [QMK](https://qmk.fm)-powered mechanical keyboard. It allows you to customize your keymaps, create macros, and adjust RGB settings (if it has RGB) on the fly, without needing to recompile your keyboard's firmware. This makes keyboard customization easier and more accessible for everyone.

## Getting VIA to support your keyboard

Are you a keyboard maker or a developer interested in adding support for your keyboard? We welcome contributions to the VIA project!

1. The source code of the keyboard **has to be merged** in [QMK Firmware Repositories](https://github.com/qmk/qmk_firmware) Master branch.
2. Your `keymaps/via` keymap **has to be merged** in [VIA's QMK Userspace Repository](https://github.com/the-via/qmk_userspace_via) Main branch.
3. Create a definition in JSON format for your keyboard and submit it as a pull request to [VIA's Keyboards Repository](https://github.com/the-via/keyboards) Master branch.

Please follow our [Specification documentation](https://www.caniusevia.com/docs/specification) carefully to ensure your pull request is smoothly reviewed and merged.

## Local development setup

Start by cloning [`the-via/keyboards`](https://github.com/the-via/keyboards) then install dependencies with `npm install` and finally `npm run build`. You should see
the output folder `dist`. This should be copied or symlinked to our repo's `public/definitions` folder.

```bash
# Inside the-via/app
public/definitions -> ../../keyboards/dist
```

### Useful commands

#### `npm run dev`

Runs the app in the development mode.
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

#### `npm run build`

Builds a static copy of your site to the `dist/` folder.
Your app is ready to be deployed!

---

This project is tested with [BrowserStack](https://www.browserstack.com/).

## Looking for an offline app?

@cebby2420 has kindly made a desktop app that does so.

You can find it at [https://github.com/cebby2420/via-desktop](https://github.com/cebby2420/via-desktop).

**NOTE: This project has no official affiliation with VIA, and we cannot provide support for it.**
