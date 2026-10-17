package com.itevents.accountservice.exception;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

public record ApiError(
        int status,
        String message,
        Map<String, String> errors,
        Instant timestamp
) {

    public static ApiError of(HttpStatus status, String message, Map<String, String> errors) {
        return new ApiError(status.value(), message, errors, Instant.now());
    }
}