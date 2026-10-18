package com.itevents.event_services.repository;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByOrganizerId(Long organizerId);

    List<Event> findByStatus(EventStatus status);
}
