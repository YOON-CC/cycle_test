# 풀스택 연습 프로젝트

프론트엔드 개발자가 백엔드와의 API 통신을 연습하기 위한 간단한 프로젝트입니다.

## 프로젝트 목적

- **프론트엔드-백엔드 통신**: RESTful API를 통한 데이터 주고받기 연습
- **상태 관리**: React Hooks를 통한 상태 관리 연습
- **백엔드 개발**: Spring Boot를 통한 REST API 구현 연습

## 기술 스택

### 프론트엔드
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **Axios** - HTTP 클라이언트

### 백엔드
- **Spring Boot 3.2.0** - Java 웹 프레임워크
- **Java** - 프로그래밍 언어
- **Maven** - 빌드 도구 (Maven Wrapper 사용)
- **Lombok** - 보일러플레이트 코드 제거

## 프로젝트 구조

```
cycle_test/
├── frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── api/          # API 클라이언트
│   │   ├── App.tsx       # 메인 컴포넌트
│   │   └── main.tsx       # 진입점
│   └── package.json
├── backend/               # Spring Boot 백엔드
│   ├── src/main/java/com/cycle/backend/
│   │   ├── controller/   # REST 컨트롤러
│   │   ├── service/      # 비즈니스 로직
│   │   └── model/        # 데이터 모델
│   ├── mvnw              # Maven Wrapper (권장)
│   └── pom.xml
```

### 백엔드 구조 상세 설명

#### `controller/` - REST 컨트롤러
**역할**: HTTP 요청을 받아서 처리하고 응답을 반환하는 계층
- **`MessageController.java`**: 클라이언트의 HTTP 요청을 받아 처리
  - `@RestController`: REST API 컨트롤러임을 선언
  - `@RequestMapping("/api")`: 모든 엔드포인트의 기본 경로
  - `@PostMapping`, `@GetMapping`: HTTP 메서드 매핑
  - 요청을 받아 Service 계층에 전달하고, 결과를 HTTP 응답으로 변환

**예시:**
```java
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(@RequestBody MessageRequest request) {
    // Service에서 메시지 생성 후 HTTP 응답 반환
}
```

#### `service/` - 비즈니스 로직
**역할**: 실제 비즈니스 로직을 처리하는 계층
- **`MessageService.java`**: 메시지 생성, 조회 등의 비즈니스 로직 처리
  - `@Service`: Spring이 관리하는 서비스 빈으로 등록
  - 현재는 메모리에 저장 (서버 재시작 시 초기화)
  - Controller는 Service를 호출하여 비즈니스 로직 실행

**예시:**
```java
@Service
public class MessageService {
    public Message createMessage(String content) {
        // 메시지 생성 로직
    }
}
```

#### `model/` - 데이터 모델
**역할**: 데이터 구조를 정의하는 계층
- **`Message.java`**: 메시지 데이터 구조 정의
  - `@Data`: Lombok이 getter/setter 자동 생성
  - `@NoArgsConstructor`, `@AllArgsConstructor`: 생성자 자동 생성
  - API 요청/응답에 사용되는 데이터 구조

- **`MessageRequest.java`**: API 요청 데이터 구조
  - `@NotBlank`: 유효성 검증 어노테이션
  - 클라이언트가 보내는 요청 데이터 형식 정의

**예시:**
```java
@Data
public class Message {
    private Long id;
    private String content;
    private LocalDateTime timestamp;
}
```

#### `mvnw` - Maven Wrapper
**역할**: Maven을 별도로 설치하지 않고도 빌드/실행 가능
- Maven Wrapper 스크립트
- 프로젝트에 포함된 Maven 버전 사용
- `./mvnw spring-boot:run` 명령어로 실행

#### `pom.xml` - Maven 설정 파일
**역할**: 프로젝트 의존성 및 빌드 설정
- Spring Boot, Lombok 등 라이브러리 의존성 정의
- 빌드 플러그인 설정
- Java 버전 등 프로젝트 메타데이터

#### `config/` - 설정 클래스
**역할**: Spring Boot 애플리케이션 설정
- **`CorsConfig.java`**: CORS(Cross-Origin Resource Sharing) 설정
  - 프론트엔드와 백엔드가 다른 포트에서 실행될 때 필요
  - 브라우저의 보안 정책을 우회하여 통신 허용
└── README.md
```

## 시작하기

### 사전 요구사항

- **Node.js** (v18 이상)
- **Java 17** 이상
- **Maven** (선택사항 - Maven Wrapper 사용 시 불필요)


### 1. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 http://localhost:3000 에서 실행됩니다.

### 2. 백엔드 실행

**Maven Wrapper 사용 (권장)**

Maven Wrapper를 사용하면 Maven을 별도로 설치할 필요가 없습니다.

```bash
cd backend

# Maven Wrapper 설정 (처음 한 번만)
./setup-maven-wrapper.sh

# 백엔드 실행
./mvnw spring-boot:run
```

**Maven이 설치된 경우**

```bash
cd backend
mvn spring-boot:run
```

백엔드는 http://localhost:8080 에서 실행됩니다.

### 3. 테스트

1. 프론트엔드와 백엔드가 모두 실행된 상태에서
2. 프론트엔드에서 메시지를 입력하고 전송 버튼 클릭
3. 메시지가 목록에 표시되는지 확인

## API 엔드포인트

### POST /api/messages
메시지 생성

**Request:**
```json
{
  "content": "안녕하세요!"
}
```

**Response:**
```json
{
  "id": 1,
  "content": "안녕하세요!",
  "timestamp": "2024-01-01T12:00:00"
}
```

### GET /api/messages
모든 메시지 조회

**Response:**
```json
[
  {
    "id": 1,
    "content": "안녕하세요!",
    "timestamp": "2024-01-01T12:00:00"
  }
]
```

### GET /api/messages/{id}
특정 메시지 조회

### GET /api/health
헬스 체크

**Response:**
```
Backend is running!
```

## 주요 기능

1. **RESTful API**: Spring Boot를 통한 REST API 구현
2. **상태 관리**: React Hooks (useState, useEffect)를 통한 상태 관리
3. **비동기 통신**: Axios를 통한 HTTP 요청/응답 처리
4. **CORS 설정**: 프론트엔드-백엔드 통신을 위한 CORS 설정
5. **서버 상태 모니터링**: 실시간 백엔드 연결 상태 확인

## 개발 팁

### 프론트엔드
- API 호출은 `src/api/client.ts`에 정의되어 있습니다
- 상태 관리는 React Hooks를 사용합니다
- Tailwind CSS로 스타일링합니다

### 백엔드
- RESTful API를 통한 CRUD 작업
- 메모리 기반 메시지 저장 (서버 재시작 시 초기화)
- CORS 설정으로 프론트엔드와 통신
- Maven Wrapper를 사용하여 Maven 설치 없이 빌드 가능

### Maven Wrapper 사용 이유
- Maven을 별도로 설치할 필요 없음
- 프로젝트마다 다른 Maven 버전 사용 가능
- 팀원 간 동일한 빌드 환경 보장

## 문제 해결

### Maven Wrapper 권한 오류
```bash
chmod +x backend/mvnw
chmod +x backend/setup-maven-wrapper.sh
```

### 백엔드 연결 안됨
- 백엔드가 실행 중인지 확인: http://localhost:8080/api/health
- 프론트엔드의 서버 상태 표시기를 확인 (초록색 = 연결됨, 빨간색 = 연결 안됨)
- CORS 오류가 발생하면 백엔드의 `CorsConfig.java` 확인

### Java 버전 확인
```bash
java -version  # Java 17 이상 필요
```

**Java가 설치되어 있지 않은 경우:**
위의 "사전 요구사항 > Java 설치 방법" 섹션을 참고하세요.

## 빌드

### 프론트엔드
```bash
cd frontend
npm run build
```

### 백엔드
```bash
cd backend
./mvnw clean package
# 또는
mvn clean package
```

빌드된 JAR 파일은 `backend/target/` 디렉토리에 생성됩니다.

## 프로젝트 확장 방법

현재 프로젝트는 메모리 기반으로 동작합니다. 다음 단계로 확장할 수 있습니다:

### 1. 데이터베이스 연동 (다음 단계로 추천!)

**목적**: 메시지를 영구 저장하여 서버 재시작 후에도 데이터 유지

**추가할 것들:**
- `repository/` 디렉토리 생성 - 데이터베이스 접근 계층
- JPA (Java Persistence API) 의존성 추가
- 데이터베이스 설정 (`application.properties`)

**예시 구조:**
```
backend/
├── src/main/java/com/cycle/backend/
│   ├── repository/        # 새로 추가
│   │   └── MessageRepository.java
│   ├── controller/
│   ├── service/
│   └── model/
```

**필요한 의존성 (`pom.xml`에 추가):**
```xml
<!-- JPA (Hibernate) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- 데이터베이스 드라이버 (예: H2, PostgreSQL, MySQL) -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

**확장 예시:**
1. `Message` 클래스에 `@Entity` 추가
2. `MessageRepository` 인터페이스 생성 (JpaRepository 상속)
3. `MessageService`에서 Repository 사용하도록 변경

### 2. 인증/인가 추가

**목적**: 사용자 인증 및 권한 관리

**추가할 것들:**
- `security/` 디렉토리 - Spring Security 설정
- `User` 모델 및 관련 Service, Controller
- JWT 토큰 기반 인증

**필요한 의존성:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.12.3</version>
</dependency>
```

### 3. 실시간 통신 (WebSocket)

**목적**: 서버에서 클라이언트로 실시간 메시지 푸시

**추가할 것들:**
- `websocket/` 디렉토리 - WebSocket 설정 및 핸들러
- 프론트엔드에서 WebSocket 클라이언트 추가

**필요한 의존성:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

### 4. 에러 처리 개선

**목적**: 일관된 에러 응답 및 사용자 친화적 메시지

**추가할 것들:**
- `exception/` 디렉토리 - 커스텀 예외 클래스
- `@ControllerAdvice`를 사용한 전역 예외 처리

**예시 구조:**
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        // 에러 응답 처리
    }
}
```

### 5. 테스트 작성

**목적**: 코드 품질 보장 및 리팩토링 안정성

**추가할 것들:**
- `src/test/java/` 디렉토리에 테스트 클래스
- 단위 테스트 (Service, Controller)
- 통합 테스트 (API 엔드포인트)

**예시:**
```java
@SpringBootTest
@AutoConfigureMockMvc
class MessageControllerTest {
    @Test
    void testCreateMessage() {
        // 테스트 코드
    }
}
```

### 6. 로깅 및 모니터링

**목적**: 애플리케이션 상태 모니터링

**추가할 것들:**
- `application.properties`에 로깅 레벨 설정
- Actuator 의존성 추가 (헬스 체크, 메트릭 등)

**필요한 의존성:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### 확장 우선순위 추천

1. **데이터베이스 연동** (가장 먼저!)
   - 메시지가 영구 저장되도록
   - H2 (인메모리 DB)로 시작 → PostgreSQL/MySQL로 전환

2. **에러 처리 개선**
   - 일관된 에러 응답 형식
   - 사용자 친화적 에러 메시지

3. **테스트 작성**
   - 코드 신뢰성 향상
   - 리팩토링 시 안정성 보장

4. **인증/인가**
   - 사용자별 메시지 관리
   - 보안 강화

5. **실시간 통신**
   - WebSocket으로 실시간 기능 추가

## 라이선스

이 프로젝트는 학습 목적으로 만들어졌습니다.
