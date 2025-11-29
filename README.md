# OctateCode

OctateCode is an extensible, open-source code editor and workbench derived from the upstream workbench architecture. It ships a flexible extension model, React-based UI panels, and developer tools to help you build and test editor features locally.

**Highlights**
- Extensible activity bar and views
- React-based onboarding and settings UI
- Collaboration primitives for room creation and real-time sync
- Local-first design; runs and builds locally with the provided scripts

Website & Community
- Website: https://voideditor.com
- Discord: https://discord.gg/RSNjgaugJs

Quickstart
---------
Prerequisites: Node.js (LTS), npm or pnpm, and basic build toolchain for native portions.

1. Install dependencies:

```powershell
npm ci
```

2. Start the build watchers for development (recommended):

```powershell
# Run the repository's watchers (Core, React, Extensions)
npm run watch-clientd
npm run watchreactd
npm run watch-extensionsd
```

3. Launch the local dev host:

```powershell
.\scripts\code.bat
```

Common tasks
- Run tests: `.\scripts\test.bat`
- Build for packaging: use the repository's packaging scripts (see `package.json`)

Development notes
-----------------
- UI sources live under `src/vs/workbench/contrib/*`.
- The repo uses helper scripts and a two-stage prefixification for some UI assets; use the provided watchers and tasks to avoid mismatches between `src` and runtime bundles.
- Use repository DOM helpers when interacting with multi-window DOM (avoid direct global `window` usage).

Contributing
------------
- See `HOW_TO_CONTRIBUTE.md` for guidelines. Create feature branches (for example `experiment/your-change`) and open PRs when ready.

License
-------
See `LICENSE.txt` in the repository root for license terms.

If you want this README committed to a branch I can create it and commit, or tailor the README further (shorter, longer, more images). Tell me which option you prefer next.
# Welcome to OctateCode.

<div align="center">
	<img
		src="./src/vs/workbench/browser/parts/editor/media/slice_of_void.png"
    	alt="OctateCode Welcome"
		width="300"
	 	height="300"
	/>
</div>

OctateCode is the open-source Cursor alternative.

Use AI agents on your codebase, checkpoint and visualize changes, and bring any model or host locally. OctateCode sends messages directly to providers without retaining your data.

This repo contains the full sourcecode for OctateCode. If you're new, welcome!

- 🧭 [Website](https://voideditor.com)

- 👋 [Discord](https://discord.gg/RSNjgaugJs)

- 🚙 [Project Board](https://github.com/orgs/voideditor/projects/2)


## Contributing

1. To get started working on OctateCode, check out our Project Board! You can also see [HOW_TO_CONTRIBUTE](https://github.com/voideditor/void/blob/main/HOW_TO_CONTRIBUTE.md).

2. Feel free to attend a casual weekly meeting in our Discord channel!


## Reference

OctateCode is a fork of the [vscode](https://github.com/microsoft/vscode) repository. For a guide to the codebase, see [VOID_CODEBASE_GUIDE](https://github.com/voideditor/void/blob/main/VOID_CODEBASE_GUIDE.md).

## Note
Work is temporarily paused on the OctateCode IDE (this repo) while we experiment with a few novel AI coding ideas for OctateCode. Stay alerted with new releases in our Discord channel.

## Support
You can always reach us in our Discord server or contact us via email: hello@voideditor.com.
