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

---

## 레이어드 아키텍처 (Layered Architecture)

### 아키텍처 개요

레이어드 아키텍처는 애플리케이션을 계층(Layer)으로 분리하여 각 계층이 명확한 책임을 가지도록 하는 설계 패턴입니다.

```
┌─────────────────────────────────────┐
│      Presentation Layer              │
│      (Controller)                   │
│      - HTTP 요청/응답 처리           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Business Layer                 │
│      (Service)                      │
│      - 비즈니스 로직 처리           │
│      - 트랜잭션 관리                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Data Access Layer              │
│      (Repository)                   │
│      - 데이터베이스 접근            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Database                       │
│      (PostgreSQL)                   │
└─────────────────────────────────────┘
```

### 각 계층의 책임

1. **Presentation Layer (Controller)**
   - HTTP 요청 수신 및 응답 반환
   - 요청 데이터 검증
   - JSON 변환

2. **Business Layer (Service)**
   - 비즈니스 로직 처리
   - 트랜잭션 관리
   - 데이터 검증 및 변환

3. **Data Access Layer (Repository)**
   - 데이터베이스 CRUD 작업
   - 쿼리 실행

4. **Database**
   - 데이터 영구 저장

---

## 프론트엔드 요청 시 Spring Boot 내부 흐름

### 전체 요청 처리 흐름

```
1. 프론트엔드 (React)
   ↓ HTTP POST /api/messages
   ↓ { "content": "안녕하세요!" }
   
2. 네트워크 계층
   ↓ TCP/IP 통신
   ↓ localhost:8080으로 전송
   
3. Spring Boot 내장 서버 (Tomcat)
   ↓ HTTP 요청 수신
   ↓ DispatcherServlet으로 전달
   
4. DispatcherServlet (Spring MVC 핵심)
   ↓ 요청 URL 분석: /api/messages
   ↓ HandlerMapping으로 적절한 Controller 찾기
   
5. HandlerMapping
   ↓ @RequestMapping("/api") + @PostMapping("/messages") 매칭
   ↓ MessageController.createMessage() 메서드 찾음
   
6. HandlerAdapter
   ↓ Controller 메서드 실행 준비
   ↓ @RequestBody → JSON을 MessageRequest 객체로 변환
   ↓ @Valid → 유효성 검증
   
7. Interceptor (선택적)
   ↓ 요청 전처리 (인증, 로깅 등)
   
8. Controller (MessageController)
   ↓ @PostMapping("/messages") 메서드 실행
   ↓ messageService.createMessage() 호출
   
9. Service (MessageService)
   ↓ @Transactional 시작 (트랜잭션 시작)
   ↓ 비즈니스 로직 처리
   ↓ messageRepository.save() 호출
   
10. Repository (MessageRepository)
    ↓ JpaRepository.save() 호출
    ↓ Hibernate EntityManager에 전달
    
11. Hibernate (JPA 구현체)
    ↓ Entity 상태 확인
    ↓ @PrePersist 메서드 실행 (timestamp 설정)
    ↓ INSERT SQL 생성
    ↓ JDBC로 전달
    
12. JDBC Driver (PostgreSQL Driver)
    ↓ SQL을 PostgreSQL 프로토콜로 변환
    ↓ 데이터베이스로 전송
    
13. PostgreSQL
    ↓ SQL 실행
    ↓ 데이터 저장
    ↓ 결과 반환 (생성된 ID)
    
14. JDBC Driver
    ↓ 결과를 Java 객체로 변환
    
15. Hibernate
    ↓ ResultSet을 Message 엔티티로 매핑
    ↓ 생성된 ID를 Message 객체에 설정
    ↓ EntityManager에 반환
    
16. Repository
    ↓ Message 객체 반환
    
17. Service
    ↓ @Transactional 커밋 (트랜잭션 완료)
    ↓ Message 객체 반환
    
18. Controller
    ↓ ResponseEntity 생성
    ↓ Message 객체를 JSON으로 변환
    
19. HandlerAdapter
    ↓ HTTP 응답 생성
    ↓ Content-Type: application/json
    
20. DispatcherServlet
    ↓ HTTP 응답 반환
    
21. Tomcat
    ↓ 클라이언트로 응답 전송
    
22. 프론트엔드
    ↓ HTTP 201 Created
    ↓ { "id": 1, "content": "안녕하세요!", "timestamp": "..." }
```

### 상세 단계별 설명

#### 1단계: HTTP 요청 수신 (Tomcat)

```java
// Spring Boot 내장 Tomcat 서버가 요청 수신
// 포트 8080에서 대기 중
```

**역할:**
- HTTP 요청을 받아서 Spring의 DispatcherServlet에 전달
- 멀티스레드로 여러 요청 동시 처리

---

#### 2단계: DispatcherServlet (Spring MVC 핵심)

```java
// DispatcherServlet이 모든 요청을 중앙에서 처리
// Front Controller 패턴 구현
```

**역할:**
- 모든 HTTP 요청의 진입점
- 요청을 적절한 Controller로 라우팅
- 요청/응답 처리 전반 관리

**처리 과정:**
1. 요청 URL 분석: `/api/messages`
2. HandlerMapping으로 적절한 Controller 찾기
3. HandlerAdapter로 메서드 실행
4. 결과를 HTTP 응답으로 변환

---

#### 3단계: HandlerMapping

```java
// @RequestMapping("/api") + @PostMapping("/messages")
// → MessageController.createMessage() 메서드 매칭
```

**역할:**
- 요청 URL과 Controller 메서드를 매칭
- 어노테이션 기반 매핑 (`@RequestMapping`, `@PostMapping` 등)

**매칭 규칙:**
- `@RequestMapping("/api")` → 기본 경로
- `@PostMapping("/messages")` → HTTP POST 메서드
- 최종 매칭: `POST /api/messages` → `MessageController.createMessage()`

---

#### 4단계: HandlerAdapter

```java
// 요청 데이터 변환 및 유효성 검증
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(
    @Valid @RequestBody MessageRequest request
) {
    // HandlerAdapter가 다음을 자동 처리:
    // 1. JSON → MessageRequest 객체 변환
    // 2. @Valid로 유효성 검증
    // 3. 메서드 실행
}
```

**역할:**
- 요청 데이터 변환 (JSON → Java 객체)
- 유효성 검증 (`@Valid`)
- Controller 메서드 실행
- 예외 처리

**데이터 변환:**
```json
// HTTP 요청 본문 (JSON)
{
  "content": "안녕하세요!"
}

// ↓ HandlerAdapter가 자동 변환

// Java 객체
MessageRequest request = new MessageRequest();
request.setContent("안녕하세요!");
```

---

#### 5단계: Controller 실행

```java
@RestController
@RequestMapping("/api")
public class MessageController {
    @Autowired
    private MessageService messageService;
    
    @PostMapping("/messages")
    public ResponseEntity<Message> createMessage(
        @Valid @RequestBody MessageRequest request
    ) {
        // 1. Service 계층 호출
        Message message = messageService.createMessage(request.getContent());
        
        // 2. HTTP 응답 생성
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }
}
```

**처리 내용:**
1. Service 계층 호출
2. 결과를 HTTP 응답으로 변환
3. 상태 코드 설정 (201 Created)

---

#### 6단계: Service 실행 (트랜잭션 시작)

```java
@Service
@Transactional  // ← 여기서 트랜잭션 시작!
public class MessageService {
    @Autowired
    private MessageRepository messageRepository;

    public Message createMessage(String content) {
        Message message = new Message();
        message.setContent(content);
        return messageRepository.save(message);
    }
    // ← 메서드 종료 시 트랜잭션 커밋 (또는 롤백)
}
```

**@Transactional 동작:**
1. 메서드 시작 시 트랜잭션 시작
2. 데이터베이스 연결 획득
3. 메서드 실행
4. 정상 완료 시 커밋 (변경사항 저장)
5. 예외 발생 시 롤백 (변경사항 취소)

---

#### 7단계: Repository 실행 (JPA)

```java
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    // save() 메서드는 JpaRepository에서 자동 제공
}
```

**JPA 동작:**
1. `save()` 메서드 호출
2. Hibernate EntityManager에 전달
3. 엔티티 상태 확인 (새 엔티티인지 기존 엔티티인지)
4. SQL 생성 및 실행

---

#### 8단계: Hibernate (JPA 구현체)

```java
// Hibernate가 내부적으로 처리:
// 1. @PrePersist 메서드 실행
message.onCreate(); // timestamp 설정

// 2. INSERT SQL 생성
INSERT INTO messages (content, timestamp) VALUES (?, ?);

// 3. JDBC로 SQL 전달
// 4. 결과를 Message 객체로 매핑
```

**처리 내용:**
1. 엔티티 생명주기 관리
2. SQL 자동 생성
3. 객체-관계 매핑 (ORM)
4. 캐싱 (1차 캐시)

---

#### 9단계: JDBC Driver

```java
// PostgreSQL JDBC Driver가 처리:
// 1. SQL을 PostgreSQL 프로토콜로 변환
// 2. 네트워크를 통해 데이터베이스로 전송
// 3. 결과를 받아서 Java 객체로 변환
```

**역할:**
- 데이터베이스와의 통신 담당
- SQL을 데이터베이스 프로토콜로 변환
- 결과를 Java 객체로 변환

---

#### 10단계: PostgreSQL

```sql
-- PostgreSQL이 SQL 실행
INSERT INTO messages (content, timestamp) 
VALUES ('안녕하세요!', '2026-01-03 22:33:45');

-- ID 자동 생성 (SERIAL 타입)
-- 결과 반환: id = 1
```

**처리 내용:**
1. SQL 파싱 및 실행 계획 수립
2. 데이터 저장
3. 트랜잭션 로그 기록
4. 결과 반환

---

#### 11-17단계: 역방향 흐름 (응답)

```
PostgreSQL → JDBC → Hibernate → Repository → Service → Controller
```

각 계층에서 결과를 상위 계층으로 전달하며, 최종적으로 Controller에서 HTTP 응답 생성

---

#### 18단계: HTTP 응답 생성

```java
// Controller에서 반환
return ResponseEntity.status(HttpStatus.CREATED).body(message);

// HandlerAdapter가 JSON으로 변환
{
  "id": 1,
  "content": "안녕하세요!",
  "timestamp": "2026-01-03T22:33:45"
}
```

**응답 형식:**
- HTTP Status: 201 Created
- Content-Type: application/json
- Body: JSON 형식의 Message 객체

---

## 주요 라이브러리 및 역할

### 1. Spring Boot Starter Web

**의존성:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

**포함된 라이브러리:**
- **Spring MVC**: 웹 애플리케이션 프레임워크
- **Tomcat**: 내장 웹 서버
- **Jackson**: JSON 변환 (Java 객체 ↔ JSON)
- **Spring Boot Auto Configuration**: 자동 설정

**역할:**
- HTTP 요청/응답 처리
- RESTful API 구현
- JSON 직렬화/역직렬화
- 내장 서버 제공

---

### 2. Spring Boot Starter Data JPA

**의존성:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

**포함된 라이브러리:**
- **Hibernate**: JPA 구현체 (ORM)
- **Spring Data JPA**: Repository 패턴 구현
- **HikariCP**: 커넥션 풀 (성능 최적화)

**역할:**
- 객체-관계 매핑 (ORM)
- SQL 자동 생성
- 데이터베이스 접근 추상화
- 트랜잭션 관리

---

### 3. Hibernate (JPA 구현체)

**역할:**
- Java 객체와 데이터베이스 테이블 매핑
- SQL 자동 생성 및 실행
- 엔티티 생명주기 관리
- 캐싱 (1차, 2차 캐시)

**주요 기능:**
- **EntityManager**: 엔티티 관리
- **Session**: 데이터베이스 세션 관리
- **Query**: 쿼리 생성 및 실행
- **Transaction**: 트랜잭션 관리

---

### 4. Spring Transaction Management

**@Transactional 어노테이션**

**역할:**
- 트랜잭션 경계 설정
- 자동 커밋/롤백
- 트랜잭션 전파 관리

**동작 원리:**

```java
@Service
@Transactional
public class MessageService {
    public Message createMessage(String content) {
        // 1. 트랜잭션 시작 (자동)
        //    - 데이터베이스 연결 획득
        //    - 트랜잭션 시작
        
        Message message = new Message();
        message.setContent(content);
        messageRepository.save(message);
        
        // 2. 정상 완료 시 커밋 (자동)
        //    - 변경사항을 데이터베이스에 저장
        //    - 트랜잭션 종료
        //    - 연결 반환
        
        // 예외 발생 시 롤백 (자동)
        //    - 모든 변경사항 취소
        //    - 트랜잭션 종료
        
        return message;
    }
}
```

**트랜잭션 전파 (Propagation):**

```java
@Transactional(propagation = Propagation.REQUIRED)  // 기본값
// 현재 트랜잭션이 있으면 사용, 없으면 새로 생성

@Transactional(propagation = Propagation.REQUIRES_NEW)
// 항상 새로운 트랜잭션 생성

@Transactional(propagation = Propagation.SUPPORTS)
// 트랜잭션이 있으면 사용, 없으면 트랜잭션 없이 실행
```

**격리 수준 (Isolation):**

```java
@Transactional(isolation = Isolation.READ_COMMITTED)  // 기본값
// 커밋된 데이터만 읽기

@Transactional(isolation = Isolation.REPEATABLE_READ)
// 같은 트랜잭션 내에서 같은 쿼리는 항상 같은 결과

@Transactional(isolation = Isolation.SERIALIZABLE)
// 가장 엄격한 격리 수준
```

**읽기 전용 트랜잭션:**

```java
@Transactional(readOnly = true)
public List<Message> getAllMessages() {
    // 읽기 전용이므로 성능 최적화
    // - 쓰기 작업 시 예외 발생
    // - 읽기 최적화
    return messageRepository.findAll();
}
```

---

### 5. Lombok

**의존성:**
```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</dependency>
```

**역할:**
- 보일러플레이트 코드 자동 생성
- 컴파일 시점에 코드 생성

**주요 어노테이션:**

```java
@Data
// 자동 생성: getter, setter, toString, equals, hashCode

@NoArgsConstructor
// 자동 생성: 기본 생성자

@AllArgsConstructor
// 자동 생성: 모든 필드를 파라미터로 받는 생성자

@Getter
@Setter
// 개별적으로 getter/setter 생성
```

**예시:**
```java
// Lombok 사용 전
public class Message {
    private Long id;
    private String content;
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    // ... toString, equals, hashCode 등
}

// Lombok 사용 후
@Data
public class Message {
    private Long id;
    private String content;
    // 모든 메서드 자동 생성!
}
```

---

### 6. Spring Boot Starter Validation

**의존성:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

**역할:**
- 요청 데이터 유효성 검증
- Bean Validation (JSR-303) 구현

**주요 어노테이션:**

```java
@NotBlank  // null, 빈 문자열, 공백만 있는 문자열 체크
@NotNull   // null 체크
@NotEmpty  // null, 빈 컬렉션 체크
@Size(min=1, max=100)  // 크기 체크
@Email     // 이메일 형식 체크
@Min(0)    // 최소값 체크
@Max(100)  // 최대값 체크
```

**사용 예시:**
```java
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(
    @Valid @RequestBody MessageRequest request
) {
    // @Valid로 자동 검증
    // 검증 실패 시 400 Bad Request 반환
}
```

---

### 7. PostgreSQL JDBC Driver

**의존성:**
```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
```

**역할:**
- Java와 PostgreSQL 간 통신
- JDBC API 구현
- SQL 실행 및 결과 처리

**동작:**
1. JDBC URL로 데이터베이스 연결
2. SQL을 PostgreSQL 프로토콜로 변환
3. 네트워크를 통해 전송
4. 결과를 Java 객체로 변환

---

### 8. HikariCP (커넥션 풀)

**역할:**
- 데이터베이스 연결 풀 관리
- 성능 최적화 (연결 재사용)

**동작 원리:**
```
애플리케이션 시작 시:
1. 미리 데이터베이스 연결을 여러 개 생성 (풀)
2. 연결을 풀에 저장

요청 시:
1. 풀에서 사용 가능한 연결 가져오기
2. SQL 실행
3. 연결을 풀에 반환 (재사용)

장점:
- 연결 생성 비용 절약
- 빠른 응답 시간
- 동시 요청 처리 가능
```

---

## 트랜잭션 상세 설명

### 트랜잭션이란?

**정의:**
- 데이터베이스 작업의 논리적 단위
- 여러 작업을 하나의 작업처럼 처리
- 모두 성공하거나 모두 실패 (All or Nothing)

**ACID 원칙:**
- **Atomicity (원자성)**: 모두 성공하거나 모두 실패
- **Consistency (일관성)**: 데이터 무결성 유지
- **Isolation (격리성)**: 동시 실행 트랜잭션 간 격리
- **Durability (지속성)**: 커밋된 데이터는 영구 저장

### Spring 트랜잭션 동작 과정

#### 1. 트랜잭션 시작

```java
@Transactional
public Message createMessage(String content) {
    // Spring이 자동으로 처리:
    // 1. 트랜잭션 매니저에서 트랜잭션 시작
    // 2. 데이터베이스 연결 획득
    // 3. 자동 커밋 모드 해제 (BEGIN TRANSACTION)
}
```

**내부 동작:**
```sql
-- Hibernate가 자동 실행
BEGIN TRANSACTION;
-- 이후 모든 SQL은 이 트랜잭션 내에서 실행
```

#### 2. 트랜잭션 내 작업 수행

```java
Message message = new Message();
message.setContent(content);
messageRepository.save(message);  // INSERT 실행

// 모든 작업이 같은 트랜잭션 내에서 실행됨
```

**SQL 실행:**
```sql
-- 트랜잭션 내에서 실행
INSERT INTO messages (content, timestamp) 
VALUES ('안녕하세요!', '2026-01-03 22:33:45');
-- 아직 커밋되지 않음 (메모리에만 존재)
```

#### 3. 트랜잭션 커밋 (정상 완료)

```java
// 메서드가 정상적으로 종료되면
// Spring이 자동으로 커밋
```

**내부 동작:**
```sql
COMMIT;
-- 이제 데이터베이스에 영구 저장됨
```

#### 4. 트랜잭션 롤백 (예외 발생)

```java
@Transactional
public Message createMessage(String content) {
    Message message = new Message();
    message.setContent(content);
    messageRepository.save(message);
    
    if (someCondition) {
        throw new RuntimeException("오류 발생!");
        // 예외 발생 시 자동 롤백
    }
    
    return message;
}
```

**내부 동작:**
```sql
ROLLBACK;
-- 모든 변경사항 취소
-- 데이터베이스는 원래 상태로 복구
```

### 트랜잭션 전파 (Propagation)

**시나리오: 메서드 A가 메서드 B를 호출할 때**

```java
@Service
public class MessageService {
    @Transactional
    public void methodA() {
        // 트랜잭션 1 시작
        methodB();  // 같은 트랜잭션 사용?
        // 트랜잭션 1 커밋
    }
    
    @Transactional
    public void methodB() {
        // 새로운 트랜잭션? 기존 트랜잭션?
    }
}
```

**Propagation.REQUIRED (기본값):**
```java
@Transactional(propagation = Propagation.REQUIRED)
public void methodB() {
    // 기존 트랜잭션이 있으면 사용
    // 없으면 새로 생성
    // → methodA의 트랜잭션 사용
}
```

**Propagation.REQUIRES_NEW:**
```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void methodB() {
    // 항상 새로운 트랜잭션 생성
    // → methodA와 독립적인 트랜잭션
    // → methodB가 실패해도 methodA는 커밋됨
}
```

### 트랜잭션 격리 수준 (Isolation)

**문제 상황: 동시에 같은 데이터를 수정할 때**

```java
// 트랜잭션 1
@Transactional
public void updateMessage(Long id) {
    Message msg = repository.findById(id);  // 읽기
    msg.setContent("수정됨");
    repository.save(msg);  // 쓰기
}

// 트랜잭션 2 (동시 실행)
@Transactional
public void updateMessage(Long id) {
    Message msg = repository.findById(id);  // 읽기
    msg.setContent("다른 수정");
    repository.save(msg);  // 쓰기
}
```

**격리 수준별 동작:**

1. **READ_UNCOMMITTED** (가장 낮음)
   - 다른 트랜잭션의 커밋되지 않은 데이터도 읽기 가능
   - Dirty Read 발생 가능

2. **READ_COMMITTED** (기본값)
   - 커밋된 데이터만 읽기
   - Dirty Read 방지
   - Non-Repeatable Read 발생 가능

3. **REPEATABLE_READ**
   - 같은 트랜잭션 내에서 같은 쿼리는 항상 같은 결과
   - Non-Repeatable Read 방지
   - Phantom Read 발생 가능

4. **SERIALIZABLE** (가장 높음)
   - 가장 엄격한 격리
   - 모든 문제 방지
   - 성능 저하 가능

---

## 라이브러리 간 상호작용

### 요청 처리 시 라이브러리 협력

```
1. Tomcat (내장 서버)
   ↓ HTTP 요청 수신
   
2. Spring MVC (DispatcherServlet)
   ↓ 요청 라우팅 및 처리
   
3. Jackson (JSON 변환)
   ↓ JSON ↔ Java 객체 변환
   
4. Spring Validation
   ↓ 데이터 유효성 검증
   
5. Spring AOP (트랜잭션)
   ↓ @Transactional 처리
   
6. Spring Data JPA
   ↓ Repository 패턴 구현
   
7. Hibernate (JPA 구현체)
   ↓ ORM 처리, SQL 생성
   
8. HikariCP (커넥션 풀)
   ↓ 데이터베이스 연결 관리
   
9. PostgreSQL JDBC Driver
   ↓ 데이터베이스 통신
   
10. PostgreSQL
    ↓ 데이터 저장
```

### 의존성 관계

```
Spring Boot
├── Spring MVC
│   ├── DispatcherServlet
│   └── HandlerMapping
├── Spring Data JPA
│   ├── Repository 인터페이스
│   └── 트랜잭션 관리
├── Hibernate
│   ├── EntityManager
│   └── SQL 생성
└── HikariCP
    └── 커넥션 풀
```

---

## 핵심 정리

### 레이어드 아키텍처의 장점

1. **관심사 분리**: 각 계층이 명확한 책임
2. **유지보수성**: 계층별로 독립적 수정 가능
3. **테스트 용이성**: 각 계층을 독립적으로 테스트 가능
4. **재사용성**: Service 계층을 여러 Controller에서 사용 가능

### 트랜잭션의 중요성

1. **데이터 일관성**: 여러 작업을 하나의 단위로 처리
2. **오류 처리**: 예외 발생 시 자동 롤백
3. **동시성 제어**: 여러 사용자가 동시에 접근해도 안전

### 라이브러리 선택 이유

1. **Spring Boot**: 자동 설정으로 빠른 개발
2. **JPA/Hibernate**: SQL 작성 없이 데이터베이스 조작
3. **HikariCP**: 성능 최적화된 커넥션 풀
4. **Lombok**: 보일러플레이트 코드 제거

---

이 구조를 통해 프론트엔드에서 보낸 메시지가 PostgreSQL 데이터베이스에 영구 저장되고, 서버 재시작 후에도 데이터가 유지됩니다.

