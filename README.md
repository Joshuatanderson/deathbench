# DeathBench

Homepage for DeathBench, an independent public record of deaths caused or
enabled by artificial intelligence.

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

`pnpm build` creates separate server and browser bundles in `build/server` and
`build/client`. `pnpm start` serves the production build with server rendering;
the browser then hydrates the rendered HTML for client-side interactions.

Run `pnpm typecheck` to regenerate React Router's route types and check the
TypeScript project.

## Registry editor

The password-protected editor is available at `/editor` in both development and
production. Set `DATABASE_URL` and a bcrypt `EDITOR_PASSWORD_HASH` in `.env` for
local use, or as environment variables in the deployed service. Both `pnpm dev`
and `pnpm start` load a local `.env` file when present.

Built with React Router framework mode, React, TypeScript, Vite, Tailwind CSS,
and a minimal headless shadcn installation.

## Background video

The ambient background in `public/bg/` is derived from
[Misty river.webm](https://commons.wikimedia.org/wiki/File:Misty_river.webm)
on Wikimedia Commons (CC0 1.0, by user Digitura). It was cropped, ping-pong
looped, converted to black and white, and given grain and a tear effect with
ffmpeg. The MP4 and WebM are each under 250 KB.
