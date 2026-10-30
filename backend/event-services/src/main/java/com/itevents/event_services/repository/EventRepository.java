package com.itevents.event_services.repository;

import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    // Organizer
    List<Event> findByOrganizerIdOrderByCreatedAtDesc(Long organizerId);

    List<Event> findByOrganizerIdAndStatusOrderByCreatedAtDesc(Long organizerId, EventStatus status);

    // User
    List<Event> findByStatusOrderByStartDateAsc(EventStatus status);

    // Administrator
    List<Event> findByStatusOrderByCreatedAtAsc(EventStatus status);
}