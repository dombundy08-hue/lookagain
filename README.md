# Look Again

A Curiosity Hour lost episode. The web stage of The Keeper scavenger hunt: it takes the kids from the hollowed Red Book to the locked game tape, and later unlocks the next stage with the code from a real cassette.

Static site. React + TypeScript + Tailwind 4 + shadcn structure, built with Vite, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. No backend, no accounts, no analytics.

## Run it

```bash
npm install
npm run dev
```

## How the game is put together

- `src/game/stages.ts`: the stage engine config. Every screen, its prompt text and its order. Edit text and order here.
- `src/game/copy.ts`: the Keeper's lines, wrong-answer nudges, names.
- `src/game/sealed.json`: generated. Hashed answers and the encrypted transcript and secret stage. Safe to commit.
- `private/secrets.json`: **the real answers, transcript and tape code in plain text. Gitignored. Never commit it.** Keep a backup somewhere private; without it you can't change answers.
- `src/components/ui/`: the shadcn-style components (hero, difficulty select, timeline, 8-bit button and card).
- `src/components/game/`: one renderer per stage type.

## Changing answers, the transcript, or adding the tape code

1. Edit `private/secrets.json` (see `private/secrets.example.json` for the shape).
2. To unlock the "secret" stage, fill in `"secret": { "code": "...", "title": "...", "body": "..." }`.
3. Run `npm run seal`. It rewrites `src/game/sealed.json` and self-checks every answer.
4. Commit and push. The site redeploys.

Answers are normalized before checking: case, punctuation, spaces, a leading "the/a/my", and one plural "s" are ignored.

## Hidden slips

Six things the Keeper let slip are hidden around the site. Where each one hides is listed in a comment above `SLIPS` in `src/game/copy.ts`. They are optional; finding all six earns a star.

## Soundtrack

`public/media/theme.mp3` plays from the moment Press Play is pressed: random stretches of the song, short breaks of tape hiss, and now and then a slowed, warbling pass. The speaker button in the top bar mutes it. Any video or audio on the page plays over a quiet bed.

## Media (optional)

Drop these into `public/media/` and they appear automatically. Missing files show a "NO SIGNAL" frame or are hidden.

- `poster.jpg`: the attic poster still (shown dark and cropped)
- `garage.mp4` + `garage.vtt`: the garage video and its captions
- `keeper.mp3`: the Keeper reading the game tape (the text is always shown too)
