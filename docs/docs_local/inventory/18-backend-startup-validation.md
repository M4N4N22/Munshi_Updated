# Backend Startup Validation Report

**Run date:** 2026-06-05  
**Post DEF-LOCAL-001 fix**

---

## 1. Startup Command

```powershell
cd backend
yarn dev
# validation also run via: npx nest start
```

Environment: `env-cmd -f .env.local nest start --watch`

---

## 2. Startup Logs

### Pre-fix (reproduced)

```text
[InstanceLoader] ConfigHostModule dependencies initialized
ERROR [ExceptionHandler] UnknownDependenciesException
  → OwnerHomeService at index [10] not available in WhatsAppModule context
```

### Post-fix (verified)

```text
[Migrations] Database schema is up to date
[NestFactory] Starting Nest application...
[SqlService] All models initialized and associated.
[SqlService] Successfully connected to PostgreSQL (localhost:5432)
[InstanceLoader] WhatsAppModule dependencies initialized +1ms
[RoutesResolver] WhatsAppController {/webhook}
[RouterExplorer] Mapped {/webhook, GET} route
[RouterExplorer] Mapped {/webhook, POST} route
[RouterExplorer] Mapped {/webhook/test, POST} route
[NestApplication] Nest application successfully started +32ms
```

Full log: `docs/docs_local/inventory/_startup-validation-output.txt`

**Port note:** If `yarn dev` is already running, a second start attempt logs `EADDRINUSE :::4001`. This is environmental, not a DI failure.

---

## 3. NestJS Status

| Check | Result |
|-------|--------|
| Compilation | **PASS** — 0 TypeScript errors |
| Auto-migrate on boot | **PASS** |
| DB connection | **PASS** |
| All modules initialized | **PASS** |
| Application bootstrap | **PASS** |
| DI resolution | **PASS** — no unresolved providers |

**Verdict: PASS**

---

## 4. WhatsAppModule Status

| Check | Result | Evidence |
|-------|--------|----------|
| Module loads | **PASS** | `WhatsAppModule dependencies initialized` |
| WhatsAppService DI | **PASS** | No UnknownDependenciesException |
| OwnerHomeService registered | **PASS** | Provider restored in module |
| WhatsAppController routes | **PASS** | `/webhook` GET/POST mapped |
| AttendanceCronService | **PASS** | Registered alongside WhatsAppService |

**Verdict: PASS**

---

## 5. Integration Test Status

**Command:** `yarn test:integration`

```text
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Failures:    0
Time:        9.823 s
Exit code:   0
```

**Verdict: PASS**

---

## 6. Final Verdict

| Component | Verdict |
|-----------|---------|
| Backend startup (Nest bootstrap + DI) | **PASS** |
| WhatsAppModule | **PASS** |
| Integration tests | **PASS** |
| Inventory runtime unchanged | **PASS** |
| DEF-LOCAL-001 | **FIXED** |

### Overall: **PASS**

Backend starts successfully with all NestJS dependencies resolved. WhatsAppModule loads correctly. Inventory integration suite remains 12/12 passing.
