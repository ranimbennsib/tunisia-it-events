package com.itevents.event_services.client;

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
public class InAppNotificationClient {

    private static final String TYPE = "EVENT_PENDING_REVIEW";

    private final RestClient restClient;

    public InAppNotificationClient(@Value("${notification-service.url}") String baseUrl,
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

    // Prévient les admins qu'un événement attend sa validation (création ou modification).
    public void notifyAdminsEventPending(Long eventId, String eventTitle, boolean update) {
        String title = (eventTitle == null || eventTitle.isBlank()) ? "Untitled event" : eventTitle;
        if (title.length() > 300) {
            title = title.substring(0, 300);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", TYPE);
        body.put("eventId", eventId);
        body.put("eventTitle", title);
        body.put("update", update);
        post("/internal/notifications/in-app", body, eventId);
    }

    // L'événement est validé, rejeté ou supprimé : les notifications passent en « lues ».
    public void resolveEventPending(Long eventId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", TYPE);
        body.put("eventId", eventId);
        post("/internal/notifications/in-app/resolve", body, eventId);
    }

    // En arrière-plan : une erreur ici ne fait jamais échouer l'opération de l'organisateur ou de l'admin.
    private void post(String path, Map<String, Object> body, Long eventId) {
        Thread.startVirtualThread(() -> {
            try {
                restClient.post()
                        .uri(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (RestClientException e) {
                log.warn("Notification dans l'application non envoyée pour l'événement {} : {}",
                        eventId, e.getMessage());
            }
        });
    }
}