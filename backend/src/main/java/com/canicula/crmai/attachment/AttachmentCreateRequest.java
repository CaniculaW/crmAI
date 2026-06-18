package com.canicula.crmai.attachment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AttachmentCreateRequest(
        @NotBlank @Size(max = 64) String object_type,
        @NotNull Long object_id,
        @NotBlank @Size(max = 255) String file_name,
        @NotBlank @Size(max = 1024) String file_url,
        @Size(max = 64) String file_type,
        @PositiveOrZero Long file_size,
        @Size(max = 128) String mime_type,
        @Size(max = 512) String remark) {
}
