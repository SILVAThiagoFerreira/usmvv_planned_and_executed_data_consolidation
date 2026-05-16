# Tests

Execute os testes locais com:

```bash
npm test
```

Para validar o fluxo real no navegador, execute o smoke test com um servidor estatico.

```bash
python "C:\Users\ferre\.claude\skills\webapp-testing\scripts\with_server.py" --server "python -m http.server 4173 --bind 127.0.0.1" --port 4173 -- python tests/browser_smoke.py --base-url http://127.0.0.1:4173
```
