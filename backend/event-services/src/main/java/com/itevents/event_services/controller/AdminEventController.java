package com.itevents.event_services.controller;

import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.dto.RejectRequest;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.service.AdminEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
public class AdminEventController {

    private final AdminEventService service;

    @GetMapping
    public List<EventResponse> list(@RequestParam(defaultValue = "PENDING") EventStatus status) {
        return service.listByStatus(status);
    }

    @PatchMapping("/{id}/approve")
    public EventResponse approve(@PathVariable Long id, @RequestParam Long adminId) {
        return service.approve(id, adminId);
    }

    @PatchMapping("/{id}/reject")
    public EventResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRequest request) {
        return service.reject(id, request);
    }
}