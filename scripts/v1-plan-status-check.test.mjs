import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1PlanStatusSnapshot } from "./v1-plan-status-check.mjs";

const incompletePlan = `
# 项目型大客户CRM研发启动实施计划

**Goal:** 启动项目型大客户CRM研发，先交付可上线试点的V1销售基础闭环。

### Task 1: 启动会与范围冻结

- [ ] **Step 1: 召开研发启动会**
- [ ] **Step 2: 形成启动会纪要**
- [ ] **Step 3: 冻结V1范围**

### Task 8: 测试与验收

- [ ] **Step 3: 业务验收**

## 14. 下一步行动清单

- [ ] 指定产品负责人、研发负责人、业务验收人。
- [ ] 召开研发启动会。
`;

const noGoStatus = `
# CRM V1 Validation Status

Overall: No-Go

## Open Blockers

- FAIL Kickoff Governance/required-owners: Incomplete kickoff owners.
- FAIL UAT Execution Tracker/uat-cases: Incomplete UAT cases.
- FAIL UAT Signoff Register/required-signoffs: Incomplete signoffs.
`;

test("passes when open plan items are reflected by V1 No-Go evidence", () => {
  const result = evaluateV1PlanStatusSnapshot({
    planText: incompletePlan,
    validationStatusText: noGoStatus,
    releaseGateResult: {
      ok: false,
      decision: "No-Go",
      failed: [{ id: "kickoff-governance" }, { id: "uat-execution-tracker" }]
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "open-plan-items-no-go"));
});

test("fails when open plan items are paired with a Go validation status", () => {
  const result = evaluateV1PlanStatusSnapshot({
    planText: incompletePlan,
    validationStatusText: noGoStatus.replace("Overall: No-Go", "Overall: Go"),
    releaseGateResult: {
      ok: false,
      decision: "No-Go",
      failed: [{ id: "kickoff-governance" }]
    }
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "open-plan-items-no-go"));
});
