# Demo Service Health Report

**Timestamp:** 2026-06-02T15:38:27.870Z

## Service Matrix

| Service | URL / Endpoint | HTTP | Result |
|---------|----------------|------|--------|
| Backend | http://127.0.0.1:4001/health | 200 | ok |
| ML | http://127.0.0.1:8000/health | 200 | ok |
| Demo Mode | http://127.0.0.1:4001/demo-mode/status | 200 | enabled=true |
| Migrations | http://127.0.0.1:4001/health/migrations | 200 | up_to_date=true |
| Postgres (via backend) | 65.1.128.181:5431 | — | up |

## WhatsApp Integration

- Olli URL: https://api.getolliai.com/api/v1
- Configured: true
- Owner outbound: HTTP 200, WhatsApp message_id wamid.HBgMOTE3NDUyODk3NDQ0FQIAERgSOTRDNjVFNDNGOUFBODk5OTdBAA==
- Manager outbound: HTTP 200, WhatsApp message_id wamid.HBgMOTE5NDU2MTU3MDA3FQIAERgSMTcyODMzRDg3RDJCQzA4RDZDAA==

## Background Components

- **Schedulers:** NestJS cron (attendance reminders) — runs inside backend process
- **Queues:** Not used in demo path
- **Document processing:** Available via REST; demo uses NL intercept for upload phrase
