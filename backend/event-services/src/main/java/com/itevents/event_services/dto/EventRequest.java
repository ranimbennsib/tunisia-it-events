package com.itevents.event_services.dto;

import com.itevents.event_services.entity.EventType;
import com.itevents.event_services.entity.PaymentMode;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record EventRequest(
        @NotBlank String title,
        @NotBlank String description,
        String domain,
        @NotNull LocalDateTime startDate,
        @NotNull LocalDateTime endDate,
        @NotBlank String city,
        String address,
        @Min(1) int capacity,
        @NotNull PaymentMode paymentMode,
        @PositiveOrZero Double price,
        String currency,
        String image,
        @NotNull EventType eventType
) {}