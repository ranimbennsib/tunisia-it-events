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
public class RegistrationClient {

    private final RestClient restClient;

    public RegistrationClient(@Value("${registration-service.url}") String baseUrl,
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

    // Nombre d'inscriptions actives (non annulées) d'un événement.
    // Si registration-service ne répond pas, on refuse par sécurité.
    public int countActiveRegistrations(Long eventId) {
        try {
            Map<?, ?> response = restClient.get()
                    .uri("/api/registrations/event/{id}/count", eventId)
                    .retrieve()
                    .body(Map.class);
            Object count = response == null ? null : response.get("count");
            if (count instanceof Number number) {
                return number.intValue();
            }
            throw new IllegalStateException("Réponse inattendue de registration-service");
        } catch (RestClientException e) {
            throw new IllegalStateException(
                    "Impossible de vérifier les inscriptions pour le moment, réessayez plus tard");
        }
    }

    // Prévient les inscrits que l'événement a été modifié (en arrière-plan,
    // une erreur ici ne fait jamais échouer la modification).
    public void notifyEventUpdated(Long eventId, String eventTitle) {
        Thread.startVirtualThread(() -> {
            Map<String, String> body = new LinkedHashMap<>();
            body.put("type", "EVENT_UPDATED");
            body.put("eventTitle", eventTitle == null ? "" : eventTitle);
            try {
                restClient.post()
                        .uri("/internal/events/{id}/notify", eventId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (RestClientException e) {
                log.warn("Inscrits de l'événement {} non prévenus : {}", eventId, e.getMessage());
            }
        });
    }
    
    // Prévient les inscrits que l'événement est supprimé (en arrière-plan).
    public void notifyEventCancelled(Long eventId, String eventTitle) {
        Thread.startVirtualThread(() -> {
            Map<String, String> body = new LinkedHashMap<>();
            body.put("type", "EVENT_CANCELLED");
            body.put("eventTitle", eventTitle == null ? "" : eventTitle);
            try {
                restClient.post()
                        .uri("/internal/events/{id}/notify", eventId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (RestClientException e) {
                log.warn("Inscrits de l'événement {} non prévenus : {}", eventId, e.getMessage());
            }
        });
    }
}
