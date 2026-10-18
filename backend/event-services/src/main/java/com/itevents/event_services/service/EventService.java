package com.itevents.event_services.service;

import com.itevents.event_services.dto.EventRequest;
import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.dto.RejectRequest;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.entity.EventType;
import com.itevents.event_services.entity.PaymentType;
import com.itevents.event_services.exception.ResourceNotFoundException;
import com.itevents.event_services.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository repository;

    public EventResponse create(EventRequest r) {
        validate(r);
        Event e = new Event();
        apply(e, r);
        e.setOrganizerId(r.organizerId());
        e.setStatus(EventStatus.PENDING);
        return toResponse(repository.save(e));
    }

    public EventResponse update(Long id, EventRequest r) {
        validate(r);
        Event e = find(id);
        apply(e, r);
        e.setStatus(EventStatus.PENDING);   // à revalider par l'administrateur
        e.setRejectReason(null);
        return toResponse(repository.save(e));
    }

    public EventResponse approve(Long id, Long adminId) {
        Event e = find(id);
        e.setStatus(EventStatus.APPROVED);
        e.setReviewedBy(adminId);
        e.setRejectReason(null);
        return toResponse(repository.save(e));
    }

    public EventResponse reject(Long id, RejectRequest r) {
        Event e = find(id);
        e.setStatus(EventStatus.REJECTED);
        e.setRejectReason(r.reason());
        e.setReviewedBy(r.adminId());
        return toResponse(repository.save(e));
    }

    public EventResponse getById(Long id) {
        return toResponse(find(id));
    }

    public List<EventResponse> search(String city, EventType type, String domain) {
        return repository.findByStatus(EventStatus.APPROVED).stream()
                .filter(e -> city == null || city.equalsIgnoreCase(e.getCity()))
                .filter(e -> type == null || type == e.getEventType())
                .filter(e -> domain == null || domain.equalsIgnoreCase(e.getDomain()))
                .map(this::toResponse)
                .toList();
    }

    public List<EventResponse> getByOrganizer(Long organizerId) {
        return repository.findByOrganizerId(organizerId).stream()
                .map(this::toResponse).toList();
    }

    public List<EventResponse> getByStatus(EventStatus status) {
        return repository.findByStatus(status).stream()
                .map(this::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(find(id));
    }

    // ---------- méthodes privées ----------

    private Event find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Événement " + id + " introuvable"));
    }

    private void validate(EventRequest r) {
        if (!r.endDate().isAfter(r.startDate())) {
            throw new IllegalArgumentException("La date de fin doit être après la date de début");
        }
        if (r.paymentType() != PaymentType.FREE && r.price() == null) {
            throw new IllegalArgumentException("Le prix est obligatoire pour un événement payant");
        }
    }

    private void apply(Event e, EventRequest r) {
        e.setTitle(r.title());
        e.setDescription(r.description());
        e.setDomain(r.domain());
        e.setStartDate(r.startDate());
        e.setEndDate(r.endDate());
        e.setCity(r.city());
        e.setAddress(r.address());
        e.setCapacity(r.capacity());
        e.setPaymentType(r.paymentType());
        e.setPrice(r.paymentType() == PaymentType.FREE ? null : r.price());
        e.setImage(r.image());
        e.setEventType(r.eventType());
    }

    private EventResponse toResponse(Event e) {
        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getDomain(),
                e.getStartDate(), e.getEndDate(), e.getCity(), e.getAddress(),
                e.getCapacity(), e.getPaymentType(), e.getPrice(), e.getImage(),
                e.getEventType(), e.getStatus(), e.getRejectReason(),
                e.getCreatedAt(), e.getOrganizerId());
    }
}