package com.cycle.backend.repository;

import com.cycle.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    // 기본 CRUD 메서드는 JpaRepository에서 제공
    // findAll(), findById(), save(), deleteById() 등
    
    // 필요시 커스텀 쿼리 메서드 추가 가능
    List<Message> findByContentContaining(String keyword);
}

