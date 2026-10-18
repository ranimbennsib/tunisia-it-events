package com.itevents.event_services.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    private String domain;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    private String city;
    private String address;
    private int capacity;

    @Enumerated(EnumType.STRING)
    private PaymentMode paymentMode;

    private Double price;       // [0..1] : null si gratuit
    private String currency;    // [0..1] : null si gratuit
    private String image;

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    private EventStatus status;

    private String rejectReason;    // [0..1]
    private LocalDateTime createdAt;

    private Long organizerId;       // Organizer (account-service) : "organizes"
    private Long reviewedBy;        // Administrator (account-service) : "reviews"

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = EventStatus.PENDING;
        }
    }
}