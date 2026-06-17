package com.canicula.crmai.api;

public record ApiResponse<T>(String code, String message, T data, String trace_id) {

    public static <T> ApiResponse<T> ok(T data, String traceId) {
        return new ApiResponse<>("OK", "success", data, traceId);
    }

    public static <T> ApiResponse<T> error(String code, String message, T data, String traceId) {
        return new ApiResponse<>(code, message, data, traceId);
    }
}
