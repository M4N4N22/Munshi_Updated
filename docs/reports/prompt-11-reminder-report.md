# Prompt 11 — Reminder Report

## SECTION A — Backend Implementation

Reminder framework uses **scheduled lookup**, not per-session timers.

| Rule | Implementation |
|------|----------------|
| 24h inactive | First reminder; schedule final at +7d |
| 7d after first | Final reminder |
| After final | `status=PAUSED`, `reminder_stage=PAUSED`, no further reminders |
| Forever resumable | `POST /business-discovery/resume` or workflow restart |

`BusinessDiscoveryReminderCronService` runs hourly, queries `next_reminder_at <= now` for `ACTIVE` profiles.

Activity touch (workflow step, API, document boost) resets `reminder_stage` and schedules next 24h window.

Ops endpoint: `POST /business-discovery/reminder?factory_id=`.

## SECTION B — LLM Requirements

Reminder copy references natural resume phrases: "continue setup", `/business_discovery`. No new intents required for cron delivery (future: proactive WhatsApp push).

## SECTION C — Contract Requirements

Reminder stages: `0=NONE`, `1=FIRST_SENT`, `2=FINAL_SENT`, `3=PAUSED`. Documented in `backend-llm-contract.md` §12.

## SECTION D — Training Data Requirements

N/A for cron. If proactive WhatsApp reminders added, classify owner "stop reminding me" as pause intent.

## SECTION E — Future Automation Opportunities

WhatsApp outbound reminders via notification service; backoff based on owner engagement score.
