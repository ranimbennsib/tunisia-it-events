package com.itevents.event_services.controller;

import com.itevents.event_services.exception.ResourceNotFoundException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/events/images")
public class EventImageController {

    private static final Path ROOT = Paths.get("uploads", "events").toAbsolutePath().normalize();

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp", "image/gif", "gif");

    private static final Map<String, MediaType> TYPES = Map.of(
            "jpg", MediaType.IMAGE_JPEG, "png", MediaType.IMAGE_PNG,
            "webp", MediaType.parseMediaType("image/webp"), "gif", MediaType.IMAGE_GIF);

    private static final Pattern FILE_NAME = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png|webp|gif)$");

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws IOException {
        String ext = file.getContentType() == null ? null : EXTENSIONS.get(file.getContentType());
        if (file.isEmpty() || ext == null) {
            throw new IllegalArgumentException("Image invalide : formats acceptés JPG, PNG, WEBP, GIF");
        }
        Files.createDirectories(ROOT);
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, ROOT.resolve(name));
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("url", "/api/events/images/" + name));
    }
    // Public: a visitor creating an organizer account has no token yet.
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadLogo(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.getSize() > 2L * 1024 * 1024) {
            throw new IllegalArgumentException("Logo trop volumineux (2 Mo maximum)");
        }
        return upload(file);
    }

    @GetMapping("/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) {
        if (!FILE_NAME.matcher(name).matches()) {
            throw new ResourceNotFoundException("Image introuvable");
        }
        Path file = ROOT.resolve(name).normalize();
        if (!file.startsWith(ROOT) || !Files.isRegularFile(file)) {
            throw new ResourceNotFoundException("Image introuvable");
        }
        String ext = name.substring(name.lastIndexOf('.') + 1);
        return ResponseEntity.ok()
                .contentType(TYPES.get(ext))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)))
                .body(new FileSystemResource(file));
    }
}