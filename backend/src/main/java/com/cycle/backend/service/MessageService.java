package com.cycle.backend.service;

import com.cycle.backend.model.Message;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MessageService {
    private final List<Message> messages = new ArrayList<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public Message createMessage(String content) {
        Message message = new Message();
        message.setId(idGenerator.getAndIncrement());
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        messages.add(message);
        return message;
    }

    public List<Message> getAllMessages() {
        return new ArrayList<>(messages);
    }

    public Message getMessageById(Long id) {
        return messages.stream()
                .filter(msg -> msg.getId().equals(id))
                .findFirst()
                .orElse(null);
    }
}

