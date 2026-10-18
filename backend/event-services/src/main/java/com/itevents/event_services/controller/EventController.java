package com.itevents.event_services.controller;

import com.itevents.event_services.dto.EventRequest;
import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.dto.RejectRequest;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.entity.EventType;
import com.itevents.event_services.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService service;

    @PostMapping
    public ResponseEntity<EventResponse> create(@Valid @RequestBody EventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public EventResponse update(@PathVariable Long id, @Valid @RequestBody EventRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/{id}")
    public EventResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping
    public List<EventResponse> search(@RequestParam(required = false) String city,
                                      @RequestParam(required = false) EventType type,
                                      @RequestParam(required = false) String domain) {
        return service.search(city, type, domain);
    }

    @GetMapping("/organizer/{organizerId}")
    public List<EventResponse> byOrganizer(@PathVariable Long organizerId) {
        return service.getByOrganizer(organizerId);
    }

    // ---------- Administrateur ----------

    @GetMapping("/status/{status}")
    public List<EventResponse> byStatus(@PathVariable EventStatus status) {
        return service.getByStatus(status);
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