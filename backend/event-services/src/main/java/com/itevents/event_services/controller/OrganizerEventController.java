package com.itevents.event_services.controller;

import com.itevents.event_services.dto.EventRequest;
import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.service.OrganizerEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizers/{organizerId}/events")
@RequiredArgsConstructor
public class OrganizerEventController {

    private final OrganizerEventService service;

    @PostMapping
    public ResponseEntity<EventResponse> create(@PathVariable Long organizerId,
                                                @Valid @RequestBody EventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(organizerId, request));
    }

    @GetMapping
    public List<EventResponse> list(@PathVariable Long organizerId,
                                    @RequestParam(required = false) EventStatus status) {
        return service.list(organizerId, status);
    }

    @GetMapping("/{eventId}")
    public EventResponse getOne(@PathVariable Long organizerId, @PathVariable Long eventId) {
        return service.getOne(organizerId, eventId);
    }

    @PutMapping("/{eventId}")
    public EventResponse update(@PathVariable Long organizerId, @PathVariable Long eventId,
                                @Valid @RequestBody EventRequest request) {
        return service.update(organizerId, eventId, request);
    }

    @DeleteMapping("/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long organizerId, @PathVariable Long eventId) {
        service.delete(organizerId, eventId);
    }
}