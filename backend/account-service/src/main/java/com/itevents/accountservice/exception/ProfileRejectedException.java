package com.itevents.accountservice.exception;

public class ProfileRejectedException extends RuntimeException {

    public ProfileRejectedException(String message) {
        super(message);
    }
}