# CRM AI Public Account Relations Upgrade Validation - 2026-07-21

## Target

- Public URL: `http://120.55.73.23/`
- Public API: `http://120.55.73.23/api/*`
- Server runtime path: `/opt/crmAI/runtime`
- Source branch: `codex/account-related-details`
- Deployed commit: `8b02eb24c32f9c09d265aa3321922d8dc47260d0`

## Upgrade Scope

This release updated the frontend static assets only. The backend JAR and PostgreSQL data were not changed.

The release adds customer-detail related contact and opportunity lists, contact and opportunity deep links, permission-aware loading, stale-response protection, independent error states, synchronized URL filters, and contained mobile table scrolling.

## Artifact And Backup

- Uploaded artifact: `/opt/crmAI/runtime/uploads/crm-frontend-8b02eb2.tgz`
- Artifact SHA-256: `b2b16f3294e4bd388d1448d6af94df7c390d42d769091c20db78c84701e7b8db`
- Backup directory: `/opt/crmAI/runtime/backups/20260721-183234-8b02eb2`
- Backup archive: `frontend-before.tgz`
- Previous live directory retained as: `/opt/crmAI/runtime/frontend/dist-before-8b02eb2`

The uploaded artifact hash matched the local release artifact before activation.

## Deployment Actions

1. Verified the three CRM containers and available disk space.
2. Created a timestamped backup of the live frontend distribution and Nginx configuration.
3. Uploaded and hash-verified the new frontend archive.
4. Extracted the release into a staging directory and verified all referenced assets.
5. Switched the mounted frontend `dist` directory to the staged release.
6. Restarted only `crm-ai-frontend`.
7. Verified server-local health, public health, login, route behavior, and browser console/network results.

## Runtime Status

| Component | Status | Exposure |
| --- | --- | --- |
| `crm-ai-frontend` | Up after restart | `0.0.0.0:80->80/tcp` |
| `crm-ai-backend` | Up, not restarted | `127.0.0.1:8080->8080/tcp` |
| `crm-ai-db` | Up, not restarted | `127.0.0.1:55432->5432/tcp` |

## Validation Results

| Check | Result |
| --- | --- |
| Pre-deployment frontend tests | `192/192` passed |
| Pre-deployment production build | Passed, `3216` modules transformed |
| Server-local frontend | HTTP `200` |
| Server-local backend health | `status=UP` |
| Public frontend | HTTP `200` |
| Public API health | `status=UP` |
| Public V4 browser smoke | `24/24` route checks passed |
| Public account/contact/opportunity browser smoke | `6/6` desktop/mobile checks passed |
| Browser console failures | `0` |
| Failed application responses | `0` |
| Contact deep link | `/contacts?account_id=1&contact_id=1` passed |
| Opportunity deep link | `/opportunities?account_id=1&opportunity_id=1` passed |

Public Nginx access logs confirmed HTTP `200` responses for the scoped contact and opportunity list/detail requests used by the browser smoke.

## Rollback

If rollback is required:

1. Move the current `/opt/crmAI/runtime/frontend/dist` aside.
2. Restore `/opt/crmAI/runtime/frontend/dist-before-8b02eb2` as `dist`, or extract `frontend-before.tgz` into `/opt/crmAI/runtime/frontend`.
3. Restart `crm-ai-frontend`.
4. Re-run public frontend, health, login, and scoped detail checks.

## Security Observations

- The server continues to receive unsolicited Internet scans and SSH login attempts.
- Root password login, public HTTP without TLS, the demo account, and CentOS 7.9 remain production-hardening risks.
- Recommended next actions remain SSH key-only access, root password rotation, HTTPS/domain binding, demo-account replacement, and migration to a supported operating system.

## Conclusion

Public upgrade result: **GO**.

