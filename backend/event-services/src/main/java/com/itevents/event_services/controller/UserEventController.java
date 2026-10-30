package com.itevents.event_services.controller;

import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.entity.EventType;
import com.itevents.event_services.entity.PaymentMode;
import com.itevents.event_services.service.UserEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class UserEventController {

    private final UserEventService service;

    @GetMapping
    public List<EventResponse> search(@RequestParam(required = false) String city,
                                      @RequestParam(required = false) EventType type,
                                      @RequestParam(required = false) String domain,
                                      @RequestParam(required = false) PaymentMode paymentMode,
                                      @RequestParam(required = false) String keyword,
                                      @RequestParam(defaultValue = "true") boolean upcoming) {
        return service.search(city, type, domain, paymentMode, keyword, upcoming);
    }

    @GetMapping("/{id}")
    public EventResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }
}