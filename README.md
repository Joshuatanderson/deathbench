# DeathBench

Public record of deaths caused or enabled by AI systems.

## Run locally

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm build
pnpm start
```

`pnpm build` writes server and browser bundles to `build/server` and
`build/client`. `pnpm start` serves the build with server rendering, then the
browser hydrates it.

Run `pnpm typecheck` to regenerate React Router route types and check the
TypeScript project.

## Registry editor

The password-protected editor is at `/editor` in development and production.
Set `DATABASE_URL` and a bcrypt `EDITOR_PASSWORD_HASH` in `.env` for local use,
or as environment variables in the deployed service. `pnpm dev` and `pnpm start`
load `.env` when it exists.

Built with React Router framework mode, React, TypeScript, Vite, Tailwind CSS,
and a minimal headless shadcn installation.

## Background video

The ambient background in `public/bg/` comes from
[Misty river.webm](https://commons.wikimedia.org/wiki/File:Misty_river.webm)
on Wikimedia Commons (CC0 1.0, by user Digitura). It was cropped, ping-pong
looped, converted to black and white, and given grain and a tear effect with
ffmpeg. The MP4 and WebM are each under 250 KB.
