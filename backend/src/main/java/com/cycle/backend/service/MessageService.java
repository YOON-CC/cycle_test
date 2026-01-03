package com.cycle.backend.service;

import com.cycle.backend.model.Message;
import com.cycle.backend.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class MessageService {
    
    @Autowired
    private MessageRepository messageRepository;

    public Message createMessage(String content) {
        Message message = new Message();
        message.setContent(content);
        // timestamp는 @PrePersist로 자동 설정됨
        return messageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public List<Message> getAllMessages() {
        return messageRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Message> getMessageById(Long id) {
        return messageRepository.findById(id);
    }
    
    public void deleteMessage(Long id) {
        messageRepository.deleteById(id);
    }
}

