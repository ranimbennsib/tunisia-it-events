package com.itevents.event_services.service;

import com.itevents.event_services.dto.EventRequest;
import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.entity.PaymentMode;
import com.itevents.event_services.exception.ForbiddenOperationException;
import com.itevents.event_services.exception.ResourceNotFoundException;
import com.itevents.event_services.mapper.EventMapper;
import com.itevents.event_services.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrganizerEventService {

    private final EventRepository repository;
    private final EventMapper mapper;

    public EventResponse create(Long organizerId, EventRequest request) {
        validate(request);
        Event event = new Event();
        mapper.apply(event, request);
        event.setOrganizerId(organizerId);
        event.setStatus(EventStatus.PENDING);   // toujours validé par un administrateur
        return mapper.toResponse(repository.save(event));
    }

    public EventResponse update(Long organizerId, Long eventId, EventRequest request) {
        Event event = findOwned(organizerId, eventId);
        if (event.getEndDate().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Impossible de modifier un événement terminé");
        }
        validate(request);
        mapper.apply(event, request);
        event.setStatus(EventStatus.PENDING);   // à revalider après modification
        event.setRejectReason(null);
        event.setReviewedBy(null);
        return mapper.toResponse(repository.save(event));
    }

    public void delete(Long organizerId, Long eventId) {
        // TODO plus tard : interdire la suppression s'il existe des inscriptions (registration-service)
        repository.delete(findOwned(organizerId, eventId));
    }

    public EventResponse getOne(Long organizerId, Long eventId) {
        return mapper.toResponse(findOwned(organizerId, eventId));
    }

    public List<EventResponse> list(Long organizerId, EventStatus status) {
        List<Event> events = (status == null)
                ? repository.findByOrganizerIdOrderByCreatedAtDesc(organizerId)
                : repository.findByOrganizerIdAndStatusOrderByCreatedAtDesc(organizerId, status);
        return events.stream().map(mapper::toResponse).toList();
    }

    // ---------- méthodes privées ----------

    private Event findOwned(Long organizerId, Long eventId) {
        Event event = repository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Événement " + eventId + " introuvable"));
        if (!event.getOrganizerId().equals(organizerId)) {
            throw new ForbiddenOperationException("Cet événement n'appartient pas à cet organisateur");
        }
        return event;
    }

    private void validate(EventRequest r) {
        if (!r.startDate().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("La date de début doit être dans le futur");
        }
        if (!r.endDate().isAfter(r.startDate())) {
            throw new IllegalArgumentException("La date de fin doit être après la date de début");
        }
        if (r.paymentMode() != PaymentMode.FREE && r.price() == null) {
            throw new IllegalArgumentException("Le prix est obligatoire pour un événement payant");
        }
    }
}