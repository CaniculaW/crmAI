package com.canicula.crmai.api;

import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.auth.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Map<String, Object>>> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        List<Map<String, String>> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(ApiExceptionHandler::toFieldError)
                .toList();
        Map<String, Object> data = Map.of("field_errors", fieldErrors);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(
                        "VALIDATION_ERROR",
                        "参数校验失败",
                        data,
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiResponse<Map<String, Object>>> handleHttpMessageNotReadable(
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(
                        "VALIDATION_ERROR",
                        "请求体格式错误",
                        Map.of("field_errors", List.of()),
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler(UnauthorizedException.class)
    ResponseEntity<ApiResponse<Map<String, Object>>> handleUnauthorized(
            UnauthorizedException exception,
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(
                        "UNAUTHORIZED",
                        exception.getMessage(),
                        Map.of(),
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler(ForbiddenException.class)
    ResponseEntity<ApiResponse<Map<String, Object>>> handleForbidden(
            ForbiddenException exception,
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(
                        "FORBIDDEN",
                        exception.getMessage(),
                        Map.of(),
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<ApiResponse<Map<String, Object>>> handleBusinessRule(
            BusinessRuleException exception,
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(
                        "BUSINESS_RULE_FAILED",
                        exception.getMessage(),
                        Map.of(),
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler({ResourceNotFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ApiResponse<Map<String, Object>>> handleNotFound(
            Exception exception,
            HttpServletRequest request) {
        String message = exception instanceof ResourceNotFoundException
                ? exception.getMessage()
                : "资源不存在";
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(
                        "NOT_FOUND",
                        message,
                        Map.of(),
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiResponse<Map<String, Object>>> handleInvalidArgument(
            Exception exception,
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(
                        "VALIDATION_ERROR",
                        exception.getMessage(),
                        Map.of("field_errors", List.of()),
                        TraceIdFilter.currentTraceId(request)));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Map<String, Object>>> handleUnexpected(
            Exception exception,
            HttpServletRequest request) {
        LOGGER.error("Unhandled API exception, traceId={}", TraceIdFilter.currentTraceId(request), exception);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(
                        "INTERNAL_ERROR",
                        "服务端异常",
                        Map.of(),
                        TraceIdFilter.currentTraceId(request)));
    }

    private static Map<String, String> toFieldError(FieldError fieldError) {
        return Map.of(
                "field", fieldError.getField(),
                "message", fieldError.getDefaultMessage() == null ? "参数无效" : fieldError.getDefaultMessage());
    }
}
