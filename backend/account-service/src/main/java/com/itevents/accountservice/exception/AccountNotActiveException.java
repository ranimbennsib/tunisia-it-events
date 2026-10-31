package com.itevents.accountservice.exception;

public class AccountNotActiveException extends RuntimeException{
 public AccountNotActiveException(String message){
     super(message);
 }
}
