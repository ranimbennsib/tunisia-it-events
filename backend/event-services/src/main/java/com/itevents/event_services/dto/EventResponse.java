package com.itevents.event_services.dto;

import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.entity.EventType;
import com.itevents.event_services.entity.PaymentMode;

import java.time.LocalDateTime;

public record EventResponse(
        Long id,
        String title,
        String description,
        String domain,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String city,
        String address,
        int capacity,
        PaymentMode paymentMode,
        Double price,
        String currency,
        String image,
        EventType eventType,
        EventStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        Long organizerId
) {}