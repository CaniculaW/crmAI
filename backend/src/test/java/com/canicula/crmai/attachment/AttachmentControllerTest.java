package com.canicula.crmai.attachment;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AttachmentControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsAndListsAttachmentMetadataByObject() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-create-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_create_" + suffix,
                departmentId,
                List.of("account.create", "attachment.create", "attachment.read"),
                List.of("global"));
        String token = login("attachment_create_" + suffix);
        Long accountId = createAccount(token, "附件客户-" + suffix, departmentId, userId);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "account",
                        "object_id", accountId,
                        "file_name", "组织架构图-" + suffix + ".pdf",
                        "file_url", "oss://crm/account/" + suffix + "/org.pdf",
                        "file_type", "organization_chart",
                        "file_size", 4096,
                        "remark", "客户组织资料"), authHeaders(token, "attachment-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-list-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'attachment.create' and object_id = ?",
                Integer.class,
                attachmentId);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode created = createResponse.getBody().path("data");
        assertThat(created.path("object_type").asText()).isEqualTo("account");
        assertThat(created.path("object_id").asLong()).isEqualTo(accountId);
        assertThat(created.path("file_name").asText()).isEqualTo("组织架构图-" + suffix + ".pdf");
        assertThat(created.path("file_url").asText()).isEqualTo("oss://crm/account/" + suffix + "/org.pdf");
        assertThat(created.path("file_size").asLong()).isEqualTo(4096);
        assertThat(created.path("uploaded_by").asLong()).isEqualTo(userId);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void uploadsAndDownloadsAttachmentFile() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-upload-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_upload_" + suffix,
                departmentId,
                List.of("account.create", "attachment.create", "attachment.read", "attachment.delete"),
                List.of("global"));
        String token = login("attachment_upload_" + suffix);
        Long accountId = createAccount(token, "附件上传客户-" + suffix, departmentId, userId);
        String fileName = "验收附件-" + suffix + ".txt";
        byte[] content = ("V2 attachment upload evidence " + suffix).getBytes(java.nio.charset.StandardCharsets.UTF_8);

        ResponseEntity<JsonNode> uploadResponse = restTemplate.exchange(
                "/api/attachments/upload",
                HttpMethod.POST,
                new HttpEntity<>(multipartUploadBody(accountId, fileName, content), multipartHeaders(token, "attachment-upload-trace-001")),
                JsonNode.class);

        assertThat(uploadResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode uploaded = uploadResponse.getBody().path("data");
        Long attachmentId = uploaded.path("id").asLong();
        assertThat(uploaded.path("object_type").asText()).isEqualTo("account");
        assertThat(uploaded.path("object_id").asLong()).isEqualTo(accountId);
        assertThat(uploaded.path("file_name").asText()).isEqualTo(fileName);
        assertThat(uploaded.path("file_url").asText()).isEqualTo("/api/attachments/" + attachmentId + "/download");
        assertThat(uploaded.path("file_size").asLong()).isEqualTo(content.length);
        assertThat(uploaded.path("mime_type").asText()).isEqualTo("text/plain");

        ResponseEntity<byte[]> downloadResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId + "/download",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-download-trace-001")),
                byte[].class);
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-upload-list-trace-001")),
                JsonNode.class);

        assertThat(downloadResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(downloadResponse.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_PLAIN);
        assertThat(downloadResponse.getBody()).isEqualTo(content);
        assertThat(downloadResponse.getHeaders().getContentDisposition().getFilename()).isEqualTo(fileName);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("file_url").asText()).isEqualTo("/api/attachments/" + attachmentId + "/download"));
    }

    @Test
    void sanitizesUploadedFilenameAndRequiresReadPermissionForDownload() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-security-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_security_" + suffix,
                departmentId,
                List.of("account.create", "attachment.create", "attachment.read"),
                List.of("global"));
        String token = login("attachment_security_" + suffix);
        Long accountId = createAccount(token, "附件安全客户-" + suffix, departmentId, userId);

        ResponseEntity<JsonNode> uploadResponse = restTemplate.exchange(
                "/api/attachments/upload",
                HttpMethod.POST,
                new HttpEntity<>(
                        multipartUploadBody(accountId, "../secret-" + suffix + ".txt", "safe content".getBytes()),
                        multipartHeaders(token, "attachment-security-upload-trace-001")),
                JsonNode.class);
        Long attachmentId = uploadResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<byte[]> anonymousDownloadResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId + "/download",
                HttpMethod.GET,
                new HttpEntity<>(traceHeaders("attachment-security-anonymous-download-trace-001")),
                byte[].class);

        assertThat(uploadResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(uploadResponse.getBody().path("data").path("file_name").asText()).isEqualTo("secret-" + suffix + ".txt");
        assertThat(anonymousDownloadResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsAttachmentMetadataWhenObjectIsNotReadable() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-deny-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "attachment_deny_creator_" + suffix,
                departmentId,
                List.of("account.create"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "attachment_deny_viewer_" + suffix,
                departmentId,
                List.of("attachment.create", "attachment.read"),
                List.of("own"));
        String creatorToken = login("attachment_deny_creator_" + suffix);
        String viewerToken = login("attachment_deny_viewer_" + suffix);
        Long hiddenAccountId = createAccount(creatorToken, "不可挂附件客户-" + suffix, departmentId, creatorUserId);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "account",
                        "object_id", hiddenAccountId,
                        "file_name", "越权资料.pdf",
                        "file_url", "oss://crm/account/hidden.pdf",
                        "file_type", "customer_material"), authHeaders(viewerToken, "attachment-deny-create-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + hiddenAccountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "attachment-deny-list-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(createResponse.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void deletesAttachmentMetadataWithAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-delete-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_delete_" + suffix,
                departmentId,
                List.of("account.create", "attachment.create", "attachment.read", "attachment.delete"),
                List.of("global"));
        String token = login("attachment_delete_" + suffix);
        Long accountId = createAccount(token, "附件删除客户-" + suffix, departmentId, userId);
        Long attachmentId = createAttachment(token, accountId, "待删除附件-" + suffix + ".docx");

        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-delete-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-delete-list-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'attachment.delete' and object_id = ?",
                Integer.class,
                attachmentId);

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void createsListsAndDeletesSolutionDocumentAttachmentMetadata() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-solution-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_solution_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "solution.create",
                        "solution.read",
                        "attachment.create",
                        "attachment.read",
                        "attachment.delete"),
                List.of("global"));
        String token = login("attachment_solution_" + suffix);
        Long accountId = createAccount(token, "方案附件客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "方案附件商机-" + suffix, departmentId, userId);
        Long solutionId = createSolutionDocument(token, accountId, opportunityId, userId, "投标文件-" + suffix);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "solution_document",
                        "object_id", solutionId,
                        "file_name", "投标报价-" + suffix + ".xlsx",
                        "file_url", "oss://crm/solution/" + suffix + "/quotation.xlsx",
                        "file_type", "quotation",
                        "file_size", 8192,
                        "mime_type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                        authHeaders(token, "attachment-solution-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=solution_document&object_id=" + solutionId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-solution-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-solution-delete-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("solution_document");
        assertThat(createResponse.getBody().path("data").path("file_url").asText())
                .isEqualTo("oss://crm/solution/" + suffix + "/quotation.xlsx");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
    }

    @Test
    void createsListsAndDeletesContractAttachmentMetadata() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-contract-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_contract_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "attachment.create",
                        "attachment.read",
                        "attachment.delete"),
                List.of("global"));
        String token = login("attachment_contract_" + suffix);
        Long accountId = createAccount(token, "合同附件客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "合同附件商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "contract",
                        "object_id", contractId,
                        "file_name", "盖章合同-" + suffix + ".pdf",
                        "file_url", "oss://crm/contract/" + suffix + "/stamped.pdf",
                        "file_type", "stamped_contract",
                        "file_size", 16384,
                        "mime_type", "application/pdf"),
                        authHeaders(token, "attachment-contract-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=contract&object_id=" + contractId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-contract-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-contract-delete-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("contract");
        assertThat(createResponse.getBody().path("data").path("file_url").asText())
                .isEqualTo("oss://crm/contract/" + suffix + "/stamped.pdf");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
    }

    @Test
    void createsListsAndDeletesInvoiceAttachmentMetadata() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-invoice-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_invoice_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "invoice.create",
                        "invoice.read",
                        "attachment.create",
                        "attachment.read",
                        "attachment.delete"),
                List.of("global"));
        String token = login("attachment_invoice_" + suffix);
        Long accountId = createAccount(token, "开票附件客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "开票附件商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);
        Long invoiceId = createInvoicePlan(token, contractId, userId, suffix);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "invoice",
                        "object_id", invoiceId,
                        "file_name", "发票扫描件-" + suffix + ".pdf",
                        "file_url", "oss://crm/invoice/" + suffix + "/scan.pdf",
                        "file_type", "invoice_scan",
                        "file_size", 10240,
                        "mime_type", "application/pdf"),
                        authHeaders(token, "attachment-invoice-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=invoice&object_id=" + invoiceId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-invoice-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-invoice-delete-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("invoice");
        assertThat(createResponse.getBody().path("data").path("file_url").asText())
                .isEqualTo("oss://crm/invoice/" + suffix + "/scan.pdf");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
    }

    @Test
    void createsListsAndDeletesReceivablePlanAttachmentMetadata() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-receivable-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_receivable_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "receivable.create",
                        "receivable.read",
                        "attachment.create",
                        "attachment.read",
                        "attachment.delete"),
                List.of("global"));
        String token = login("attachment_receivable_" + suffix);
        Long accountId = createAccount(token, "回款附件客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "回款附件商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);
        Long planId = createReceivablePlan(token, contractId, userId, suffix);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "receivable_plan",
                        "object_id", planId,
                        "file_name", "银行回单-" + suffix + ".pdf",
                        "file_url", "oss://crm/receivable/" + suffix + "/receipt.pdf",
                        "file_type", "bank_receipt",
                        "file_size", 16384,
                        "mime_type", "application/pdf"),
                        authHeaders(token, "attachment-receivable-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=receivable_plan&object_id=" + planId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-receivable-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-receivable-delete-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("receivable_plan");
        assertThat(createResponse.getBody().path("data").path("file_url").asText())
                .isEqualTo("oss://crm/receivable/" + suffix + "/receipt.pdf");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
    }

    @Test
    void createsListsAndDeletesPaymentAttachmentMetadata() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-payment-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_payment_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "receivable.create",
                        "receivable.read",
                        "payment.create",
                        "payment.read",
                        "attachment.create",
                        "attachment.read",
                        "attachment.delete"),
                List.of("global"));
        String token = login("attachment_payment_" + suffix);
        Long accountId = createAccount(token, "到账附件客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "到账附件商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);
        Long planId = createReceivablePlan(token, contractId, userId, suffix);
        Long paymentId = createPayment(token, contractId, planId, userId, suffix);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "payment",
                        "object_id", paymentId,
                        "file_name", "到账流水-" + suffix + ".png",
                        "file_url", "oss://crm/payment/" + suffix + "/flow.png",
                        "file_type", "bank_statement",
                        "file_size", 8192,
                        "mime_type", "image/png"),
                        authHeaders(token, "attachment-payment-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=payment&object_id=" + paymentId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-payment-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-payment-delete-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("payment");
        assertThat(createResponse.getBody().path("data").path("file_url").asText())
                .isEqualTo("oss://crm/payment/" + suffix + "/flow.png");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
    }

    private Long createAttachment(String accessToken, Long accountId, String fileName) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "account",
                        "object_id", accountId,
                        "file_name", fileName,
                        "file_url", "oss://crm/account/" + fileName,
                        "file_type", "customer_material"), authHeaders(accessToken, "attachment-helper-create-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createAccount(String accessToken, String accountName, Long departmentId, Long ownerUserId) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_name", accountName);
        request.put("account_type", "enterprise");
        request.put("account_status", "following");
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("collaborators", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "attachment-helper-account-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createOpportunity(
            String accessToken,
            Long accountId,
            String opportunityName,
            Long departmentId,
            Long ownerUserId) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_name", opportunityName);
        request.put("stage", "proposal");
        request.put("status", "following");
        request.put("level", "A");
        request.put("source", "customer");
        request.put("potential_point", "年度数字化项目");
        request.put("estimated_budget_amount", 1000000);
        request.put("estimated_contract_amount", 800000);
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("risk_status", "normal");
        request.put("collaborators", List.of());
        request.put("contact_relations", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/opportunities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "attachment-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createSolutionDocument(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String documentName) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/solutions",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "account_id", accountId,
                        "opportunity_id", opportunityId,
                        "document_name", documentName,
                        "document_type", "bid_document",
                        "version_no", "V1.0",
                        "status", "drafting",
                        "owner_user_id", ownerUserId),
                        authHeaders(accessToken, "attachment-helper-solution-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createContract(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String suffix) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/contracts",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "account_id", accountId,
                        "opportunity_id", opportunityId,
                        "contract_name", "附件测试合同-" + suffix,
                        "contract_no", "ATT-CON-" + suffix,
                        "contract_type", "project",
                        "contract_status", "performing",
                        "contract_amount", 900000,
                        "tax_rate", 0.13,
                        "owner_user_id", ownerUserId,
                        "business_owner_id", ownerUserId),
                        authHeaders(accessToken, "attachment-helper-contract-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createInvoicePlan(
            String accessToken,
            Long contractId,
            Long ownerUserId,
            String suffix) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/invoices",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "contract_id", contractId,
                        "plan_name", "附件测试开票-" + suffix,
                        "planned_invoice_date", "2026-07-15T10:00:00+08:00",
                        "planned_amount", 120000,
                        "invoice_type", "vat_special",
                        "tax_rate", 0.13,
                        "owner_user_id", ownerUserId),
                        authHeaders(accessToken, "attachment-helper-invoice-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createReceivablePlan(
            String accessToken,
            Long contractId,
            Long ownerUserId,
            String suffix) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/receivable-plans",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "contract_id", contractId,
                        "plan_name", "附件测试回款-" + suffix,
                        "plan_stage", "首付款",
                        "planned_receivable_date", "2026-07-20T10:00:00+08:00",
                        "planned_amount", 180000,
                        "owner_user_id", ownerUserId,
                        "payment_terms_snapshot", "20%预付款"),
                        authHeaders(accessToken, "attachment-helper-receivable-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createPayment(
            String accessToken,
            Long contractId,
            Long planId,
            Long ownerUserId,
            String suffix) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/payments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "contract_id", contractId,
                        "receivable_plan_id", planId,
                        "payment_name", "附件测试到账-" + suffix,
                        "received_at", "2026-07-22T10:00:00+08:00",
                        "received_amount", 180000,
                        "payment_method", "bank_transfer",
                        "payer_name", "附件测试客户付款主体",
                        "bank_flow_no", "ATT-FLOW-" + suffix,
                        "owner_user_id", ownerUserId),
                        authHeaders(accessToken, "attachment-helper-payment-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "附件测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "attachment_role_" + username,
                "附件测试角色",
                "附件测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "附件测试用户",
                null,
                username + "@example.com",
                "sales_rep",
                "active"));
        identityService.createLoginAccount(new LoginAccountCreateRequest(
                userId,
                "username",
                username,
                true,
                "active"));
        identityService.assignRole(userId, roleId);
        permissions.forEach(permission ->
                identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permission)));
        dataScopes.forEach(scope -> {
            grantDataScope(roleId, "account", scope);
            grantDataScope(roleId, "contact", scope);
            grantDataScope(roleId, "opportunity", scope);
            grantDataScope(roleId, "activity", scope);
            grantDataScope(roleId, "solution", scope);
            grantDataScope(roleId, "contract", scope);
        });
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");
        return userId;
    }

    private void grantDataScope(Long roleId, String moduleCode, String scopeCode) {
        Long dataScopeId = jdbcTemplate.queryForObject(
                "select id from sys_data_scopes where scope_code = ?",
                Long.class,
                scopeCode);
        jdbcTemplate.update(
                """
                insert into sys_role_data_scopes (role_id, module_code, data_scope_id)
                values (?, ?, ?)
                """,
                roleId,
                moduleCode,
                dataScopeId);
    }

    private String login(String username) {
        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("attachment-login-trace-001")),
                JsonNode.class);
        return loginResponse.getBody().path("data").path("access_token").asText();
    }

    private static HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Trace-Id", traceId);
        return headers;
    }

    private static HttpHeaders authHeaders(String accessToken, String traceId) {
        HttpHeaders headers = traceHeaders(traceId);
        headers.setBearerAuth(accessToken);
        return headers;
    }

    private static HttpHeaders multipartHeaders(String accessToken, String traceId) {
        HttpHeaders headers = authHeaders(accessToken, traceId);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return headers;
    }

    private static MultiValueMap<String, Object> multipartUploadBody(Long accountId, String fileName, byte[] content) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("object_type", "account");
        body.add("object_id", accountId.toString());
        body.add("file_type", "customer_material");
        body.add("remark", "真实上传下载验收");
        body.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return fileName;
            }
        });
        return body;
    }
}
