# Demo Mode Rollback Report

## Disable Demo Mode (required after recording)

1. Open `.env.local`
2. Set `DEMO_MODE=false` (or remove the line)
3. Restart backend: `yarn dev`
4. Verify: `GET http://127.0.0.1:4001/demo-mode/status` → `{ "enabled": false }`
5. Send a non-certified message on WhatsApp — confirm normal ML routing resumes

## Optional Full Removal (future)

1. Remove `DemoModeModule` import from `whatsapp.module.ts`
2. Remove demo hook block from `whatsapp.service.ts`
3. Delete `src/services/demo-mode/` directory
4. Remove `scripts/run-demo-mode-validation.mjs`

## Production Verification Checklist

- [ ] `DEMO_MODE=false`
- [ ] Certified phrase **not** intercepted (e.g. inventory without demo prefix behaves via ML)
- [ ] Workflow sessions behave normally
- [ ] No `demo-mode intercept` lines in server logs

## Safety

Demo code is isolated in `src/services/demo-mode/`. Production paths are untouched when disabled.
