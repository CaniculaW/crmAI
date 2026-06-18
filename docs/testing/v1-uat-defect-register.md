# CRM V1 UAT Defect Register

Version: v1.0.0-rc.8

Decision: No-Go

Purpose: track P0/P1 closure and regression evidence before V1 can pass final validation. This register is the defect-level source for the UAT evidence pack, execution tracker, and evidence manifest.

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。
- P0/S1 and P1/S2 open counts must be `0` before V1 can be marked `Go`.
- Every closed P0/S1 or P1/S2 defect must include owner, resolution, regression evidence, and business decision.
- Validate with `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md`.

## Severity Summary

| Severity | Total | Open | Closure evidence |
|---|---:|---:|---|
| P0 / S1 阻断 | 待填写 | 待填写 | 待补充 |
| P1 / S2 严重 | 待填写 | 待填写 | 待补充 |
| P2 / S3 一般 | 待填写 | 待填写 | 待补充 |
| P3 / S4 轻微 | 待填写 | 待填写 | 待补充 |

## Defect Details

| Defect ID | Severity | Source case | Status | Owner | Resolution | Regression evidence | Business decision |
|---|---|---|---|---|---|---|---|
| DEF-DRAFT | PENDING | 待补充 | PENDING | 待补充 | 待补充 | 待补充 | 待补充 |
