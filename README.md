# MakeSB 2027 landing page

A static, responsive landing page for MakeSB at UC Santa Barbara, taking place January 16–17, 2027.

Open `index.html` directly or run a local static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Build the production artifact and run the worker checks:

```sh
npm run build
npm test
```
