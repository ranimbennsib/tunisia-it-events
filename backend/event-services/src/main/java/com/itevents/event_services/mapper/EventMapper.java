package com.itevents.event_services.mapper;

import com.itevents.event_services.dto.EventRequest;
import com.itevents.event_services.dto.EventResponse;
import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.PaymentMode;
import org.springframework.stereotype.Component;

@Component
public class EventMapper {

    public void apply(Event e, EventRequest r) {
        e.setTitle(r.title());
        e.setDescription(r.description());
        e.setDomain(r.domain());
        e.setStartDate(r.startDate());
        e.setEndDate(r.endDate());
        e.setCity(r.city());
        e.setAddress(r.address());
        e.setCapacity(r.capacity());
        e.setPaymentMode(r.paymentMode());
        e.setImage(r.image());
        e.setEventType(r.eventType());

        if (r.paymentMode() == PaymentMode.FREE) {
            e.setPrice(null);
            e.setCurrency(null);
        } else {
            e.setPrice(r.price());
            e.setCurrency(r.currency() != null && !r.currency().isBlank() ? r.currency() : "TND");
        }
    }

    public EventResponse toResponse(Event e) {
        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getDomain(),
                e.getStartDate(), e.getEndDate(), e.getCity(), e.getAddress(),
                e.getCapacity(), e.getPaymentMode(), e.getPrice(), e.getCurrency(),
                e.getImage(), e.getEventType(), e.getStatus(), e.getRejectReason(),
                e.getCreatedAt(), e.getOrganizerId());
    }
}