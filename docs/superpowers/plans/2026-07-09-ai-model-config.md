# AI Model Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first AI configuration page for OpenAI API model settings.

**Architecture:** Add a system-governed backend resource for OpenAI model config, then expose it in the existing React system section. Keep V1 focused on one provider and one enabled configuration, with masked API key responses and audit logging.

**Tech Stack:** Spring Boot, JDBC, Flyway, JUnit, React, Ant Design, Vitest.

---

### Task 1: Backend Model Configuration API

**Files:**
- Create: `backend/src/main/resources/db/migration/V35__create_ai_model_config.sql`
- Create: `backend/src/main/java/com/canicula/crmai/ai/config/*`
- Create: `backend/src/test/java/com/canicula/crmai/ai/config/AiModelConfigControllerTest.java`

- [ ] Add migration with table and `system.ai-config.manage` permission.
- [ ] Write controller tests for list/create/update/test connection.
- [ ] Implement service, DTOs, controller, masking, and audit logging.
- [ ] Run `mvn -Dtest=AiModelConfigControllerTest test`.

### Task 2: Frontend AI Configuration Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] Add API client types and methods.
- [ ] Add system navigation item `AI配置`.
- [ ] Add model configuration page under `/system/ai-config`.
- [ ] Add Vitest coverage for the page and menu.
- [ ] Run `npm test -- src/App.test.tsx --run`.

### Task 3: Verification

**Files:**
- No production source changes.

- [ ] Run `mvn -Dtest=AiModelConfigControllerTest,IdentityAdminControllerTest test`.
- [ ] Run `npm run build`.
- [ ] Run `npm test -- src/App.test.tsx --run`.
- [ ] Commit and push once all verification passes.
