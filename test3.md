# Docker 사용 가이드

## 📊 Docker 추가 전후 비교

### Docker 추가 전 (기존 방식)

#### 실행 방법
```bash
# 1. Java 17 설치 필요
brew install openjdk@17

# 2. Maven 설치 (또는 mvnw 사용)
# 3. Node.js 설치
brew install node

# 4. PostgreSQL 설치 및 실행
brew install postgresql@15
brew services start postgresql@15

# 5. 데이터베이스 생성
createdb cycle_db

# 6. 백엔드 실행 (터미널 1)
cd backend
./mvnw spring-boot:run

# 7. 프론트엔드 실행 (터미널 2)
cd frontend
npm install
npm run dev
```

#### 문제점
- ❌ **설치 과정 복잡**: Java, Node.js, PostgreSQL 각각 설치 필요
- ❌ **환경 차이**: 개발자마다 버전이 다르면 "내 컴퓨터에서는 되는데..." 문제
- ❌ **여러 터미널 필요**: 백엔드, 프론트엔드 각각 다른 터미널에서 실행
- ❌ **수동 설정**: PostgreSQL 실행, 데이터베이스 생성 등 수동 작업
- ❌ **포트 충돌**: 이미 사용 중인 포트와 충돌 가능
- ❌ **재설치 필요**: 새 컴퓨터에서 모든 도구 다시 설치

---

### Docker 추가 후 (현재 방식)

#### 실행 방법
```bash
# 1. Docker만 설치
# 2. 한 줄로 전체 실행
docker-compose up -d
```

#### 개선점
- ✅ **한 번의 명령어**: `docker-compose up -d` 한 번으로 전체 실행
- ✅ **환경 일관성**: 모든 개발자가 똑같은 환경 사용
- ✅ **간편한 설치**: Docker만 설치하면 끝
- ✅ **자동화**: PostgreSQL 자동 실행, 데이터베이스 자동 생성
- ✅ **격리된 환경**: 로컬 환경에 영향 없음
- ✅ **데이터 영구 저장**: 컨테이너 삭제해도 데이터 유지

---

## 🔄 구체적인 변화 사항

### 1. 실행 과정의 변화

| 항목 | Docker 전 | Docker 후 |
|------|----------|-----------|
| **설치** | Java, Node.js, PostgreSQL 각각 설치 | Docker만 설치 |
| **실행** | 3개 터미널에서 각각 실행 | 1개 명령어로 전체 실행 |
| **데이터베이스** | 수동으로 설치 및 실행 | 자동으로 컨테이너 실행 |
| **네트워크** | localhost로 수동 연결 | 자동으로 서비스 간 연결 |
| **정리** | 각각 중지해야 함 | `docker-compose down` 한 번 |

### 2. 환경 설정의 변화

**Docker 전:**
```
개발자 A의 환경:
- macOS, Java 17, Node.js 18, PostgreSQL 14
- 포트 8080, 3000, 5432 사용

개발자 B의 환경:
- Windows, Java 11, Node.js 20, PostgreSQL 15
- 포트 충돌 발생 가능
→ 버전 차이로 인한 문제!
```

**Docker 후:**
```
모든 개발자의 환경:
- Docker만 설치
- 컨테이너 안에서 똑같은 환경:
  - Java 17 (백엔드 컨테이너)
  - Node.js 20 (프론트엔드 빌드)
  - PostgreSQL 15 (데이터베이스 컨테이너)
→ 버전 문제 없음!
```

### 3. 코드 수정 후 재실행의 변화

**Docker 전:**
```bash
# 백엔드 코드 수정 후
cd backend
./mvnw spring-boot:run  # 다시 실행

# 프론트엔드 코드 수정 후
cd frontend
npm run dev  # 다시 실행
```

**Docker 후:**
```bash
# 코드 수정 후
docker-compose up --build -d
# 또는 특정 서비스만 재빌드
docker-compose up --build backend
```

### 4. 데이터 관리의 변화

**Docker 전:**
- PostgreSQL 데이터가 로컬 파일 시스템에 저장
- 백업/복원이 복잡함
- 다른 환경으로 이동하기 어려움

**Docker 후:**
- Docker 볼륨으로 데이터 관리
- `docker volume` 명령어로 쉽게 백업/복원
- 다른 환경으로 쉽게 이동 가능

---

## 📁 추가된 파일들과 그 역할

### 1. `docker-compose.yml` - 전체 스택 오케스트레이션

**위치:** 프로젝트 루트

**역할:**
- 3개의 서비스(PostgreSQL, 백엔드, 프론트엔드)를 하나로 묶어서 관리
- 서비스 간 네트워크 자동 연결
- 실행 순서 자동 관리 (의존성)
- 데이터 영구 저장 (볼륨)

**왜 필요한가?**
- 각 서비스를 개별적으로 실행하는 것은 번거로움
- 서비스들이 서로 통신할 수 있게 네트워크 연결 필요
- PostgreSQL이 먼저 실행되어야 백엔드가 연결 가능
- 데이터를 영구 저장하기 위해 볼륨 필요

**주요 설정:**
```yaml
services:
  postgres:      # PostgreSQL 데이터베이스
  backend:       # Spring Boot 백엔드
  frontend:      # React 프론트엔드

volumes:
  postgres_data: # 데이터 영구 저장
```

**사용법:**
```bash
docker-compose up -d      # 전체 실행
docker-compose down        # 전체 중지
docker-compose logs -f     # 로그 확인
```

---

### 2. `backend/Dockerfile` - 백엔드 컨테이너 이미지 빌드

**위치:** `backend/Dockerfile`

**역할:**
- Spring Boot 애플리케이션을 컨테이너 이미지로 변환
- Multi-stage build로 최적화된 이미지 생성

**왜 필요한가?**
- Spring Boot를 실행하려면 Java가 필요
- Java를 로컬에 설치하지 않고, 컨테이너 안에서 실행
- 빌드 도구(Maven)와 실행 환경(JRE)을 분리하여 이미지 크기 최소화

**작동 방식:**
```
1단계 (빌드): Maven + Java 17 컨테이너
   ├─ pom.xml 복사
   ├─ 의존성 다운로드 (캐시 최적화)
   ├─ 소스 코드 복사
   └─ mvn clean package → JAR 파일 생성

2단계 (실행): JRE만 있는 작은 컨테이너
   ├─ 빌드된 JAR 파일만 복사
   └─ java -jar app.jar 실행
   → 결과: 작고 빠른 이미지!
```

**핵심 내용:**
- `FROM maven:3.9-eclipse-temurin-17 AS build`: 빌드용 컨테이너
- `FROM eclipse-temurin:17-jre`: 실행용 컨테이너 (작고 가벼움)
- `COPY --from=build`: 빌드 단계에서 생성된 파일만 복사

**Multi-stage build의 장점:**
- 최종 이미지에 Maven이 포함되지 않아 이미지 크기 감소
- 빌드 도구는 빌드 시에만 필요하고 실행 시에는 불필요

---

### 3. `frontend/Dockerfile` - 프론트엔드 컨테이너 이미지 빌드

**위치:** `frontend/Dockerfile`

**역할:**
- React 애플리케이션을 빌드하고 웹 서버로 제공하는 컨테이너 이미지 생성
- Multi-stage build로 최적화

**왜 필요한가?**
- React 앱을 실행하려면 Node.js로 빌드하고 웹 서버로 제공해야 함
- Node.js를 로컬에 설치하지 않고, 컨테이너 안에서 빌드
- 빌드 도구(Node.js)와 실행 환경(Nginx)을 분리

**작동 방식:**
```
1단계 (빌드): Node.js 컨테이너
   ├─ package.json 복사
   ├─ npm ci (의존성 설치)
   ├─ 소스 코드 복사
   └─ npm run build → dist 폴더에 빌드된 파일 생성

2단계 (실행): Nginx 컨테이너
   ├─ 빌드된 파일(dist)만 복사
   ├─ nginx.conf 설정 복사
   └─ Nginx로 정적 파일 제공
   → 결과: 작고 빠른 이미지!
```

**핵심 내용:**
- `FROM node:20-alpine AS build`: 빌드용 컨테이너
- `FROM nginx:alpine`: 실행용 컨테이너 (Nginx로 정적 파일 제공)
- `COPY --from=build`: 빌드된 파일만 복사

**왜 Nginx를 사용하나?**
- 프로덕션 환경에서 정적 파일을 제공하는 표준 방법
- 가볍고 빠름
- API 프록시 설정 가능

---

### 4. `frontend/nginx.conf` - Nginx 설정 파일

**위치:** `frontend/nginx.conf`

**역할:**
- Nginx 웹 서버의 동작 방식 설정
- API 요청을 백엔드로 프록시

**왜 필요한가?**
- 프론트엔드 컨테이너는 Nginx로 실행됨
- `/api` 요청은 백엔드 컨테이너로 전달해야 함
- React SPA 라우팅 지원 필요

**주요 설정:**

1. **SPA 라우팅 지원:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
- React Router 등 SPA 라우팅을 위해 모든 요청을 `index.html`로 전달

2. **API 프록시:**
```nginx
location /api {
    proxy_pass http://backend:8080;
}
```
- `/api/*` 요청을 백엔드 컨테이너(`backend:8080`)로 전달
- `backend`는 docker-compose.yml에서 정의한 서비스 이름

**왜 프록시가 필요한가?**
- 프론트엔드는 `http://localhost:3000`에서 실행
- 백엔드는 `http://backend:8080`에서 실행 (컨테이너 내부)
- 브라우저에서 `/api` 요청을 백엔드로 전달하기 위해 프록시 필요

---

### 5. `.dockerignore` 파일들

**위치:** `backend/.dockerignore`, `frontend/.dockerignore`

**역할:**
- Docker 빌드 시 불필요한 파일 제외
- 빌드 속도 향상 및 이미지 크기 감소

**왜 필요한가?**
- `node_modules`, `target` 등은 빌드 시 다시 생성되므로 포함할 필요 없음
- `.git`, `.idea` 등 개발 도구 파일은 불필요
- 빌드 컨텍스트 크기 감소로 빌드 속도 향상

**백엔드 `.dockerignore`:**
```
target/        # 빌드 결과물 (컨테이너에서 다시 빌드)
.mvn/          # Maven Wrapper
*.md           # 문서 파일
.git           # Git 저장소
```

**프론트엔드 `.dockerignore`:**
```
node_modules/  # 의존성 (컨테이너에서 다시 설치)
dist/          # 빌드 결과물 (컨테이너에서 다시 빌드)
*.md           # 문서 파일
.git           # Git 저장소
```

---

## 🚀 빠른 시작

### 1. 전체 스택 실행

```bash
# 프로젝트 루트에서
docker-compose up -d
```

### 2. 접속 확인

- **프론트엔드**: http://localhost:3000
- **백엔드**: http://localhost:8080
- **PostgreSQL**: localhost:5432

### 3. 중지

```bash
# 서비스 중지 (데이터 유지)
docker-compose stop

# 서비스 중지 및 컨테이너 삭제 (데이터 유지)
docker-compose down

# 완전 삭제 (데이터까지 삭제) ⚠️ 주의!
docker-compose down -v
```

---

## 📝 주요 명령어

### 실행 및 중지

```bash
# 전체 스택 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up postgres backend

# 서비스 중지
docker-compose stop

# 서비스 중지 및 컨테이너 삭제
docker-compose down
```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
```

### 재빌드

```bash
# 변경사항 반영하여 재빌드
docker-compose up --build -d

# 특정 서비스만 재빌드
docker-compose build backend
docker-compose up backend
```

### 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 컨테이너 내부 접속
docker exec -it cycle_test-backend-1 sh
docker exec -it cycle_test-postgres-1 psql -U postgres -d cycle_db
```

---

## 🔧 환경 변수 설정

### .env 파일 사용 (권장)

프로젝트 루트에 `.env` 파일 생성:

```env
POSTGRES_PASSWORD=your_secure_password
```

`docker-compose.yml`에서 자동으로 읽어서 사용합니다.

---

## 💾 데이터베이스 접근

### DBeaver 연결

Docker Compose로 실행한 PostgreSQL에 연결:

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `cycle_db`
- **Username**: `postgres`
- **Password**: `.env` 파일에 설정한 비밀번호 (또는 기본값 `postgres`)

### psql로 접속

```bash
# 컨테이너 내부에서 접속
docker exec -it cycle_test-postgres-1 psql -U postgres -d cycle_db
```

---

## 🎯 요약

### Docker를 추가한 이유
- **환경 일관성**: 모든 개발자가 똑같은 환경 사용
- **간편한 실행**: 한 번의 명령어로 전체 스택 실행
- **격리된 환경**: 로컬 환경에 영향 없음

### 추가된 파일들의 역할
1. **docker-compose.yml**: 전체 스택을 하나로 묶어서 관리
2. **backend/Dockerfile**: 백엔드를 컨테이너 이미지로 변환
3. **frontend/Dockerfile**: 프론트엔드를 컨테이너 이미지로 변환
4. **frontend/nginx.conf**: Nginx 설정 (API 프록시, SPA 라우팅)
5. **.dockerignore**: 빌드 시 불필요한 파일 제외

### 핵심 변화
- **Before**: 여러 도구 설치 → 각각 실행 → 수동 설정
- **After**: Docker 설치 → `docker-compose up -d` → 끝!

---

## ⚡ 빠른 참조: 주요 명령어

### Docker 빌드

```bash
# 전체 스택 빌드
docker-compose build

# 특정 서비스만 빌드
docker-compose build backend
docker-compose build frontend

# 캐시 없이 완전 재빌드
docker-compose build --no-cache
```

### Docker 실행

```bash
# 전체 스택 실행 (백그라운드)
docker-compose up -d

# 빌드 후 실행
docker-compose up --build -d

# 특정 서비스만 실행
docker-compose up -d postgres backend

# 포그라운드 실행 (로그 확인)
docker-compose up
```

### Docker 중지

```bash
# 서비스 중지 (컨테이너 유지, 데이터 유지)
docker-compose stop

# 서비스 중지 및 컨테이너 삭제 (데이터 유지)
docker-compose down

# 완전 삭제 (데이터까지 삭제) ⚠️ 주의!
docker-compose down -v
```

### 기타 유용한 명령어

```bash
# 로그 확인
docker-compose logs -f
docker-compose logs -f backend

# 상태 확인
docker-compose ps

# 재시작
docker-compose restart
docker-compose restart backend
```

---

# Spring Boot 실무 필수 Annotation 정리

이 프로젝트(backend)에서 사용된 annotation들 중 실무에서 자주 사용되는 것들을 정리합니다.

---

## 1. Spring Core Annotation

### @SpringBootApplication
Spring Boot 애플리케이션의 시작점. `@Configuration`, `@EnableAutoConfiguration`, `@ComponentScan`을 합친 것.

```java
@SpringBootApplication
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

### @Configuration
설정 클래스임을 명시. `@Bean` 메서드를 포함하는 클래스에 사용.

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        // Bean 설정 로직
    }
}
```

### @Bean
메서드의 반환 객체를 Spring Bean으로 등록.

```java
@Bean
public CorsFilter corsFilter() {
    return new CorsFilter(source);
}
```

---

## 2. Controller Annotation

### @RestController
`@Controller` + `@ResponseBody`. REST API용 컨트롤러에 사용.

```java
@RestController
@RequestMapping("/api")
public class MessageController {
    // ...
}
```

### @RequestMapping
URL 경로를 클래스/메서드에 매핑.

```java
@RequestMapping("/api")  // 클래스 레벨: 기본 경로
public class MessageController { }
```

### @GetMapping / @PostMapping / @DeleteMapping / @PutMapping
HTTP 메서드별 매핑 (축약형).

```java
@GetMapping("/messages")
public ResponseEntity<List<Message>> getAllMessages() { }

@PostMapping("/messages")
public ResponseEntity<Message> createMessage(@RequestBody MessageRequest request) { }

@DeleteMapping("/messages/{id}")
public ResponseEntity<Void> deleteMessage(@PathVariable Long id) { }
```

### @PathVariable
URL 경로의 변수를 파라미터로 바인딩.

```java
@GetMapping("/messages/{id}")
public ResponseEntity<Message> getMessageById(@PathVariable Long id) { }
```

### @RequestBody
HTTP 요청 본문(JSON)을 객체로 변환.

```java
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(@RequestBody MessageRequest request) { }
```

### @CrossOrigin
CORS 허용 설정.

```java
@CrossOrigin(origins = "*")  // 모든 도메인 허용
@CrossOrigin(origins = "http://localhost:3000")  // 특정 도메인만 허용
```

---

## 3. Service / Repository Annotation

### @Service
비즈니스 로직을 담당하는 서비스 클래스에 사용.

```java
@Service
public class MessageService {
    // 비즈니스 로직
}
```

### @Repository
데이터 접근 계층(DAO)에 사용. 예외 변환 기능 포함.

```java
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> { }
```

### @Autowired
의존성 자동 주입. (필드, 생성자, setter에 사용 가능)

```java
@Autowired
private MessageService messageService;

// 권장: 생성자 주입 (테스트 용이)
private final MessageService messageService;

public MessageController(MessageService messageService) {
    this.messageService = messageService;  // @Autowired 생략 가능
}
```

### @Transactional
트랜잭션 처리. 메서드/클래스 레벨에 적용.

```java
@Service
@Transactional  // 클래스의 모든 메서드에 적용
public class MessageService {

    @Transactional(readOnly = true)  // 읽기 전용 (성능 최적화)
    public List<Message> getAllMessages() { }
}
```

---

## 4. JPA Entity Annotation

### @Entity
JPA 엔티티(테이블 매핑 객체)임을 명시.

```java
@Entity
public class Message { }
```

### @Table
테이블명 지정. 생략시 클래스명이 테이블명.

```java
@Entity
@Table(name = "messages")
public class Message { }
```

### @Id & @GeneratedValue
Primary Key 지정 및 자동 생성 전략.

```java
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)  // MySQL auto_increment
private Long id;

// 다른 전략들:
// GenerationType.AUTO - DB에 맞게 자동 선택
// GenerationType.SEQUENCE - 시퀀스 사용 (Oracle, PostgreSQL)
// GenerationType.TABLE - 별도 테이블로 관리
```

### @Column
컬럼 속성 지정.

```java
@Column(nullable = false, length = 1000)
private String content;

@Column(name = "created_at", updatable = false)
private LocalDateTime timestamp;

@Column(unique = true)
private String email;
```

### @PrePersist / @PreUpdate
엔티티 저장/수정 전 자동 실행되는 콜백.

```java
@PrePersist
protected void onCreate() {
    timestamp = LocalDateTime.now();
}

@PreUpdate
protected void onUpdate() {
    updatedAt = LocalDateTime.now();
}
```

---

## 5. Lombok Annotation

### @Data
`@Getter`, `@Setter`, `@ToString`, `@EqualsAndHashCode`, `@RequiredArgsConstructor` 통합.

```java
@Data
public class MessageRequest {
    private String content;
}
```

### @NoArgsConstructor / @AllArgsConstructor
기본 생성자 / 모든 필드 생성자 자동 생성.

```java
@NoArgsConstructor   // public Message() {}
@AllArgsConstructor  // public Message(Long id, String content, ...) {}
public class Message { }
```

### @RequiredArgsConstructor (추가 추천)
`final` 필드만 포함하는 생성자 생성. 생성자 주입에 활용.

```java
@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;  // 자동 주입
}
```

### @Builder (추가 추천)
빌더 패턴 자동 생성.

```java
@Builder
public class Message { }

// 사용:
Message msg = Message.builder()
    .content("Hello")
    .timestamp(LocalDateTime.now())
    .build();
```

---

## 6. Validation Annotation

### @Valid
컨트롤러에서 요청 객체 검증 활성화.

```java
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(@Valid @RequestBody MessageRequest request) { }
```

### @NotBlank / @NotNull / @NotEmpty
- `@NotBlank`: null, 빈 문자열, 공백만 있는 문자열 불가
- `@NotNull`: null만 불가
- `@NotEmpty`: null, 빈 문자열 불가

```java
@NotBlank(message = "메시지 내용은 필수입니다")
private String content;

@NotNull(message = "ID는 필수입니다")
private Long userId;
```

### 기타 유용한 Validation (추가 추천)

```java
@Email(message = "유효한 이메일 형식이 아닙니다")
private String email;

@Size(min = 2, max = 50, message = "이름은 2~50자 사이여야 합니다")
private String name;

@Min(value = 0, message = "나이는 0 이상이어야 합니다")
@Max(value = 150, message = "나이는 150 이하여야 합니다")
private Integer age;

@Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "올바른 전화번호 형식이 아닙니다")
private String phone;
```

---

## 실무 팁

1. **생성자 주입 권장**: `@Autowired` 필드 주입보다 `@RequiredArgsConstructor` + `final` 필드 조합 권장
2. **읽기 전용 트랜잭션**: 조회 메서드는 `@Transactional(readOnly = true)` 사용
3. **Entity에 @Data 주의**: 순환 참조 문제로 `@Getter`, `@Setter` 개별 사용 권장
4. **Validation 메시지**: 사용자 친화적인 에러 메시지 작성
