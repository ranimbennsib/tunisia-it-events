package com.itevents.accountservice.exception;

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String msj){
        super(msj);
    }
}
