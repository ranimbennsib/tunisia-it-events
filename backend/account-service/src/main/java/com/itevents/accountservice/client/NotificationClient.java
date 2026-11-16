package com.itevents.accountservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Component
public class NotificationClient {

    private final RestClient restClient;

    public NotificationClient(@Value("${notification-service.url}") String baseUrl,
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

    // Demande un email à notification-service, sans jamais faire échouer l'opération appelante.
    // Si une transaction est en cours, l'appel part seulement après son commit.
    public void send(Long accountId, NotificationType type, Map<String, String> variables) {
        Runnable task = () -> Thread.startVirtualThread(() -> post(accountId, type, variables));

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private void post(Long accountId, NotificationType type, Map<String, String> variables) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accountId", accountId);
        body.put("type", type.name());
        body.put("variables", variables);

        try {
            restClient.post()
                    .uri("/internal/notifications/email")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Notification {} non envoyée pour le compte {} : {}", type, accountId, e.getMessage());
        }
    }
}