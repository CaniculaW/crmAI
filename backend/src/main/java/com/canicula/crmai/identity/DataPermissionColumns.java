package com.canicula.crmai.identity;

public record DataPermissionColumns(
        String ownerUserIdColumn,
        String ownerDepartmentIdColumn,
        String collaboratorExistsClause) {
}
