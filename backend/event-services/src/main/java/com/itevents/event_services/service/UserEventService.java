package com.itevents.event_services.service;

import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.entity.EventType;
import com.itevents.event_services.entity.PaymentMode;
import com.itevents.event_services.exception.ResourceNotFoundException;
import com.itevents.event_services.mapper.EventMapper;
import com.itevents.event_services.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserEventService {

    private final EventRepository repository;
    private final EventMapper mapper;

    // Un utilisateur ne voit que les événements APPROUVÉS
    public List<EventResponse> search(String city, EventType type, String domain,
                                      PaymentMode paymentMode, String keyword,
                                      boolean upcomingOnly) {
        LocalDateTime now = LocalDateTime.now();
        return repository.findByStatusOrderByStartDateAsc(EventStatus.APPROVED).stream()
                .filter(e -> !upcomingOnly || e.getEndDate().isAfter(now))
                .filter(e -> city == null || city.equalsIgnoreCase(e.getCity()))
                .filter(e -> type == null || type == e.getEventType())
                .filter(e -> domain == null || domain.equalsIgnoreCase(e.getDomain()))
                .filter(e -> paymentMode == null || paymentMode == e.getPaymentMode())
                .filter(e -> keyword == null || e.getTitle().toLowerCase().contains(keyword.toLowerCase()))
                .map(mapper::toResponse)
                .toList();
    }

    public EventResponse getById(Long eventId) {
        Event event = repository.findById(eventId)
                .filter(e -> e.getStatus() == EventStatus.APPROVED)
                .orElseThrow(() -> new ResourceNotFoundException("Événement " + eventId + " introuvable"));
        return mapper.toResponse(event);
    }
}