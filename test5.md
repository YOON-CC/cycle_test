# Test 5: 스프링부트 실행순서 - 내 backend 코드 기준

## 앞에서 배운 것 복습

```
스프링이 해주는 일:
1. 객체를 대신 만들어주고     (빈 생성)
2. 연결해주고               (의존 관계 주입)
3. 준비시키고               (초기화)
4. 쓰다가                  (사용)
5. 정리해주는               (소멸)
```

이걸 지금 내 backend 코드에 대입해보자.

---

## STEP 1: 스프링 컨테이너 생성

```java
SpringApplication.run(BackendApplication.class, args);
```

이 한 줄이 실행되면:

```
"com.cycle.backend 패키지 아래 전부 스캔해!"
    ↓
스캔 결과: "이 클래스들 내가 관리할게!"

@Component      → JwtUtils, JwtAuthenticationFilter, DataLoader
@Service        → AuthService, MessageService, UserDetailsServiceImpl
@Repository     → UserRepository, MessageRepository
@RestController → AuthController, MessageController
@Configuration  → SecurityConfig, CorsConfig
```

---

## STEP 2: 빈 생성 + 의존 주입 (만들고 연결하기)

앞에서 배운 것 그대로다.

```
앞에서 배운 패턴:

@Service
public class MemberService {
    private final MemberRepository repository;
    public MemberService(MemberRepository repository) {  ← 스프링이 넣어줌
        this.repository = repository;
    }
}
```

내 코드도 똑같다:

```
스프링이 하는 일 (의존성 없는 것부터 순서대로):

new JwtUtils()                        ← 아무것도 안 받음, 먼저 만듦
new UserRepository()                  ← 스프링 Data JPA가 자동 생성
new MessageRepository()

new UserDetailsServiceImpl(userRepository)       ← userRepository 넣어줌
new MessageService(messageRepository)            ← messageRepository 넣어줌

new JwtAuthenticationFilter(jwtUtils, userDetailsServiceImpl)  ← 두 개 넣어줌
new AuthService(authManager, jwtUtils, userRepository)

new AuthController(authService, userRepository)
new MessageController(messageService, userRepository)
new DataLoader(userRepository, passwordEncoder)
```

여기까지는 앞에서 배운 것과 **완전히 똑같은 패턴**이다.
`@Service` 붙은 클래스를 스프링이 `new` 해주고, 생성자에 필요한 걸 넣어주는 것.

---

## 잠깐! "순서"가 2개 있다

여기서 헷갈리는 게 있다.
Controller, Service, JwtFilter 등 빈이 많은데 **왜 JWT가 먼저 실행되냐?**

이걸 이해하려면, "순서"가 **2종류**라는 걸 알아야 한다:

```
순서 1: 빈 만드는 순서 (서버 시작할 때, 한 번만)
순서 2: 요청 처리하는 순서 (요청 올 때마다, 매번)

이 둘은 완전히 다른 이야기!
```

### 순서 1: 빈 만드는 순서 = "누가 누굴 필요로 하느냐"로 결정

```
빈을 만드는 순서는 스프링이 알아서 정한다.
기준은 단 하나: "의존성"

B가 A를 필요로 하면 → A를 먼저 만듦

예시:
JwtAuthenticationFilter는 JwtUtils가 필요하다
→ JwtUtils를 먼저 만듦

AuthController는 AuthService가 필요하다
→ AuthService를 먼저 만듦

AuthService는 JwtUtils가 필요하다
→ JwtUtils를 먼저 만듦
```

그래서 위에서 본 생성 순서가 이런 식인 거다:

```
1) JwtUtils               ← 아무도 안 필요함 → 먼저!
2) UserRepository          ← 아무도 안 필요함 → 먼저!
3) UserDetailsServiceImpl  ← UserRepository 필요 → 2번 다음
4) JwtAuthenticationFilter ← 1번, 3번 필요 → 그 다음
5) AuthService             ← 1번, 2번 필요 → 그 다음
6) AuthController          ← 5번 필요 → 그 다음
...
```

**이건 "실행 순서"가 아니라 "만드는 순서"다.**
전부 서버 시작할 때 한 번만 일어남. 만들기만 하고 끝.

### 순서 2: 요청 처리 순서 = "구조가 원래 그렇게 생겼다"

**이게 진짜 핵심!**

요청이 들어오면 왜 JwtFilter가 Controller보다 먼저 실행되냐?
→ **Filter와 Controller는 애초에 역할이 다르기 때문.**

```
비유: 건물 구조

건물 입구 ──→ 경비실 ──→ 복도 ──→ 사무실
              (Filter)           (Controller)

손님이 사무실에 가려면 반드시 경비실을 먼저 지나가야 함.
이건 "경비원이 먼저 출근해서"가 아니라,
건물 구조가 "경비실 → 사무실" 순서로 되어있기 때문.
```

코드로 보면:

```
Filter = 문 앞에서 검사하는 역할    → 요청이 Controller에 닿기 전에 실행
Controller = 실제 업무를 하는 역할   → Filter를 통과한 요청만 받음

이 구조는 스프링이 정한 거다.
우리가 정한 게 아님!
```

```
요청 처리 순서 (매번 이 순서로 실행):

요청 → Filter(경비) → Controller(접수) → Service(처리) → Repository(DB)
       ~~~~~~~~       ~~~~~~~~~~~~~~     ~~~~~~~~~~~~    ~~~~~~~~~~~~~~
       1번째            2번째              3번째            4번째

이 순서는 빈을 만든 순서랑 관계없다!
건물 구조에 의해 정해진 것.
```

### 그래서 JWT가 Controller보다 먼저 실행되는 이유?

```
JwtAuthenticationFilter는 "Filter"이고
AuthController는 "Controller"이기 때문.

Filter는 항상 Controller보다 먼저 실행된다.
이건 스프링 웹의 기본 구조다.

JwtAuthenticationFilter가 먼저 만들어져서 먼저 실행되는 게 아니라,
Filter라는 역할 자체가 Controller보다 앞에 있는 것.
```

```
정리:

빈 만드는 순서 → 의존성으로 결정 (누가 누굴 필요로 하냐)
요청 처리 순서 → 구조로 결정 (Filter → Controller → Service → Repository)

이 둘은 별개의 이야기!
```

---

## 여기서 새로운 개념: @Bean

위에서 스프링이 빈을 만드는 방법은 `@Component`, `@Service` 같은 어노테이션이었다.
근데 **하나 더** 있다.

### @Bean이 뭐냐?

```
@Component / @Service = "이 클래스를 빈으로 만들어줘"
@Bean                 = "이 메서드의 리턴값을 빈으로 만들어줘"
```

왜 두 가지가 있냐?

```
내가 만든 클래스:
    → 클래스 위에 @Service 붙이면 됨
    → 예: @Service public class AuthService {}

남이 만든 클래스 (라이브러리):
    → 내가 그 클래스 파일을 수정할 수 없음
    → @Service를 붙일 수가 없음!
    → 그래서 @Bean 메서드로 감싸서 등록함
```

### 예시로 보면

`BCryptPasswordEncoder`는 스프링 라이브러리가 만든 클래스다.
내가 이 클래스 파일을 열어서 `@Component` 붙일 수 없다.

그래서 이렇게 한다:

```java
@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();   // ← 내가 직접 new 해서 리턴
    }
}
```

스프링이 이 메서드를 보고:
```
"아, @Bean이 붙어있네?"
"이 메서드를 실행해볼게"
"리턴값이 BCryptPasswordEncoder 객체네?"
"OK, 이걸 빈으로 등록할게!"
```

**핵심: @Bean 메서드 실행 = 그 리턴값이 빈으로 등록됨**

---

## STEP 3: SecurityFilterChain은 어떻게 만들어지나?

이제 핵심 질문.

SecurityFilterChain도 **@Bean 메서드로 만들어진다**.

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) {
    // ... 설정 ...
    return http.build();   // ← 이 리턴값이 SecurityFilterChain 객체
}
```

이것도 위의 `passwordEncoder()`와 **완전히 같은 원리**다:

```
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();        // 리턴값 = PasswordEncoder 빈
}

@Bean
public SecurityFilterChain filterChain(...) {
    return http.build();                       // 리턴값 = SecurityFilterChain 빈
}

둘 다 같은 패턴:
"@Bean 메서드 실행 → 리턴값을 빈으로 등록"
```

### 그래서 "메서드 실행하는데 왜 SecurityFilterChain을 먼저 만드나?"

**메서드를 실행하는 게 곧 SecurityFilterChain을 만드는 거다.**
이건 두 개의 별개 과정이 아니라 **하나의 과정**이다.

```
filterChain() 메서드 실행
    = 메서드 안에서 http.build() 호출
    = SecurityFilterChain 객체가 리턴됨
    = 스프링이 그 객체를 빈으로 등록

즉: 메서드 실행 = 객체 만들기
    이 둘은 같은 거!
```

비유하면:

```
@Bean
public 빵 빵만들기() {
    밀가루 반죽하고
    오븐에 넣고
    return 완성된빵;
}

"빵만들기 메서드를 실행한다" = "빵을 만든다"
이 둘은 같은 말!
```

### filterChain() 메서드 안에서 하는 일

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) {

    // 1. "이 URL은 아무나 접근 가능"
    //    "/api/auth/login", "/api/health" → 토큰 없어도 OK

    // 2. "이 URL은 로그인한 사람만"
    //    "/api/messages" → 토큰 필수

    // 3. "JWT 필터를 끼워넣어"
    //    모든 요청이 JwtAuthenticationFilter를 먼저 거치게 함

    return http.build();   // ← 위 설정이 담긴 필터 체인 완성!
}
```

쉽게 말하면:
```
filterChain() = "보안 규칙표 만들기"

규칙표 내용:
┌────────────────────┬───────────┐
│ URL                │ 규칙      │
├────────────────────┼───────────┤
│ /api/auth/login    │ 누구나 OK │
│ /api/health        │ 누구나 OK │
│ /api/messages      │ 토큰 필수 │
│ 그 외 전부          │ 토큰 필수 │
└────────────────────┴───────────┘

+ 추가 규칙: 모든 요청은 JwtAuthenticationFilter를 먼저 거칠 것!
```

---

## STEP 4: 초기화 (마무리 준비)

빈 다 만들고, 연결 다 했으면:

### 4-1. 설정값 주입

```
application.properties 파일:
jwt.secret=your-very-long-secret-key...
jwt.expiration=86400000

    ↓ 스프링이 읽어서

JwtUtils 안에 넣어줌:
jwtSecret = "your-very-long-secret-key..."
jwtExpiration = 86400000 (24시간)
```

### 4-2. DataLoader 실행 (testuser 만들기)

```
DataLoader는 CommandLineRunner를 구현함
= "모든 준비 끝나면 이 run() 메서드를 실행해줘"

run() 실행:
    "testuser가 DB에 없으면 만들어!"
    → testuser / password123 계정 생성
```

### 서버 시작 완료!

```
★★★ 8080 포트에서 요청 대기 중! ★★★
```

---

## STEP 5: 사용 (요청 처리)

이제 서버가 준비 완료. 요청이 들어오면 어떻게 되나?

### 모든 요청의 공통 흐름

```
어떤 요청이든 이 순서로 진행됨:

요청 도착
    ↓
① CorsFilter          → "다른 도메인에서 온 거? OK 통과"
    ↓
② JwtAuthenticationFilter → "토큰 있어? 있으면 검증하고, 없으면 그냥 넘김"
    ↓
③ AuthorizationFilter  → "이 URL은 로그인 필요한 곳이야? 규칙표 확인!"
    ↓
④ Controller           → 실제 비즈니스 로직
    ↓
⑤ Service → Repository → DB
    ↓
응답 반환
```

### 시나리오 1: 로그인 (POST /api/auth/login)

```
클라이언트: { username: "testuser", password: "password123" }
    ↓
① CorsFilter → 통과
    ↓
② JwtAuthenticationFilter
    → "Authorization 헤더 있나?" → 없음 (로그인이니까 당연)
    → 아무것도 안 하고 넘김
    ↓
③ AuthorizationFilter
    → "/api/auth/login"은 규칙표에서 "누구나 OK"
    → 통과!
    ↓
④ AuthController → AuthService
    → DB에서 testuser 조회
    → 비밀번호 맞는지 확인 (BCrypt)
    → 맞으면 JWT 토큰 생성!
    ↓
응답: { accessToken: "eyJhbGci...", username: "testuser" }

★ 클라이언트는 이 토큰을 저장해둠
```

### 시나리오 2: 메시지 조회 (GET /api/messages) - 토큰 있음

```
클라이언트: Authorization: Bearer eyJhbGci...
    ↓
① CorsFilter → 통과
    ↓
② JwtAuthenticationFilter  ← ★ 여기가 핵심!
    → "Authorization 헤더 있나?" → 있음! "Bearer eyJhbGci..."
    → "Bearer " 제거 → "eyJhbGci..." 추출
    → "토큰이 유효한가?" → 서명 확인 OK, 만료 안 됨 OK
    → "토큰 주인이 누구?" → "testuser"
    → DB에서 testuser 조회
    → SecurityContext에 저장: "이 요청은 testuser가 보낸 거야!"
    ↓
③ AuthorizationFilter
    → "/api/messages"는 규칙표에서 "토큰 필수"
    → SecurityContext 확인 → "testuser가 인증됨!" → 통과!
    ↓
④ MessageController → MessageService → MessageRepository
    → DB에서 메시지 목록 조회
    ↓
응답: [{ id: 1, content: "안녕", author: "testuser" }]
```

### 시나리오 3: 메시지 조회 - 토큰 없음

```
클라이언트: (Authorization 헤더 없음)
    ↓
① CorsFilter → 통과
    ↓
② JwtAuthenticationFilter
    → "Authorization 헤더 있나?" → 없음
    → 아무것도 안 함 (SecurityContext 비어있음)
    ↓
③ AuthorizationFilter
    → "/api/messages"는 규칙표에서 "토큰 필수"
    → SecurityContext 확인 → 비어있음!
    → 차단! ❌
    ↓
403 Forbidden (접근 거부)
```

---

## 전체 정리: 앞에서 배운 5단계에 대입

```
1. 컨테이너 생성 (스캔)
   → "com.cycle.backend 패키지에서 관리할 클래스 찾기"

2. 빈 생성 (new)
   → new JwtUtils()
   → new AuthService(...)
   → new MessageController(...)
   → 등등 전부 new 해줌

3. 의존 주입 (연결)
   → JwtAuthenticationFilter에 JwtUtils 넣어줌
   → AuthService에 JwtUtils 넣어줌
   → AuthController에 AuthService 넣어줌

4. 초기화 (준비)
   → @Bean 메서드 실행해서 SecurityFilterChain 만듦 (= 보안 규칙표)
   → @Bean 메서드 실행해서 PasswordEncoder 만듦
   → application.properties 값 주입
   → DataLoader.run() → testuser 계정 생성
   → ★ 서버 시작 완료!

5. 사용 (요청 처리)
   → 요청마다: 필터 체인 → Controller → Service → Repository → DB

6. 정리 (서버 종료)
   → DB 연결 닫기, 빈 소멸
```

---

## 핵심 질문 정리

### Q1: JWT 로직은 어디에 속해?

```
두 군데에 걸쳐있다:

[서버 시작할 때 - 한 번만]
    JwtUtils, JwtAuthenticationFilter가 빈으로 만들어짐
    SecurityFilterChain에 JwtAuthenticationFilter가 등록됨

[요청 올 때마다 - 매번]
    로그인 → JwtUtils가 토큰 발급
    API 호출 → JwtAuthenticationFilter가 토큰 검증
```

### Q2: 필터 체인은 어디서 선언?

```
SecurityConfig.java 안의 filterChain() 메서드!

@Bean 메서드라서 스프링이 자동으로 실행해줌
→ 실행 결과 = SecurityFilterChain 객체
→ 이 객체가 "보안 규칙표" 역할

이 규칙표에:
- 어떤 URL이 공개인지
- 어떤 URL이 토큰 필수인지
- 어떤 필터를 거치는지
가 다 담겨있음
```

### Q3: @Bean 메서드 실행 = SecurityFilterChain 만들기?

```
맞다. 이건 두 단계가 아니라 한 단계다.

@Bean 메서드의 역할:
"이 메서드를 실행하면 → 객체가 리턴됨 → 그게 빈이 됨"

filterChain() 메서드를 실행하면
→ SecurityFilterChain 객체가 리턴됨
→ 그게 빈으로 등록됨

passwordEncoder() 메서드를 실행하면
→ BCryptPasswordEncoder 객체가 리턴됨
→ 그게 빈으로 등록됨

전부 같은 원리!
```

---

## 비유로 총정리

```
=== 가게 오픈 준비 (서버 시작) ===

사장(스프링)이 가게를 차림
    ↓
"필요한 직원 목록 작성" → 스캔
    ↓
직원 채용 + 배치 → 빈 생성 + 의존 주입
    - 경비원(JwtAuthenticationFilter) 채용
    - 경비원에게 출입증 검사기(JwtUtils) 지급
    - 접수원(AuthController) 채용
    - 접수원에게 업무 매뉴얼(AuthService) 지급
    ↓
출입 규칙표 게시 → SecurityFilterChain (@Bean 메서드로 만듦)
    - "로비는 누구나 OK"
    - "사무실은 출입증 필수"
    ↓
테스트 고객 등록 → DataLoader → testuser 만들기
    ↓
★ 가게 오픈! ★


=== 영업 중 (요청 처리) ===

손님 방문
    ↓
경비원(JwtAuthenticationFilter)이 출입증(JWT) 확인
    ↓
출입 규칙표(SecurityFilterChain) 확인 → 들어갈 수 있는 곳인지 체크
    ↓
담당 직원(Controller)이 업무 처리
    ↓
결과 전달
```
