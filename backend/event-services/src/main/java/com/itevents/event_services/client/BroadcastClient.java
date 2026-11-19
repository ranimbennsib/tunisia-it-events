package com.itevents.event_services.client;

import com.itevents.event_services.entity.Event;
import com.itevents.event_services.entity.PaymentMode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Component
public class BroadcastClient {

    private final RestClient restClient;

    public BroadcastClient(@Value("${notification-service.url}") String baseUrl,
                           @Value("${notification.internal-key}") String internalKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(5));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("X-Internal-Key", internalKey)
                .build();
    }

    // Annonce un nouvel événement à tous les utilisateurs (en arrière-plan,
    // une erreur ici ne fait jamais échouer l'approbation).
    public void announceNewEvent(Event event) {
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("eventTitle", event.getTitle());
        if (event.getStartDate() != null) {
            variables.put("eventDate", event.getStartDate().toString());
        }
        if (event.getCity() != null) {
            variables.put("eventCity", event.getCity());
        }
        if (event.getAddress() != null) {
            variables.put("eventAddress", event.getAddress());
        }
        variables.put("eventPrice", priceText(event));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "EVENT_PUBLISHED");
        body.put("variables", variables);

        Thread.startVirtualThread(() -> {
            try {
                restClient.post()
                        .uri("/internal/notifications/broadcast")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (RestClientException e) {
                log.warn("Annonce de l'événement {} non envoyée : {}", event.getId(), e.getMessage());
            }
        });
    }

    private String priceText(Event event) {
        if (event.getPaymentMode() == PaymentMode.FREE || event.getPrice() == null) {
            return "Free";
        }
        String amount = event.getPrice() + (event.getCurrency() == null ? "" : " " + event.getCurrency());
        return event.getPaymentMode() == PaymentMode.ONLINE
                ? amount + " (online payment)"
                : amount + " (pay on site)";
    }
}