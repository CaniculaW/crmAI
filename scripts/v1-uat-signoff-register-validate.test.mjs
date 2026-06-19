import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUatSignoffRegister } from "./v1-uat-signoff-register-validate.mjs";

const completeRegister = `# CRM V1 UAT Signoff Register

Version: v1.0.0-rc.8
Decision: Go

| Signoff ID | Role | Owner | Decision | Signed date | Evidence reference | Notes |
|---|---|---|---|---|---|---|
| SIGNOFF-SALES | 销售侧验收人 | Sales Owner | 同意 | 2026-06-19 | meeting-minutes#sales | 销售侧验收通过 |
| SIGNOFF-MANAGER | 管理侧验收人 | Manager Owner | 同意 | 2026-06-19 | meeting-minutes#manager | 管理侧验收通过 |
| SIGNOFF-PRODUCT | 产品负责人 | Product Owner | 同意 | 2026-06-19 | meeting-minutes#product | 范围确认 |
| SIGNOFF-TEST | 测试负责人 | QA Owner | 同意 | 2026-06-19 | test-report#summary | 测试准出 |
| SIGNOFF-DEV | 研发负责人 | Dev Owner | 同意 | 2026-06-19 | release-note#engineering | 研发准出 |
| SIGNOFF-PM | 项目负责人 | PM Owner | Go | 2026-06-19 | go-no-go-meeting#decision | 项目同意 V1 试点 |
`;

test("passes a complete signed Go register", () => {
  const result = evaluateUatSignoffRegister(completeRegister);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails the draft signoff register because signoffs are pending", () => {
  const draft = `# CRM V1 UAT Signoff Register

Version: v1.0.0-rc.8
Decision: No-Go

| Signoff ID | Role | Owner | Decision | Signed date | Evidence reference | Notes |
|---|---|---|---|---|---|---|
| SIGNOFF-SALES | 销售侧验收人 | 待填写 | PENDING | 待补充 | 待补充 | 销售侧签署待完成 |
| SIGNOFF-MANAGER | 管理侧验收人 | 待填写 | PENDING | 待补充 | 待补充 | 管理侧签署待完成 |
| SIGNOFF-PRODUCT | 产品负责人 | 待填写 | PENDING | 待补充 | 待补充 | 产品签署待完成 |
| SIGNOFF-TEST | 测试负责人 | 待填写 | PENDING | 待补充 | 待补充 | 测试签署待完成 |
| SIGNOFF-DEV | 研发负责人 | 待填写 | PENDING | 待补充 | 待补充 | 研发签署待完成 |
| SIGNOFF-PM | 项目负责人 | 待填写 | No-Go | 待补充 | 待补充 | 项目结论待完成 |
`;

  const result = evaluateUatSignoffRegister(draft);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "required-signoffs"));
  assert.ok(result.failed.some((check) => check.id === "project-go-decision"));
});

test("fails when a required signoff role is missing", () => {
  const result = evaluateUatSignoffRegister(completeRegister.replace(/\| SIGNOFF-TEST .+\n/, ""));

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-roles"));
});

test("fails when an approved signoff lacks concrete evidence", () => {
  const withoutEvidence = completeRegister.replace(
    "| SIGNOFF-SALES | 销售侧验收人 | Sales Owner | 同意 | 2026-06-19 | meeting-minutes#sales | 销售侧验收通过 |",
    "| SIGNOFF-SALES | 销售侧验收人 | Sales Owner | 同意 | 2026-06-19 | 待补充 | 销售侧验收通过 |"
  );

  const result = evaluateUatSignoffRegister(withoutEvidence);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-signoffs"));
});

test("fails when the project owner does not explicitly sign Go", () => {
  const noGo = completeRegister.replace(
    "| SIGNOFF-PM | 项目负责人 | PM Owner | Go | 2026-06-19 | go-no-go-meeting#decision | 项目同意 V1 试点 |",
    "| SIGNOFF-PM | 项目负责人 | PM Owner | Conditional Go | 2026-06-19 | go-no-go-meeting#decision | 条件准出 |"
  );

  const result = evaluateUatSignoffRegister(noGo);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "project-go-decision"));
});

test("fails when signoff register contains secret-like material", () => {
  const unsafe = `${completeRegister}\nOperator password: S3cure!123\n`;

  const result = evaluateUatSignoffRegister(unsafe);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
