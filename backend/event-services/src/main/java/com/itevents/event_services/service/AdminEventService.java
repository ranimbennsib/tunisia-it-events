package com.itevents.event_services.service;

import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.dto.RejectRequest;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.exception.ResourceNotFoundException;
import com.itevents.event_services.mapper.EventMapper;
import com.itevents.event_services.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminEventService {

    private final EventRepository repository;
    private final EventMapper mapper;

    public List<EventResponse> listByStatus(EventStatus status) {
        return repository.findByStatusOrderByCreatedAtAsc(status).stream()
                .map(mapper::toResponse).toList();
    }

    public EventResponse approve(Long eventId, Long adminId) {
        Event event = findPending(eventId);
        event.setStatus(EventStatus.APPROVED);
        event.setReviewedBy(adminId);
        event.setRejectReason(null);
        return mapper.toResponse(repository.save(event));
    }

    public EventResponse reject(Long eventId, RejectRequest request) {
        Event event = findPending(eventId);
        event.setStatus(EventStatus.REJECTED);
        event.setReviewedBy(request.adminId());
        event.setRejectReason(request.reason());
        return mapper.toResponse(repository.save(event));
    }

    private Event findPending(Long eventId) {
        Event event = repository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Événement " + eventId + " introuvable"));
        if (event.getStatus() != EventStatus.PENDING) {
            throw new IllegalStateException("Seuls les événements en attente peuvent être traités");
        }
        return event;
    }
}