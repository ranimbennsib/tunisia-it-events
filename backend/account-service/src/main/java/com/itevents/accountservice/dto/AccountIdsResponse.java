package com.itevents.accountservice.dto;
import java.util.List;
public record AccountIdsResponse(List<Long> ids, boolean Last) {
    
}
