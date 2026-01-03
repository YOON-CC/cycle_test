# 백엔드 구조 및 데이터베이스 저장 원리

## 프로젝트 구조

```
backend/
├── src/main/java/com/cycle/backend/
│   ├── BackendApplication.java      # Spring Boot 메인 클래스
│   ├── config/
│   │   └── CorsConfig.java          # CORS 설정
│   ├── controller/
│   │   └── MessageController.java   # REST API 엔드포인트
│   ├── service/
│   │   └── MessageService.java      # 비즈니스 로직
│   ├── repository/
│   │   └── MessageRepository.java   # 데이터베이스 접근 계층
│   └── model/
│       ├── Message.java             # 엔티티 (DB 테이블 매핑)
│       └── MessageRequest.java      # 요청 DTO
└── src/main/resources/
    └── application.properties        # 설정 파일
```

## 각 계층의 역할

### 1. Controller 계층 (`MessageController.java`)

**역할**: HTTP 요청을 받아서 처리하고 응답을 반환

```java
@RestController
@RequestMapping("/api")
public class MessageController {
    @Autowired
    private MessageService messageService;
    
    @PostMapping("/messages")
    public ResponseEntity<Message> createMessage(@RequestBody MessageRequest request) {
        Message message = messageService.createMessage(request.getContent());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }
}
```

**주요 어노테이션:**
- `@RestController`: REST API 컨트롤러 선언
- `@RequestMapping("/api")`: 모든 엔드포인트의 기본 경로
- `@PostMapping`, `@GetMapping`, `@DeleteMapping`: HTTP 메서드 매핑
- `@RequestBody`: JSON 요청 본문을 Java 객체로 변환
- `@PathVariable`: URL 경로 변수 추출

**처리 흐름:**
1. 클라이언트로부터 HTTP 요청 수신
2. 요청 데이터를 Service 계층에 전달
3. Service의 결과를 HTTP 응답으로 변환하여 반환

---

### 2. Service 계층 (`MessageService.java`)

**역할**: 비즈니스 로직 처리

```java
@Service
@Transactional
public class MessageService {
    @Autowired
    private MessageRepository messageRepository;

    public Message createMessage(String content) {
        Message message = new Message();
        message.setContent(content);
        return messageRepository.save(message);
    }
}
```

**주요 어노테이션:**
- `@Service`: Spring이 관리하는 서비스 빈으로 등록
- `@Transactional`: 트랜잭션 관리 (데이터 일관성 보장)
- `@Transactional(readOnly = true)`: 읽기 전용 트랜잭션 (성능 최적화)

**처리 흐름:**
1. Controller로부터 요청 받음
2. 비즈니스 로직 처리 (데이터 검증, 변환 등)
3. Repository를 통해 데이터베이스 작업 수행
4. 결과 반환

---

### 3. Repository 계층 (`MessageRepository.java`)

**역할**: 데이터베이스 접근 (JPA를 통한 데이터 조작)

```java
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByContentContaining(String keyword);
}
```

**주요 어노테이션:**
- `@Repository`: 데이터 접근 계층임을 명시
- `JpaRepository<Message, Long>`: 기본 CRUD 메서드 자동 제공
  - `save()`: 저장/수정
  - `findById()`: ID로 조회
  - `findAll()`: 전체 조회
  - `deleteById()`: 삭제

**자동 제공되는 메서드:**
- `save(Message)`: INSERT 또는 UPDATE
- `findById(Long)`: SELECT WHERE id = ?
- `findAll()`: SELECT * FROM messages
- `deleteById(Long)`: DELETE WHERE id = ?

**커스텀 메서드:**
- `findByContentContaining(String)`: JPA가 자동으로 SQL 생성
  - 생성되는 SQL: `SELECT * FROM messages WHERE content LIKE '%keyword%'`

---

### 4. Model 계층

#### `Message.java` - 엔티티 (Entity)

**역할**: 데이터베이스 테이블과 Java 객체를 매핑

```java
@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 1000)
    private String content;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
```

**주요 어노테이션:**
- `@Entity`: JPA 엔티티임을 선언 (테이블과 매핑)
- `@Table(name = "messages")`: 테이블 이름 지정
- `@Id`: 기본키 지정
- `@GeneratedValue(strategy = GenerationType.IDENTITY)`: 자동 증가 (AUTO_INCREMENT)
- `@Column(nullable = false)`: NOT NULL 제약조건
- `@PrePersist`: 저장 전 자동 실행 (timestamp 자동 설정)

**테이블 구조:**
```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    content VARCHAR(1000) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);
```

#### `MessageRequest.java` - 요청 DTO

**역할**: 클라이언트 요청 데이터 구조 정의

```java
@Data
public class MessageRequest {
    @NotBlank(message = "메시지 내용은 필수입니다")
    private String content;
}
```

**주요 어노테이션:**
- `@NotBlank`: 유효성 검증 (null, 빈 문자열 체크)

---

### 5. Config 계층 (`CorsConfig.java`)

**역할**: CORS (Cross-Origin Resource Sharing) 설정

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        // 프론트엔드와 백엔드가 다른 포트에서 실행될 때 통신 허용
    }
}
```

**필요한 이유:**
- 프론트엔드: `localhost:3000`
- 백엔드: `localhost:8080`
- 브라우저 보안 정책으로 인해 다른 포트 간 통신 차단
- CORS 설정으로 통신 허용

---

## 데이터베이스 저장 원리 (JPA 동작 방식)

### 전체 흐름도

```
클라이언트 요청
    ↓
Controller (HTTP 요청 수신)
    ↓
Service (비즈니스 로직)
    ↓
Repository (JPA 인터페이스)
    ↓
Hibernate (JPA 구현체)
    ↓
JDBC (데이터베이스 드라이버)
    ↓
PostgreSQL 데이터베이스
```

### 1. 메시지 생성 과정 (상세)

**요청:**
```http
POST /api/messages
Content-Type: application/json

{
  "content": "안녕하세요!"
}
```

**처리 단계:**

#### Step 1: Controller에서 요청 수신
```java
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(@RequestBody MessageRequest request) {
    // request = { content: "안녕하세요!" }
    Message message = messageService.createMessage(request.getContent());
    return ResponseEntity.status(HttpStatus.CREATED).body(message);
}
```

#### Step 2: Service에서 비즈니스 로직 처리
```java
public Message createMessage(String content) {
    // 1. Message 객체 생성
    Message message = new Message();
    message.setContent(content);
    // message.id = null (아직 생성 전)
    // message.timestamp = null (아직 설정 전)
    
    // 2. Repository를 통해 저장
    return messageRepository.save(message);
}
```

#### Step 3: Repository에서 JPA save() 호출
```java
// JpaRepository의 save() 메서드 호출
messageRepository.save(message);
```

#### Step 4: Hibernate가 SQL 생성 및 실행

**Hibernate가 자동으로 생성하는 SQL:**
```sql
-- @PrePersist 메서드 실행 (timestamp 설정)
-- message.setTimestamp(LocalDateTime.now());

-- INSERT 쿼리 자동 생성
INSERT INTO messages (content, timestamp) 
VALUES ('안녕하세요!', '2026-01-03 22:33:45');

-- ID 자동 생성 (GenerationType.IDENTITY)
-- PostgreSQL의 SERIAL 타입으로 자동 증가
-- 생성된 ID를 message 객체에 자동 설정
```

#### Step 5: 데이터베이스에 저장 완료

**저장된 데이터:**
```sql
SELECT * FROM messages;
-- 결과:
-- id: 1
-- content: '안녕하세요!'
-- timestamp: '2026-01-03 22:33:45'
```

#### Step 6: 응답 반환

```java
// 저장된 Message 객체 (id가 자동으로 설정됨)
Message savedMessage = {
    id: 1,
    content: "안녕하세요!",
    timestamp: LocalDateTime.of(2026, 1, 3, 22, 33, 45)
}

// JSON으로 변환하여 응답
{
  "id": 1,
  "content": "안녕하세요!",
  "timestamp": "2026-01-03T22:33:45"
}
```

---

### 2. 메시지 조회 과정

**요청:**
```http
GET /api/messages
```

**처리 단계:**

#### Step 1: Controller에서 요청 수신
```java
@GetMapping("/messages")
public ResponseEntity<List<Message>> getAllMessages() {
    List<Message> messages = messageService.getAllMessages();
    return ResponseEntity.ok(messages);
}
```

#### Step 2: Service에서 Repository 호출
```java
@Transactional(readOnly = true)
public List<Message> getAllMessages() {
    return messageRepository.findAll();
}
```

#### Step 3: Hibernate가 SQL 생성 및 실행

**자동 생성되는 SQL:**
```sql
SELECT * FROM messages;
```

#### Step 4: 결과를 Java 객체로 변환

**Hibernate가 자동으로 매핑:**
```java
// DB 결과 → Java 객체
List<Message> messages = [
    { id: 1, content: "안녕하세요!", timestamp: ... },
    { id: 2, content: "반갑습니다!", timestamp: ... }
]
```

#### Step 5: JSON 응답 반환
```json
[
  {
    "id": 1,
    "content": "안녕하세요!",
    "timestamp": "2026-01-03T22:33:45"
  },
  {
    "id": 2,
    "content": "반갑습니다!",
    "timestamp": "2026-01-03T22:34:10"
  }
]
```

---

## JPA의 핵심 개념

### 1. ORM (Object-Relational Mapping)

**개념:**
- Java 객체와 데이터베이스 테이블을 자동으로 매핑
- SQL을 직접 작성하지 않고 Java 코드로 데이터베이스 조작

**예시:**
```java
// Java 코드
Message message = new Message();
message.setContent("안녕하세요");
messageRepository.save(message);

// Hibernate가 자동 생성하는 SQL
INSERT INTO messages (content, timestamp) VALUES ('안녕하세요', NOW());
```

### 2. Entity Manager

**역할:**
- JPA가 내부적으로 사용하는 객체
- 엔티티의 생명주기 관리 (생성, 조회, 수정, 삭제)

**생명주기:**
1. **Transient**: 객체 생성만 하고 아직 저장 안 됨
2. **Persistent**: 데이터베이스에 저장됨 (EntityManager가 관리)
3. **Detached**: EntityManager에서 분리됨
4. **Removed**: 삭제 예정

### 3. 자동 쿼리 생성

**메서드 이름으로 쿼리 자동 생성:**
```java
// Repository 인터페이스
List<Message> findByContentContaining(String keyword);

// Hibernate가 자동 생성하는 SQL
SELECT * FROM messages WHERE content LIKE '%keyword%';
```

**규칙:**
- `findBy` + 필드명: WHERE 조건
- `Containing`: LIKE '%value%'
- `StartingWith`: LIKE 'value%'
- `EndingWith`: LIKE '%value'

### 4. 트랜잭션 관리

**@Transactional의 역할:**
```java
@Transactional
public Message createMessage(String content) {
    Message message = new Message();
    message.setContent(content);
    return messageRepository.save(message);
    // 여기서 예외 발생 시 자동 롤백
}
```

**동작:**
- 메서드 시작 시 트랜잭션 시작
- 정상 완료 시 커밋 (데이터베이스에 저장)
- 예외 발생 시 롤백 (변경사항 취소)

---

## 설정 파일 (`application.properties`)

### 데이터베이스 연결 설정

```properties
# PostgreSQL 연결 정보
spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
spring.datasource.username=chan
spring.datasource.password=3913
```

**설명:**
- `url`: 데이터베이스 위치 (호스트:포트/데이터베이스명)
- `username`: 데이터베이스 사용자
- `password`: 비밀번호

### JPA 설정

```properties
# JPA/Hibernate 설정
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

**설명:**
- `database-platform`: 사용하는 데이터베이스 방언 (PostgreSQL)
- `ddl-auto=update`: 엔티티 변경 시 테이블 자동 업데이트
  - `create`: 시작 시 테이블 삭제 후 재생성
  - `update`: 변경사항만 반영 (권장)
  - `validate`: 테이블 구조 검증만
  - `none`: 자동 작업 없음
- `show-sql=true`: 생성된 SQL을 콘솔에 출력
- `format_sql=true`: SQL을 보기 좋게 포맷팅

---

## 데이터 흐름 요약

### 생성 (CREATE)

```
1. 클라이언트: POST /api/messages { "content": "안녕" }
   ↓
2. Controller: @PostMapping → MessageService.createMessage()
   ↓
3. Service: Message 객체 생성 → Repository.save()
   ↓
4. Repository: JpaRepository.save() 호출
   ↓
5. Hibernate: INSERT SQL 생성 및 실행
   ↓
6. PostgreSQL: 데이터 저장
   ↓
7. Hibernate: 생성된 ID를 Message 객체에 설정
   ↓
8. Service: 저장된 Message 반환
   ↓
9. Controller: ResponseEntity로 변환
   ↓
10. 클라이언트: { "id": 1, "content": "안녕", "timestamp": "..." } 수신
```

### 조회 (READ)

```
1. 클라이언트: GET /api/messages
   ↓
2. Controller: @GetMapping → MessageService.getAllMessages()
   ↓
3. Service: Repository.findAll() 호출
   ↓
4. Repository: JpaRepository.findAll() 호출
   ↓
5. Hibernate: SELECT * FROM messages SQL 생성 및 실행
   ↓
6. PostgreSQL: 데이터 조회
   ↓
7. Hibernate: 결과를 List<Message>로 변환
   ↓
8. Service: List<Message> 반환
   ↓
9. Controller: ResponseEntity로 변환
   ↓
10. 클라이언트: [{ "id": 1, ... }, { "id": 2, ... }] 수신
```

---

## 핵심 포인트

1. **계층 분리**: Controller → Service → Repository → Database
2. **JPA의 자동화**: SQL 작성 없이 Java 코드로 데이터베이스 조작
3. **엔티티 매핑**: `@Entity`로 Java 클래스와 DB 테이블 연결
4. **자동 쿼리**: 메서드 이름으로 SQL 자동 생성
5. **트랜잭션**: `@Transactional`로 데이터 일관성 보장
6. **자동 테이블 생성**: `ddl-auto=update`로 엔티티 변경 시 테이블 자동 업데이트

---

## DBeaver로 확인하기

### 1. 테이블 구조 확인
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages';
```

### 2. 데이터 조회
```sql
SELECT * FROM messages ORDER BY timestamp DESC;
```

### 3. 생성된 SQL 확인
- 백엔드 콘솔에서 `show-sql=true` 설정으로 생성된 SQL 확인 가능
- 예: `Hibernate: insert into messages (content, timestamp, id) values (?, ?, ?)`

---

이 구조를 통해 프론트엔드에서 보낸 메시지가 PostgreSQL 데이터베이스에 영구 저장되고, 서버 재시작 후에도 데이터가 유지됩니다.

