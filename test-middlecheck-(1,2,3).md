# Spring Boot 백엔드 입문 가이드

백엔드 개발이 처음인 분들을 위한 가이드입니다.
이 프로젝트의 실제 코드를 보면서 **레이어드 아키텍처**와 **데이터 흐름**을 이해해봅시다.

---

## 1. 레이어드 아키텍처란?

백엔드 코드를 **역할별로 층(Layer)을 나눠서** 관리하는 방식입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│                   (브라우저, 앱, Postman)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP 요청 (GET /api/messages)
┌─────────────────────────────────────────────────────────────┐
│  Controller 계층                                             │
│  ─────────────────                                          │
│  "문지기" 역할                                                │
│  - HTTP 요청을 받음                                          │
│  - 요청 데이터 검증                                           │
│  - Service에게 일을 시킴                                      │
│  - HTTP 응답을 보냄                                          │
│                                                             │
│  파일: MessageController.java                                │
│  어노테이션: @RestController, @GetMapping, @PostMapping       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ 메서드 호출
┌─────────────────────────────────────────────────────────────┐
│  Service 계층                                                │
│  ─────────────────                                          │
│  "두뇌" 역할                                                  │
│  - 비즈니스 로직 처리                                         │
│  - 데이터 가공/변환                                           │
│  - 트랜잭션 관리                                              │
│  - Repository에게 DB 작업 요청                                │
│                                                             │
│  파일: MessageService.java                                   │
│  어노테이션: @Service, @Transactional                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ 메서드 호출
┌─────────────────────────────────────────────────────────────┐
│  Repository 계층                                             │
│  ─────────────────                                          │
│  "창고 관리자" 역할                                            │
│  - 데이터베이스와 직접 통신                                    │
│  - CRUD 작업 수행                                            │
│  - SQL 쿼리 실행                                             │
│                                                             │
│  파일: MessageRepository.java                                │
│  어노테이션: @Repository                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ SQL 쿼리
┌─────────────────────────────────────────────────────────────┐
│  Database (PostgreSQL)                                      │
│  ─────────────────                                          │
│  - 실제 데이터 저장소                                         │
│  - messages 테이블                                           │
└─────────────────────────────────────────────────────────────┘
```

### 왜 이렇게 나눌까?

| 장점 | 설명 |
|------|------|
| **유지보수 쉬움** | DB를 바꿔도 Repository만 수정하면 됨 |
| **테스트 쉬움** | 각 계층을 독립적으로 테스트 가능 |
| **역할 분리** | 각자 맡은 일만 하면 됨 |
| **협업 용이** | "나는 Controller 담당, 너는 Service 담당" |

---

## 2. 프로젝트 폴더 구조

```
backend/src/main/java/com/cycle/backend/
│
├── BackendApplication.java    ← 앱 시작점 (@SpringBootApplication)
│
├── controller/
│   └── MessageController.java ← HTTP 요청 처리 (@RestController)
│
├── service/
│   └── MessageService.java    ← 비즈니스 로직 (@Service)
│
├── repository/
│   └── MessageRepository.java ← DB 접근 (@Repository)
│
├── model/
│   ├── Message.java           ← DB 테이블과 매핑 (@Entity)
│   └── MessageRequest.java    ← 요청 데이터 형식 (@Data)
│
└── config/
    └── CorsConfig.java        ← 설정 클래스 (@Configuration)
```

---

## 3. 실제 데이터 흐름 따라가기

**"메시지 목록 조회"** 요청이 어떻게 처리되는지 따라가봅시다.

### 요청: `GET http://localhost:8080/api/messages`

```
브라우저에서 "메시지 목록 보여줘" 요청
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1단계: Controller가 요청을 받음                           │
│                                                         │
│ @GetMapping("/messages")  ← "GET /api/messages 담당이야" │
│ public ResponseEntity<List<Message>> getAllMessages() { │
│     List<Message> messages = messageService.getAll...   │
│     return ResponseEntity.ok(messages);                 │
│ }                                                       │
│                                                         │
│ → "Service야, 메시지 목록 가져와!"                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2단계: Service가 비즈니스 로직 처리                        │
│                                                         │
│ @Transactional(readOnly = true)  ← "읽기만 할거야"       │
│ public List<Message> getAllMessages() {                 │
│     return messageRepository.findAll();                 │
│ }                                                       │
│                                                         │
│ → "Repository야, DB에서 전부 가져와!"                     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3단계: Repository가 DB에서 데이터 조회                     │
│                                                         │
│ public interface MessageRepository                      │
│     extends JpaRepository<Message, Long> {              │
│     // findAll()은 JpaRepository가 자동 제공!            │
│ }                                                       │
│                                                         │
│ → 자동으로 "SELECT * FROM messages" 실행                 │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4단계: 결과가 역순으로 돌아감                              │
│                                                         │
│ DB → Repository → Service → Controller → 브라우저        │
│                                                         │
│ 최종 응답 (JSON):                                        │
│ [                                                       │
│   { "id": 1, "content": "안녕!", "timestamp": "..." },  │
│   { "id": 2, "content": "반가워", "timestamp": "..." }  │
│ ]                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 각 파일별 상세 설명

### 4-1. Message.java (Entity - 데이터 모델)

```java
@Entity                              // "이 클래스는 DB 테이블이야"
@Table(name = "messages")            // "테이블 이름은 messages야"
@Data                                // getter, setter 자동 생성 (Lombok)
@NoArgsConstructor                   // 기본 생성자 자동 생성
@AllArgsConstructor                  // 모든 필드 생성자 자동 생성
public class Message {

    @Id                              // "이게 Primary Key야"
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // "자동 증가해"
    private Long id;

    @Column(nullable = false, length = 1000)  // "필수값, 최대 1000자"
    private String content;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist                      // "저장하기 직전에 실행해"
    protected void onCreate() {
        timestamp = LocalDateTime.now();  // 현재 시간 자동 설정
    }
}
```

**DB 테이블로 변환되면:**
```sql
CREATE TABLE messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content VARCHAR(1000) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);
```

---

### 4-2. MessageRepository.java (Repository - DB 접근)

```java
@Repository  // "이건 DB 접근 담당이야"
public interface MessageRepository extends JpaRepository<Message, Long> {
    //                                        ↑Entity   ↑PK타입

    // JpaRepository가 자동으로 제공하는 메서드들:
    // - findAll()        : 전체 조회
    // - findById(id)     : ID로 조회
    // - save(entity)     : 저장/수정
    // - deleteById(id)   : 삭제

    // 커스텀 쿼리 (메서드 이름으로 자동 생성!)
    List<Message> findByContentContaining(String keyword);
    // → SELECT * FROM messages WHERE content LIKE '%keyword%'
}
```

**신기한 점:** 인터페이스만 만들면 Spring이 알아서 구현체를 만들어줌!

---

### 4-3. MessageService.java (Service - 비즈니스 로직)

```java
@Service         // "이건 비즈니스 로직 담당이야"
@Transactional   // "이 클래스의 메서드들은 트랜잭션으로 묶어"
public class MessageService {

    @Autowired   // "Repository를 자동으로 주입해줘"
    private MessageRepository messageRepository;

    // 메시지 생성
    public Message createMessage(String content) {
        Message message = new Message();
        message.setContent(content);
        // timestamp는 @PrePersist가 자동 설정
        return messageRepository.save(message);  // DB에 저장
    }

    // 전체 조회 (읽기 전용 트랜잭션 = 성능 최적화)
    @Transactional(readOnly = true)
    public List<Message> getAllMessages() {
        return messageRepository.findAll();
    }

    // ID로 조회
    @Transactional(readOnly = true)
    public Optional<Message> getMessageById(Long id) {
        return messageRepository.findById(id);
    }

    // 삭제
    public void deleteMessage(Long id) {
        messageRepository.deleteById(id);
    }
}
```

---

### 4-4. MessageController.java (Controller - HTTP 요청 처리)

```java
@RestController              // "REST API 컨트롤러야" (JSON 응답)
@RequestMapping("/api")      // "기본 경로는 /api야"
@CrossOrigin(origins = "*")  // "모든 도메인에서 접근 허용"
public class MessageController {

    @Autowired
    private MessageService messageService;

    // POST /api/messages - 메시지 생성
    @PostMapping("/messages")
    public ResponseEntity<Message> createMessage(
            @Valid @RequestBody MessageRequest request) {
        //  ↑검증해   ↑JSON을 객체로 변환

        Message message = messageService.createMessage(request.getContent());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
        //                          ↑ 201 Created 응답
    }

    // GET /api/messages - 전체 조회
    @GetMapping("/messages")
    public ResponseEntity<List<Message>> getAllMessages() {
        List<Message> messages = messageService.getAllMessages();
        return ResponseEntity.ok(messages);  // 200 OK
    }

    // GET /api/messages/1 - ID로 조회
    @GetMapping("/messages/{id}")
    public ResponseEntity<Message> getMessageById(
            @PathVariable Long id) {  // URL의 {id}를 변수로 받음
        return messageService.getMessageById(id)
                .map(ResponseEntity::ok)           // 있으면 200 OK
                .orElse(ResponseEntity.notFound().build());  // 없으면 404
    }

    // DELETE /api/messages/1 - 삭제
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();  // 204 No Content
    }
}
```

---

## 5. Annotation(어노테이션) 역할 정리

### 계층별 핵심 어노테이션

| 계층 | 어노테이션 | 의미 |
|------|-----------|------|
| **시작점** | `@SpringBootApplication` | "여기서 앱 시작!" |
| **Controller** | `@RestController` | "HTTP 요청 받는 곳" |
| **Service** | `@Service` | "비즈니스 로직 처리" |
| **Repository** | `@Repository` | "DB 접근 담당" |
| **Entity** | `@Entity` | "DB 테이블과 매핑" |
| **Config** | `@Configuration` | "설정 클래스" |

### HTTP 관련 어노테이션

| 어노테이션 | HTTP 메서드 | 용도 |
|-----------|------------|------|
| `@GetMapping` | GET | 조회 |
| `@PostMapping` | POST | 생성 |
| `@PutMapping` | PUT | 전체 수정 |
| `@PatchMapping` | PATCH | 부분 수정 |
| `@DeleteMapping` | DELETE | 삭제 |

### 의존성 주입

```java
@Autowired  // "이 객체를 Spring이 알아서 넣어줘"
private MessageService messageService;
```

**왜 필요해?**
- `new MessageService()` 직접 안 해도 됨
- Spring이 알아서 객체 생성하고 관리
- 테스트할 때 가짜 객체로 교체 가능

---

## 6. Docker로 실행하기

### 왜 Docker를 쓰면 좋을까?

**상황 1: 새로운 팀원이 합류했을 때**
```
Docker 없이:
"자바 17 설치하고, Node.js 20 설치하고, PostgreSQL 설치하고,
 데이터베이스 만들고, 환경변수 설정하고... 아 버전이 안 맞네요?"
→ 반나절 소요, 에러 발생

Docker 있으면:
"docker-compose up -d 하세요"
→ 5분 끝
```

**상황 2: "내 컴퓨터에서는 되는데요?"**
```
Docker 없이:
개발자 A: macOS + Java 17 + PostgreSQL 14
개발자 B: Windows + Java 11 + PostgreSQL 15
→ 버전 차이로 이상한 버그 발생

Docker 있으면:
모든 개발자가 똑같은 환경 (컨테이너 안에서 동일한 버전)
→ 환경 문제 없음
```

**상황 3: 서버 배포할 때**
```
Docker 없이:
서버에 Java 설치, Node.js 설치, PostgreSQL 설치...
개발 환경과 서버 환경이 달라서 문제 발생

Docker 있으면:
개발 환경 = 서버 환경 (똑같은 이미지 사용)
→ "개발할 때 됐으면 서버에서도 됨"
```

**상황 4: 여러 프로젝트 동시 작업**
```
Docker 없이:
프로젝트 A: Java 11 필요
프로젝트 B: Java 17 필요
→ 버전 충돌, 매번 전환 필요

Docker 있으면:
각 프로젝트가 자기만의 컨테이너 사용
→ 서로 영향 없음
```

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Frontend   │  │   Backend   │  │  PostgreSQL │     │
│  │  (React)    │→→│ (Spring)    │→→│    (DB)     │     │
│  │  :3000      │  │  :8080      │  │   :5432     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 실행 명령어

```bash
# 1. Docker Desktop 실행 (필수!)

# 2. 전체 스택 실행
docker-compose up -d

# 3. 접속
# - 프론트엔드: http://localhost:3000
# - 백엔드 API: http://localhost:8080/api/messages
# - 헬스체크: http://localhost:8080/api/health

# 4. 로그 확인
docker-compose logs -f backend

# 5. 중지
docker-compose down
```

### Docker 없이 실행

```bash
# 터미널 1: PostgreSQL 필요 (로컬에 설치되어 있어야 함)

# 터미널 2: 백엔드
cd backend
./mvnw spring-boot:run

# 터미널 3: 프론트엔드
cd frontend
npm install
npm run dev
```

---

## 7. 프론트엔드에 Nginx를 둔 이유

### 현재 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ 브라우저                                                         │
│   │                                                             │
│   │ http://localhost:3000                                       │
│   ▼                                                             │
│ ┌─────────────────────────────────────────────┐                 │
│ │ Frontend 컨테이너 (Nginx)                     │                 │
│ │                                             │                 │
│ │  /            → index.html (React 앱)       │                 │
│ │  /api/*       → Backend:8080으로 프록시      │  ← 핵심!        │
│ └─────────────────────────────────────────────┘                 │
│                        │                                        │
│                        ▼ /api 요청만                             │
│ ┌─────────────────────────────────────────────┐                 │
│ │ Backend 컨테이너 (Spring Boot)               │                 │
│ └─────────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### Nginx가 하는 일

**1. 정적 파일 제공 (웹 서버)**
```
React 빌드 결과물 (HTML, CSS, JS)을 브라우저에 전달
- index.html
- main.js
- style.css
```

**2. API 프록시 (리버스 프록시)**
```nginx
# nginx.conf
location /api {
    proxy_pass http://backend:8080;
}
```
- 브라우저: `http://localhost:3000/api/messages` 요청
- Nginx: "아, /api로 시작하네? backend:8080으로 전달해줄게"
- Backend: 요청 처리 후 응답
- Nginx: 응답을 브라우저에 전달

**3. SPA 라우팅 지원**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
- `/about`, `/profile` 같은 React Router 경로도 처리
- 없는 파일이면 → index.html 반환 → React가 라우팅 처리

### 왜 프록시가 필요할까?

**CORS 문제 해결!**

```
프록시 없으면:
┌──────────────┐         ┌──────────────┐
│ 브라우저      │ ──────→ │ Backend      │
│ localhost:3000│         │ localhost:8080│
└──────────────┘         └──────────────┘
        ↑
        │ 브라우저: "포트가 다르잖아! CORS 에러!"

프록시 있으면:
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ 브라우저      │ ──────→ │ Nginx        │ ──────→ │ Backend      │
│ localhost:3000│         │ localhost:3000│         │ localhost:8080│
└──────────────┘         └──────────────┘         └──────────────┘
        ↑
        │ 브라우저: "같은 포트(3000)네? OK!"
```

### 프론트에 Nginx 두기 싫다면? (대안들)

#### 방법 1: 개발 서버의 프록시 사용 (개발 환경)

**Vite (vite.config.js)**
```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
}
```

**장점:** 개발할 때 간편
**단점:** 프로덕션에서는 사용 불가 (개발 서버는 프로덕션용 아님)

#### 방법 2: Backend에서 정적 파일도 제공

```
┌──────────────────────────────────────┐
│ Backend (Spring Boot)                │
│                                      │
│  /api/*     → REST API              │
│  /*         → React 빌드 파일        │
│             (static 폴더에 복사)      │
└──────────────────────────────────────┘
```

**Spring Boot 설정:**
```
src/main/resources/static/
├── index.html
├── assets/
│   ├── main.js
│   └── style.css
```

**장점:** 서버 하나로 끝, 구조 단순
**단점:** 프론트/백엔드 배포가 항상 같이 됨, 확장성 낮음

#### 방법 3: 별도의 리버스 프록시 서버

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (별도 컨테이너)                      │
│  ┌─────────────┐                      ┌─────────────┐       │
│  │ /           │ → Frontend 컨테이너   │ /api        │ → Backend │
│  │ (정적 파일)  │   (Node로 serve)      │ (API 요청)   │          │
│  └─────────────┘                      └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**docker-compose.yml 예시:**
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    # nginx.conf에서 라우팅 설정

  frontend:
    # 정적 파일만 제공 (또는 Node serve)

  backend:
    # API만 제공
```

**장점:** 프론트/백엔드 완전 분리, 확장성 좋음
**단점:** 구조 복잡, 컨테이너 하나 더 필요

### 정리: 언제 어떤 방식?

| 상황 | 추천 방식 |
|------|----------|
| **개발 중** | Vite/CRA 프록시 |
| **소규모 프로젝트** | Backend에서 정적 파일 제공 |
| **현재 프로젝트 (일반적)** | Frontend에 Nginx (현재 방식) |
| **대규모/MSA** | 별도 리버스 프록시 |

---

## 8. API 테스트해보기

### curl로 테스트

```bash
# 메시지 생성
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "안녕하세요!"}'

# 전체 조회
curl http://localhost:8080/api/messages

# ID로 조회
curl http://localhost:8080/api/messages/1

# 삭제
curl -X DELETE http://localhost:8080/api/messages/1
```

### 브라우저에서 테스트

1. http://localhost:8080/api/health → "Backend is running!"
2. http://localhost:8080/api/messages → 메시지 목록 (JSON)

---

## 9. 요약: 요청 처리 흐름

```
[클라이언트]
    │
    │ POST /api/messages {"content": "Hello"}
    ▼
[Controller] @RestController
    │ - HTTP 요청 받음
    │ - @Valid로 데이터 검증
    │ - @RequestBody로 JSON → 객체 변환
    ▼
[Service] @Service
    │ - 비즈니스 로직 처리
    │ - @Transactional로 트랜잭션 관리
    ▼
[Repository] @Repository
    │ - JpaRepository가 SQL 자동 생성
    │ - save() → INSERT INTO messages ...
    ▼
[Database]
    │ - 데이터 저장
    ▼
[역방향으로 결과 반환]
    │
    ▼
[클라이언트]
    {"id": 1, "content": "Hello", "timestamp": "2024-..."}
```

---

## 핵심 정리

| 개념 | 한 줄 설명 |
|------|-----------|
| **레이어드 아키텍처** | Controller → Service → Repository로 역할 분리 |
| **Controller** | HTTP 요청/응답 담당 (문지기) |
| **Service** | 비즈니스 로직 담당 (두뇌) |
| **Repository** | DB 접근 담당 (창고 관리자) |
| **Entity** | DB 테이블과 1:1 매핑되는 클래스 |
| **@Autowired** | Spring이 알아서 객체 주입 |
| **@Transactional** | DB 작업을 하나의 단위로 묶음 |
