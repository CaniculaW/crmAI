package com.canicula.crmai.attachment;

import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.contact.ContactService;
import com.canicula.crmai.contract.ContractService;
import com.canicula.crmai.invoice.InvoiceService;
import com.canicula.crmai.opportunity.OpportunityService;
import com.canicula.crmai.payment.PaymentService;
import com.canicula.crmai.receivable.ReceivablePlanService;
import com.canicula.crmai.solution.SolutionDocumentService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.PreparedStatement;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AttachmentService {

    public record AttachmentDownload(AttachmentResponse attachment, Path path) {
    }

    private final JdbcTemplate jdbcTemplate;
    private final Path storageRoot;
    private final AccountService accountService;
    private final ContactService contactService;
    private final OpportunityService opportunityService;
    private final ActivityService activityService;
    private final SolutionDocumentService solutionDocumentService;
    private final ContractService contractService;
    private final InvoiceService invoiceService;
    private final ReceivablePlanService receivablePlanService;
    private final PaymentService paymentService;

    AttachmentService(
            JdbcTemplate jdbcTemplate,
            @Value("${crm.attachments.storage-dir:${java.io.tmpdir}/crm-ai-attachments}") String storageDir,
            AccountService accountService,
            ContactService contactService,
            OpportunityService opportunityService,
            ActivityService activityService,
            SolutionDocumentService solutionDocumentService,
            ContractService contractService,
            InvoiceService invoiceService,
            ReceivablePlanService receivablePlanService,
            PaymentService paymentService) {
        this.jdbcTemplate = jdbcTemplate;
        this.storageRoot = Path.of(storageDir).toAbsolutePath().normalize();
        this.accountService = accountService;
        this.contactService = contactService;
        this.opportunityService = opportunityService;
        this.activityService = activityService;
        this.solutionDocumentService = solutionDocumentService;
        this.contractService = contractService;
        this.invoiceService = invoiceService;
        this.receivablePlanService = receivablePlanService;
        this.paymentService = paymentService;
    }

    @Transactional
    public AttachmentResponse create(AttachmentCreateRequest request, Long actorUserId) {
        String objectType = normalizeObjectType(request.object_type());
        validateObjectReadable(objectType, request.object_id(), actorUserId);
        Long attachmentId = insertAttachment(request, objectType, actorUserId);
        return findById(attachmentId);
    }

    @Transactional
    public AttachmentResponse upload(
            String objectType,
            Long objectId,
            MultipartFile file,
            String fileType,
            String remark,
            Long actorUserId) {
        String normalizedObjectType = normalizeObjectType(objectType);
        validateObjectReadable(normalizedObjectType, objectId, actorUserId);
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException("上传文件不能为空");
        }

        String fileName = safeFileName(file.getOriginalFilename());
        AttachmentCreateRequest request = new AttachmentCreateRequest(
                normalizedObjectType,
                objectId,
                fileName,
                "local://pending",
                fileType,
                file.getSize(),
                normalizeText(file.getContentType()),
                remark);
        Long attachmentId = insertAttachment(request, normalizedObjectType, actorUserId);
        storeFile(attachmentId, fileName, file);
        jdbcTemplate.update(
                """
                update crm_attachments
                set file_url = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                """,
                downloadUrl(attachmentId),
                actorUserId,
                attachmentId);
        return findById(attachmentId);
    }

    public List<AttachmentResponse> listByObject(String objectType, Long objectId, Long actorUserId) {
        String normalizedObjectType = normalizeObjectType(objectType);
        validateObjectReadable(normalizedObjectType, objectId, actorUserId);
        return jdbcTemplate.query(
                """
                select *
                from crm_attachments
                where object_type = ?
                  and object_id = ?
                  and deleted_at is null
                order by uploaded_at desc, id desc
                """,
                (rs, rowNum) -> toResponse(rs.getLong("id")),
                normalizedObjectType,
                objectId);
    }

    @Transactional
    public AttachmentResponse delete(Long attachmentId, Long actorUserId) {
        AttachmentResponse current = readableAttachment(attachmentId, actorUserId);
        jdbcTemplate.update(
                """
                update crm_attachments
                set deleted_at = current_timestamp,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                actorUserId,
                attachmentId);
        deleteLocalFileIfPresent(current);
        return current;
    }

    public AttachmentDownload download(Long attachmentId, Long actorUserId) {
        AttachmentResponse current = readableAttachment(attachmentId, actorUserId);
        if (!downloadUrl(attachmentId).equals(current.file_url())) {
            throw new BusinessRuleException("附件文件不是本地上传文件");
        }
        Path path = localFilePath(attachmentId, current.file_name());
        if (!Files.isRegularFile(path)) {
            throw new BusinessRuleException("附件文件不存在");
        }
        return new AttachmentDownload(current, path);
    }

    private AttachmentResponse readableAttachment(Long attachmentId, Long actorUserId) {
        AttachmentResponse current = findById(attachmentId);
        validateObjectReadable(current.object_type(), current.object_id(), actorUserId);
        return current;
    }

    private Long insertAttachment(AttachmentCreateRequest request, String objectType, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_attachments (
                        object_type, object_id, file_name, file_url, file_type,
                        file_size, mime_type, uploaded_by, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setString(1, objectType);
            statement.setObject(2, request.object_id());
            statement.setString(3, request.file_name().trim());
            statement.setString(4, request.file_url().trim());
            statement.setString(5, normalizeText(request.file_type()));
            statement.setObject(6, request.file_size());
            statement.setString(7, normalizeText(request.mime_type()));
            statement.setObject(8, actorUserId);
            statement.setString(9, normalizeText(request.remark()));
            statement.setObject(10, actorUserId);
            statement.setObject(11, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private AttachmentResponse findById(Long attachmentId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_attachments
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new AttachmentResponse(
                            rs.getLong("id"),
                            rs.getString("object_type"),
                            rs.getLong("object_id"),
                            rs.getString("file_name"),
                            rs.getString("file_url"),
                            rs.getString("file_type"),
                            nullableLong(rs.getObject("file_size")),
                            rs.getString("mime_type"),
                            nullableLong(rs.getObject("uploaded_by")),
                            nullableOffsetDateTime(rs.getObject("uploaded_at")),
                            rs.getString("remark")),
                    attachmentId);
        } catch (EmptyResultDataAccessException exception) {
            throw new BusinessRuleException("附件不存在或已删除");
        }
    }

    private AttachmentResponse toResponse(Long attachmentId) {
        return findById(attachmentId);
    }

    private void storeFile(Long attachmentId, String fileName, MultipartFile file) {
        Path path = localFilePath(attachmentId, fileName);
        try {
            Files.createDirectories(path.getParent());
            file.transferTo(path);
        } catch (IOException exception) {
            throw new BusinessRuleException("附件文件保存失败");
        }
    }

    private void deleteLocalFileIfPresent(AttachmentResponse attachment) {
        if (!downloadUrl(attachment.id()).equals(attachment.file_url())) {
            return;
        }
        try {
            Files.deleteIfExists(localFilePath(attachment.id(), attachment.file_name()));
        } catch (IOException ignored) {
        }
    }

    private Path localFilePath(Long attachmentId, String fileName) {
        Path path = storageRoot.resolve(String.valueOf(attachmentId)).resolve(safeFileName(fileName)).normalize();
        if (!path.startsWith(storageRoot)) {
            throw new BusinessRuleException("附件文件路径无效");
        }
        return path;
    }

    private void validateObjectReadable(String objectType, Long objectId, Long actorUserId) {
        if (objectId == null) {
            throw new BusinessRuleException("附件对象ID不能为空");
        }
        try {
            switch (objectType) {
                case "account" -> accountService.readableDetail(objectId, actorUserId);
                case "contact" -> contactService.readableDetail(objectId, actorUserId);
                case "opportunity" -> opportunityService.readableDetail(objectId, actorUserId);
                case "activity" -> activityService.readableDetail(objectId, actorUserId);
                case "solution_document" -> solutionDocumentService.readableDetail(objectId, actorUserId);
                case "contract" -> contractService.readableDetail(objectId, actorUserId);
                case "invoice" -> invoiceService.readableDetail(objectId, actorUserId);
                case "receivable_plan" -> receivablePlanService.readableDetail(objectId, actorUserId);
                case "payment" -> paymentService.readableDetail(objectId, actorUserId);
                default -> throw new BusinessRuleException("不支持的附件对象类型");
            }
        } catch (IllegalArgumentException exception) {
            throw new ForbiddenException("无权访问附件对象");
        }
    }

    private static String normalizeObjectType(String objectType) {
        if (!hasText(objectType)) {
            throw new BusinessRuleException("附件对象类型不能为空");
        }
        return objectType.trim().toLowerCase(Locale.ROOT);
    }

    private static String safeFileName(String fileName) {
        if (!hasText(fileName)) {
            throw new BusinessRuleException("附件名称不能为空");
        }
        String normalized = fileName.trim().replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        String baseName = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
        String safeName = baseName.replaceAll("[/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (!hasText(safeName) || ".".equals(safeName) || "..".equals(safeName)) {
            throw new BusinessRuleException("附件名称无效");
        }
        return safeName.length() > 255 ? safeName.substring(0, 255) : safeName;
    }

    private static String downloadUrl(Long attachmentId) {
        return "/api/attachments/" + attachmentId + "/download";
    }

    private static String normalizeText(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static OffsetDateTime nullableOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant().atOffset(OffsetDateTime.now().getOffset());
        }
        return null;
    }
}
