# Classroom Jeopardy

A Jeopardy game for the TV, with optional tablet buzzers. Nothing to install – it's just web pages, so it runs from **GitHub Pages** (or by double-clicking `index.html`).

## Putting it on GitHub Pages

1. On github.com create a new repository (e.g. `Jeopardy`), public.
2. Upload everything in this folder: `index.html`, `play.html`, `qr.js`, `README.md` and the `questions` folder (**Add file → Upload files**; drag the files in, keep the `questions` folder).
3. Repository **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and Save.
4. After a minute your game is at `https://YOUR-USERNAME.github.io/Jeopardy/`. Bookmark it.

Anyone with the link can open the game. Question files in the repository are public too – for private questions use **Open file…** (below) to load a file from your own computer instead.

## Playing

Open the game page on the TV computer, pick a question file, name your teams, **Start game**. Press **F** for full screen.

**Without tablets:** when a team calls out an answer, click its box (or press its number key).

**With tablet buzzers:** on the setup screen click **Turn on tablet buzzers**. The TV shows a QR code, an address and a 4-letter code.
1. Tablets need **internet** (any network – it doesn't have to be the same one as the TV computer).
2. Scan the QR code with the tablet camera, or type the address and enter the code.
3. The tablet shows the team names – tap yours. A green dot on the 📱 button on the TV means at least one tablet is connected.

During a question: you read it, press **Space** to open the buzzers, the tablets turn green, and the **first** tap wins. That team lights up on the TV – press **C** (correct) or **X** (wrong). A wrong answer locks that team out and the buzzers re-open for the others.

You can mix tablet teams and shouting teams. If a tablet sleeps or refreshes it reconnects to its team by itself. If the TV page is refreshed it keeps the same code and the tablets reconnect.

**How the tablets connect:** tablets link straight to the TV page (peer-to-peer, WebRTC). A free public service, PeerJS, is used only to introduce them to each other. Team names and scores travel directly between the devices.

**Tablet can't connect?**
- Check the tablet has internet. Some school networks block peer-to-peer connections – try the tablet on mobile data or a phone hotspot.
- Make sure tablet buzzers are turned on at the TV and you're using the current code.
- Tablets should have auto-lock set to a long time while playing.

## Changing the questions

Questions are plain text files (`.txt`) in the **`questions`** folder. Open one in Notepad, change it, save.

- **On GitHub Pages:** add the file to the `questions` folder in your repository and add its name to **`questions/index.json`** (a list of file names) – that list is what fills the drop-down.
- **From your own computer:** on the setup screen click **Open file…**. Works any time, nothing needs uploading.
- **Download blank question template** gives you a fresh file to fill in. After editing a file, click **↻** on the setup screen to re-read it.

### Text format (easiest)

```
Title: Space Quiz

# Space

100: This is the star at the center of our solar system.
A: The answer is the Sun.

200: This planet is famous for its beautiful rings.
A: The answer is Saturn.
Image: saturn.png

400: This is the name of our galaxy.
A: The answer is the Milky Way.

# Animals

100: This farm animal says "moo."
A: The answer is a cow.

# Our Planet

final: This is the only planet not named after a god.
A: The answer is Earth.
```

- `# Name` starts a category. Under it, each clue is `value: clue text` followed by `A: answer`.
- `Image: file.png` (optional) shows a picture – a file in the `questions` folder (e.g. `images/map.jpg`) or a full web address.
- `final: …` makes the **Final Jeopardy** clue; the `# category` above it is its category.
- A long clue or answer can wrap onto the next line. Blank lines are ignored, and lines starting with `//` are notes to yourself.
- Values can be anything (100–500, 200–1000, …). Categories appear in the order they are written.
- Commas, quotes and accents need no special treatment.

### CSV format (still works)

Old `.csv` files still open (use **Open file…**, or list them in `index.json`). The original CSVs are kept in `questions/csv-backup/`.

| category | value | clue | answer | image |
|---|---|---|---|---|
| Space | 100 | This is the star at the center of our solar system. | The answer is the Sun. | |
| Space | 200 | … | … | planets.png |
| Our Planet | final | The Final Jeopardy clue | The answer is Earth. | |

- One row per clue. Categories appear in the order they first show up; point values can be anything (100–500, 200–1000, …).
- **`final`** in the *value* column makes that row the Final Jeopardy clue (optional – the *category* column is its category).
- **`image`** (optional): a file in the `questions` folder (e.g. `planets.png` or `images/map.jpg`) or a full web address.
- If you save from Excel, use *CSV UTF-8* so accents and quotes stay right.

### JSON format (alternative)

```json
{
  "title": "Unit 3 Review",
  "categories": [
    { "name": "Fractions",
      "clues": [
        { "value": 100, "clue": "1/2 + 1/2", "answer": "The answer is 1." },
        { "value": 200, "clue": "…", "answer": "…", "image": "pie.png" }
      ] }
  ],
  "final": { "category": "Wrap-up", "clue": "…", "answer": "…" }
}
```

## Keyboard shortcuts (on the TV computer)

| Key | Action |
|---|---|
| Space | open buzzers / next |
| 1–8 | that team answers (use for teams without a tablet) |
| C / X | correct / wrong |
| A | reveal the answer (nobody got it) |
| Esc | put the clue back / return to board |
| F, M, T | full screen, menu (edit scores), tablets/QR |

The game saves its progress automatically – if the browser closes, reopen it and click **Resume saved game**.

## Files

- `index.html` – the game board for the TV. `play.html` – the tablet buzzer. `qr.js` – QR code maker.
- `questions/` – your question sets, plus `index.json` (the list shown in the drop-down).
- Optional: download `peerjs.min.js` (version 1.5.4) from <https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js> and put it next to `index.html`. The pages use that copy if it's there, and otherwise load it from jsdelivr.net, which a school network might block.
