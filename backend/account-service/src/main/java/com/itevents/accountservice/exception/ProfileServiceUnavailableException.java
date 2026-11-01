package com.itevents.accountservice.exception;

public class ProfileServiceUnavailableException extends RuntimeException {

    public ProfileServiceUnavailableException(String message) {
        super(message);
    }
}