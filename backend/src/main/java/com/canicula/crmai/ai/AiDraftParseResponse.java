package com.canicula.crmai.ai;

import java.util.List;

public record AiDraftParseResponse(Long input_record_id, List<AiDraftResponse> drafts) {
}
