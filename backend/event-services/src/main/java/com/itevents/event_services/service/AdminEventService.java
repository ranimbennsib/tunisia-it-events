package com.itevents.event_services.service;

import com.itevents.event_services.client.NotificationClient;
import com.itevents.event_services.client.NotificationType;
import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.dto.RejectRequest;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import com.itevents.event_services.exception.ResourceNotFoundException;
import com.itevents.event_services.mapper.EventMapper;
import com.itevents.event_services.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.itevents.event_services.client.BroadcastClient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
@Service
@RequiredArgsConstructor
public class AdminEventService {
    
        private final BroadcastClient broadcastClient;
    private final EventRepository repository;
    private final EventMapper mapper;
    private final NotificationClient notificationClient;
    public List<EventResponse> listByStatus(EventStatus status) {
        return repository.findByStatusOrderByCreatedAtAsc(status).stream()
                .map(mapper::toResponse).toList();
    }

    public EventResponse approve(Long eventId, Long adminId) {
        Event event = findPending(eventId);
        event.setStatus(EventStatus.APPROVED);
        event.setReviewedBy(adminId);
        event.setRejectReason(null);
       
       
         // annonce aux utilisateurs seulement à la première approbation
        boolean firstApproval = event.getAnnouncedAt() == null;
        if (firstApproval) {
            event.setAnnouncedAt(LocalDateTime.now());
        }
        Event saved = repository.save(event);

        notificationClient.send(saved.getOrganizerId(), NotificationType.EVENT_VALIDATED,
                Map.of("eventTitle", saved.getTitle()));
        if (firstApproval) {
            broadcastClient.announceNewEvent(saved);
        }

        return mapper.toResponse(saved);
    }

    public EventResponse reject(Long eventId, RejectRequest request) {
        Event event = findPending(eventId);
        event.setStatus(EventStatus.REJECTED);
        event.setReviewedBy(request.adminId());
        event.setRejectReason(request.reason());
        
       Event saved = repository.save(event);

        notificationClient.send(saved.getOrganizerId(), NotificationType.EVENT_REJECTED,
                Map.of("eventTitle", saved.getTitle(), "rejectReason", request.reason()));

        return mapper.toResponse(saved);
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