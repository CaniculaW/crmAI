package com.canicula.crmai.attachment;

import java.time.OffsetDateTime;

public record AttachmentResponse(
        Long id,
        String object_type,
        Long object_id,
        String file_name,
        String file_url,
        String file_type,
        Long file_size,
        String mime_type,
        Long uploaded_by,
        OffsetDateTime uploaded_at,
        String remark) {
}
