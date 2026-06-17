package com.canicula.crmai.identity;

import java.util.List;

public record DataPermissionCondition(String clause, List<Object> parameters) {
}
