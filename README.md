# Doraemon Dash

A simple browser platformer inspired by classic Mario-style side scrollers, using a Doraemon-inspired robo-cat hero drawn directly in canvas across 4 levels, including a boss fight finale.

## How to run locally on your MacBook

1. Open Terminal.
2. Go to the project folder:

```bash
cd "/Users/karmannityasarao/Documents/New project/doraemon-dash"
```

3. Start a small local web server with Python:

```bash
python3 -m http.server 8000
```

4. Open this address in your browser:

```text
http://localhost:8000
```

5. Click `index.html` if your browser shows a file list first.

## Controls

- `A` / `D` or Left / Right arrows to move
- `W`, Up arrow, or `Space` to jump
- `R` to restart
- On mobile, use the on-screen left, jump, and right buttons

## Goal

- Clear all 4 levels
- Collect every dorayaki in each level
- Avoid spikes and robot mice
- Reach the yellow door before time runs out
- In Level 4, survive the giant rat boss while dorayaki shots fire automatically

## Notes

- This game uses only `index.html`, `styles.css`, and `app.js`.
- No npm install is needed.
- Sound starts after your first keyboard input because browsers block autoplay audio by default.
- On phones, open the page in portrait mode for the clean mobile layout and touch controls.
- If port `8000` is busy, try:

```bash
python3 -m http.server 8080
```
