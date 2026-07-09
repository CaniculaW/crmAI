# AI Model Configuration Design - 2026-07-09

## Scope

Add an independent system page for AI configuration. Phase 1 only supports OpenAI API model configuration. Local models and multi-provider routing are out of scope.

## User Experience

The system menu adds `AI配置`. Users with `system.ai-config.manage` can open the page, view the current OpenAI model configuration, edit it, enable or disable it, and run a connection test. API keys are never displayed in full after saving.

## Backend

Add table `sys_ai_model_configs` with provider, base URL, model name, encrypted/stored API key value, masked API key display value, enabled state, and last test result fields. V1 implementation stores the API key in the application database as a secret field and never returns it in API responses. A later hardening pass should move this value to KMS or an external secret manager.

Expose:

- `GET /api/system/ai-model-configs`
- `POST /api/system/ai-model-configs`
- `PUT /api/system/ai-model-configs/{configId}`
- `POST /api/system/ai-model-configs/{configId}/test`

All endpoints require `system.ai-config.manage`. Only one enabled OpenAI config is allowed.

Connection testing calls the configured OpenAI-compatible API endpoint `GET {base_url}/models/{model_name}` with `Authorization: Bearer <api_key>`.

## Frontend

Add `系统 -> AI配置` and render a model configuration page. The page includes provider, base URL, model name, API key, enabled status, masked key display, last test status, and actions for save and test connection.

## Testing

Backend tests cover permissions, API key masking, create/update/list, single enabled config behavior, and connection test success/failure with a local mock HTTP server. Frontend tests cover navigation and page rendering.
