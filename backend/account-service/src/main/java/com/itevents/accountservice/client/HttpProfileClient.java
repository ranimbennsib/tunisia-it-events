package com.itevents.accountservice.client;

import com.itevents.accountservice.entity.Role;
import com.itevents.accountservice.exception.ProfileRejectedException;
import com.itevents.accountservice.exception.ProfileServiceUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@ConditionalOnProperty(name = "profile.client", havingValue = "http")
public class HttpProfileClient implements ProfileClient {

    private static final List<String> PROFILE_FIELDS = List.of(
            "occupation", "institution",
            "organizationName", "description", "website", "logo");

    private final RestClient restClient;

    public HttpProfileClient(@Value("${profile-service.url}") String baseUrl,
                             @Value("${internal.api-key}") String internalApiKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(5));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("X-Internal-Key", internalApiKey)
                .build();
    }

    @Override
    public void createProfile(Long accountId, Role role, Map<String, Object> profile) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accountId", accountId);
        body.put("role", toProfileRole(role));
        for (String field : PROFILE_FIELDS) {
            Object value = profile.get(field);
            if (value != null) {
                body.put(field, value);
            }
        }

        try {
            restClient.post()
                    .uri("/internal/profiles")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 400 || status == 409 || status == 422) {
                throw new ProfileRejectedException("Profile rejected by profile-service (HTTP " + status + ")");
            }
            log.error("profile-service answered HTTP {} on create", status);
            throw new ProfileServiceUnavailableException("Profile service is unavailable, please try again later");
        } catch (RestClientException e) {
            log.error("profile-service unreachable: {}", e.getMessage());
            throw new ProfileServiceUnavailableException("Profile service is unavailable, please try again later");
        }
    }

    @Override
    public void deleteProfile(Long accountId) {
        try {
            restClient.delete()
                    .uri("/internal/profiles/{id}", accountId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            // already absent: nothing to delete
        } catch (RestClientException e) {
            throw new ProfileServiceUnavailableException("Could not delete profile of account " + accountId);
        }
    }

    private String toProfileRole(Role role) {
        return switch (role) {
            case USER -> "USER";
            case ORGANIZER -> "ORGANIZER";
            case ADMIN -> "ADMINISTRATOR";   // profile-service uses ADMINISTRATOR
        };
    }
}