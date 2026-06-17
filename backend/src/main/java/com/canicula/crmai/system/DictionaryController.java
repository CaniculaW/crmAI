package com.canicula.crmai.system;

import com.canicula.crmai.auth.RequirePermission;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DictionaryController {

    private final DictionaryService dictionaryService;

    DictionaryController(DictionaryService dictionaryService) {
        this.dictionaryService = dictionaryService;
    }

    @GetMapping("/api/system/dicts")
    List<DictionaryTypeResponse> list(
            @RequestParam(name = "dict_code", required = false) String dictCode,
            @RequestParam(name = "include_inactive", defaultValue = "false") boolean includeInactive) {
        return dictionaryService.list(dictCode, includeInactive);
    }

    @RequirePermission("system.dict.manage")
    @PostMapping("/api/system/dicts/types")
    DictionaryTypeResponse createType(@Valid @RequestBody DictionaryTypeRequest request) {
        return dictionaryService.createType(request);
    }

    @RequirePermission("system.dict.manage")
    @PostMapping("/api/system/dicts/types/{dictTypeId}/items")
    DictionaryItemResponse createItem(
            @PathVariable Long dictTypeId,
            @Valid @RequestBody DictionaryItemRequest request) {
        return dictionaryService.createItem(dictTypeId, request);
    }

    @RequirePermission("system.dict.manage")
    @PatchMapping("/api/system/dicts/items/{itemId}")
    DictionaryItemResponse updateItem(
            @PathVariable Long itemId,
            @Valid @RequestBody DictionaryItemUpdateRequest request) {
        return dictionaryService.updateItem(itemId, request);
    }
}
