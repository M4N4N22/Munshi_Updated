# Demo User Validation Report

**Factory 3 demo phones**

| Role | Display Phone | WhatsApp `from` | Name | User ID | Role OK |
|------|---------------|-------------------|------|---------|---------|
| Owner | 7452897444 | 917452897444 | Shantanu Garg | 21 | ✅ |
| Manager | 9456157007 | 919456157007 | Rahul Verma | 34 | ✅ |

## Department Access

- **Owner (7452897444):** Factory owner; manages Inventory department (demo routing).
- **Manager (9456157007):** Manager of **Operations** department.

## Worker (supporting cast)

- **Rahul Kumar** — `919876543211` — demo worker for task assignment flows.

## Verification Result

**PASS** — Both demo phone numbers exist, belong to Factory 3, and have correct roles. No duplicate users were created; existing Shantanu account was promoted to OWNER; manager account was created only once.

## Recording Notes

Use the real WhatsApp numbers above. During prep/validation, `POST /webhook/test` was used; **do not use webhook test during video recording**.
