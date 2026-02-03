# Test 4: 백엔드 JWT 구현 구조

## 🎯 초보자를 위한 쉬운 설명

### JWT 인증을 건물 출입 시스템으로 비유하면

```
건물 (백엔드 서버)
├─ 1층 로비: 로그인 데스크 (/api/auth/login) ← 누구나 접근 가능
│  └─ 신분증 확인 후 출입증(JWT) 발급
│
├─ 2층 사무실: 메시지 API (/api/messages) ← 출입증 필요
│  └─ 경비원(Filter)이 출입증 확인
│
└─ 경비원(JwtAuthenticationFilter)
   └─ 모든 층 입구에서 출입증 검사
```

**JWT는 건물 출입증과 같습니다:**
1. 로그인 = 1층에서 신분증 보여주고 출입증 받기
2. JWT 토큰 = 출입증
3. API 호출 = 2층 사무실 가기 (출입증 보여줘야 함)
4. 필터 = 경비원 (출입증이 진짜인지, 만료 안 됐는지 확인)

---

## 📱 실제 API 호출 시 JWT 검증 과정 (MessageController 예시)

### 예시: 메시지 목록 조회 API

**API**: `GET /api/messages`

#### Step 1: 클라이언트 요청
```javascript
// 프론트엔드 (React)
GET http://localhost:8080/api/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTcwNjk2MDAwMCwiZXhwIjoxNzA3MDQ2NDAwfQ.abc123...
```

#### Step 2: 요청이 서버에 도착 → 필터 체인 시작

```
요청 도착!
    │
    ├─────> 1️⃣ CorsFilter (CORS 체크)
    │           └─ "다른 도메인에서 온 요청이네? CORS 설정 확인... OK!"
    │
    ├─────> 2️⃣ JwtAuthenticationFilter (토큰 검증) ⭐ 핵심!
    │           │
    │           ├─ "Authorization 헤더 있나?"
    │           │   └─ "Bearer eyJhbGci..." 발견!
    │           │
    │           ├─ "Bearer " 제거
    │           │   └─ "eyJhbGci..." 추출
    │           │
    │           ├─ JwtUtils.validateToken("eyJhbGci...")
    │           │   ├─ 만료 시간: 2026-02-04 12:00 > 지금 시간 ✓
    │           │   ├─ 서명 확인: secretKey로 복호화... 성공 ✓
    │           │   └─ 결과: true (유효함!)
    │           │
    │           ├─ JwtUtils.getUsernameFromToken("eyJhbGci...")
    │           │   └─ "testuser" 추출
    │           │
    │           ├─ UserDetailsService.loadUserByUsername("testuser")
    │           │   └─ DB 쿼리: SELECT * FROM users WHERE username='testuser'
    │           │       └─ User { id: 1, username: "testuser", role: USER }
    │           │
    │           └─ SecurityContextHolder에 저장
    │               └─ "이 요청은 testuser가 보낸 거야!" 기록
    │
    ├─────> 3️⃣ AuthorizationFilter (권한 확인)
    │           │
    │           ├─ SecurityContext 확인
    │           │   └─ "testuser가 인증됨!" (앞 단계에서 저장됨)
    │           │
    │           ├─ SecurityConfig 확인
    │           │   └─ /api/messages는 .authenticated() 필요
    │           │
    │           └─ 인증됨? YES! → 통과 ✓
    │
    └─────> 4️⃣ MessageController.getAllMessages() 실행
                └─ "인증 통과했네! 메시지 목록 반환하자"
```

#### Step 3: MessageController 실행

```java
@GetMapping("/messages")
public ResponseEntity<List<Message>> getAllMessages() {
    // 여기 도착하기 전에 이미 JWT 검증 완료!
    // SecurityContext에 "testuser" 인증 정보 저장되어 있음

    List<Message> messages = messageService.getAllMessages();
    return ResponseEntity.ok(messages);
}
```

**중요 포인트**:
- Controller 메서드는 JWT 검증 코드가 **없습니다**!
- 왜? 이미 **필터에서 다 검증했기 때문**!
- Controller는 그냥 비즈니스 로직만 처리하면 됨

#### Step 4: 응답 반환

```json
[
  {
    "id": 1,
    "content": "안녕하세요",
    "timestamp": "2026-02-03T12:00:00",
    "author": {
      "id": 1,
      "username": "testuser",
      "role": "USER"
    }
  }
]
```

---

### 예시 2: 메시지 생성 API (현재 사용자 정보 필요)

**API**: `POST /api/messages`

```java
@PostMapping("/messages")
public ResponseEntity<Message> createMessage(
        @Valid @RequestBody MessageRequest request,
        @AuthenticationPrincipal UserDetailsImpl userDetails) {  // ← 현재 로그인한 사용자

    // userDetails는 어디서 온 거죠?
    // → JwtAuthenticationFilter가 SecurityContext에 저장한 거!

    User author = userRepository.findById(userDetails.getId())
            .orElseThrow(() -> new RuntimeException("User not found"));

    Message message = messageService.createMessage(request.getContent(), author);
    return ResponseEntity.status(HttpStatus.CREATED).body(message);
}
```

**@AuthenticationPrincipal의 마법**:
1. `JwtAuthenticationFilter`가 토큰에서 "testuser" 추출
2. DB에서 User 조회 → UserDetailsImpl로 변환
3. SecurityContext에 저장
4. Controller에서 `@AuthenticationPrincipal`로 꺼내 쓰기!

**흐름**:
```
JWT 토큰 "eyJhbGci..."
    ↓ (JwtAuthenticationFilter)
username "testuser" 추출
    ↓
DB에서 User 조회
    ↓
UserDetailsImpl로 변환
    ↓
SecurityContext에 저장
    ↓
@AuthenticationPrincipal UserDetailsImpl userDetails
    ↓
Controller에서 바로 사용!
```

---

## 🚫 토큰 없으면 어떻게 되나요?

### 케이스 1: Authorization 헤더 없음

```javascript
// 토큰 없이 요청
GET http://localhost:8080/api/messages
(Authorization 헤더 없음)
```

**처리 과정**:
```
요청 도착
    ↓
JwtAuthenticationFilter
    ├─ "Authorization 헤더 있나?"
    │   └─ 없음!
    ├─ SecurityContext에 인증 정보 없음
    └─ 그냥 다음 필터로 넘김
    ↓
AuthorizationFilter
    ├─ SecurityContext 확인
    │   └─ 인증 정보 없음!
    ├─ /api/messages는 .authenticated() 필요
    └─ 차단! ❌
    ↓
403 Forbidden 에러 반환
```

### 케이스 2: 토큰 만료됨

```javascript
// 만료된 토큰으로 요청
GET http://localhost:8080/api/messages
Authorization: Bearer eyJhbGci...(만료됨)
```

**처리 과정**:
```
요청 도착
    ↓
JwtAuthenticationFilter
    ├─ 토큰 추출: "eyJhbGci..."
    ├─ JwtUtils.validateToken()
    │   ├─ 만료 시간 확인: 2026-02-03 12:00 < 지금 시간
    │   └─ ExpiredJwtException 발생!
    ├─ 결과: false (만료됨)
    └─ SecurityContext에 인증 정보 없음
    ↓
AuthorizationFilter
    └─ 차단! ❌
    ↓
403 Forbidden 에러 반환
```

---

## 🔐 SecurityConfig가 권한을 결정하는 방법

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**", "/api/health").permitAll()     // 1️⃣
                    .requestMatchers("/api/messages/**").authenticated()            // 2️⃣
                    .anyRequest().authenticated())                                  // 3️⃣
            .addFilterBefore(jwtAuthenticationFilter, ...);  // 4️⃣ JWT 필터 추가

    return http.build();
}
```

**설정 해석**:

| URL | 규칙 | 의미 |
|-----|------|------|
| `/api/auth/login` | `.permitAll()` | 토큰 없어도 접근 가능 (로그인하려면 토큰이 없으니까!) |
| `/api/health` | `.permitAll()` | 토큰 없어도 접근 가능 (헬스체크) |
| `/api/messages` | `.authenticated()` | 반드시 토큰 필요! |
| `/api/messages/123` | `.authenticated()` | 반드시 토큰 필요! |
| 그 외 모든 URL | `.authenticated()` | 반드시 토큰 필요! |

**동작 방식**:
```
요청: GET /api/messages
    ↓
AuthorizationFilter가 SecurityConfig 확인
    ↓
"/api/messages/**".authenticated() 발견
    ↓
SecurityContext에 인증 정보 있나요?
    ├─ YES → 통과! Controller 실행
    └─ NO → 차단! 403 Forbidden
```

---

## 📁 프로젝트 폴더 구조

```
backend/src/main/java/com/cycle/backend/
│
├── model/                          # 엔티티 (DB 테이블)
│   ├── User.java                   # 사용자 테이블 (id, username, password, role)
│   ├── Role.java                   # 권한 enum (USER, ADMIN)
│   └── Message.java                # 메시지 테이블 (id, content, timestamp, author)
│
├── repository/                     # DB 접근 인터페이스
│   ├── UserRepository.java         # User CRUD + findByUsername()
│   └── MessageRepository.java      # Message CRUD
│
├── dto/auth/                       # 데이터 전송 객체
│   ├── LoginRequest.java           # 로그인 요청 { username, password }
│   ├── AuthResponse.java           # 로그인 응답 { accessToken, username, role }
│   └── MessageResponse.java        # 일반 응답 { message }
│
├── security/                       # JWT 보안 관련
│   ├── JwtUtils.java               # JWT 생성/검증/파싱 유틸
│   ├── JwtAuthenticationFilter.java # 모든 요청에서 JWT 확인하는 필터 ⭐
│   ├── UserDetailsImpl.java        # User → Spring Security UserDetails 변환
│   └── UserDetailsServiceImpl.java # username으로 User 조회
│
├── config/                         # 설정
│   ├── SecurityConfig.java         # Spring Security 설정 (필터, 권한) ⭐
│   ├── CorsConfig.java             # CORS 설정
│   └── DataLoader.java             # 초기 데이터 (testuser 생성)
│
├── service/                        # 비즈니스 로직
│   ├── AuthService.java            # 로그인 처리, JWT 발급
│   └── MessageService.java         # 메시지 CRUD 로직
│
└── controller/                     # REST API
    ├── AuthController.java         # POST /api/auth/login, /logout, GET /me
    └── MessageController.java      # GET/POST/DELETE /api/messages ⭐
```

---

## 📝 각 파일 역할 (실제 코드)

### 1. Security 패키지 (JWT 핵심)

#### `JwtUtils.java` - JWT 토큰 생성/검증/파싱

**역할**: JWT 토큰의 생성, 검증, username 추출을 담당하는 핵심 유틸리티

```java
@Component
public class JwtUtils {
    @Value("${jwt.secret}")
    private String jwtSecret;  // application.properties의 시크릿 키

    @Value("${jwt.expiration}")
    private long jwtExpiration;  // 86400000 (24시간)

    // 1️⃣ JWT 토큰 생성 (로그인 성공 시)
    public String generateToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .subject(username)              // 토큰 주인 (testuser)
                .issuedAt(now)                  // 발급 시간
                .expiration(expiryDate)         // 만료 시간 (24시간 후)
                .signWith(getSigningKey())      // 서명 (위변조 방지)
                .compact();
    }

    // 2️⃣ 토큰에서 username 추출 (필터에서 사용)
    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();  // "testuser" 반환
    }

    // 3️⃣ 토큰 검증 (필터에서 매번 호출)
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;  // 유효함
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired");
            return false;  // 만료됨
        } catch (Exception e) {
            logger.error("JWT validation failed");
            return false;  // 위변조됨
        }
    }
}
```

**언제 사용되나요?**
- `generateToken()`: 로그인 성공 → AuthService에서 호출
- `validateToken()`: 매 API 요청 → JwtAuthenticationFilter에서 호출
- `getUsernameFromToken()`: 토큰 유효하면 → JwtAuthenticationFilter에서 호출

---

#### `JwtAuthenticationFilter.java` - 모든 요청을 가로채는 경비원

**역할**: 모든 HTTP 요청을 가로채서 Authorization 헤더의 JWT를 검증

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1️⃣ Authorization 헤더에서 JWT 추출
            String jwt = parseJwt(request);
            // 예: "Bearer eyJhbGci..." → "eyJhbGci..."

            // 2️⃣ JWT가 있고 유효하면
            if (jwt != null && jwtUtils.validateToken(jwt)) {

                // 3️⃣ 토큰에서 username 추출
                String username = jwtUtils.getUsernameFromToken(jwt);
                // "testuser"

                // 4️⃣ DB에서 사용자 정보 조회
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // 5️⃣ Spring Security 인증 객체 생성
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 6️⃣ SecurityContext에 인증 정보 저장
                // → 이제 이 요청은 "testuser"로 인증됨!
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e.getMessage());
        }

        // 7️⃣ 다음 필터로 넘김 (또는 Controller로)
        filterChain.doFilter(request, response);
    }

    // Authorization 헤더에서 "Bearer eyJhbGci..." → "eyJhbGci..." 추출
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);  // "Bearer " 제거
        }

        return null;
    }
}
```

**이 필터가 하는 일 (쉽게 설명)**:
```
경비원이 모든 사람 체크:
1. "출입증(토큰) 있어요?"
2. "출입증이 진짜예요? 만료 안 됐어요?" (validateToken)
3. "출입증 주인이 누구예요?" (getUsernameFromToken)
4. "회사 직원 명부에 있는 사람이에요?" (loadUserByUsername)
5. "확인 완료! 출입증에 도장 찍어드릴게요" (SecurityContext에 저장)
6. "통과하세요!" (filterChain.doFilter)
```

---

### 2. Config 패키지

#### `SecurityConfig.java` - Spring Security 보안 규칙 설정

**역할**: URL별 접근 권한, 필터 체인, 인증 방식 설정

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // 비밀번호 암호화
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF 비활성화 (JWT 사용하므로 불필요)
                .csrf(csrf -> csrf.disable())

                // CORS 설정
                .cors(cors -> cors.configure(http))

                // 세션 사용 안 함 (JWT가 세션 역할 대체)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // URL별 접근 권한 설정
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/health").permitAll()     // 로그인, 헬스체크 = 누구나 접근 가능
                        .requestMatchers("/api/messages/**").authenticated()            // 메시지 API = 로그인 필요
                        .anyRequest().authenticated())                                  // 나머지 = 로그인 필요

                // AuthenticationProvider 등록
                .authenticationProvider(authenticationProvider())

                // JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 추가
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
}
```

**이 설정이 하는 일 (쉽게 설명)**:
```
건물 출입 규칙 정하기:
1. 1층 로비(/api/auth/login)는 출입증 없이도 들어갈 수 있음 (.permitAll)
2. 2층 사무실(/api/messages)은 출입증 있어야 들어갈 수 있음 (.authenticated)
3. 모든 층 입구에 경비원(JwtAuthenticationFilter) 배치 (.addFilterBefore)
4. 세션 사용 안 함 → 출입증만 확인 (STATELESS)
```

---

### 3. Service 패키지

#### `AuthService.java` - 로그인 처리 및 JWT 발급

**역할**: username/password 검증 후 JWT 토큰 생성

```java
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public AuthResponse login(LoginRequest loginRequest) {
        // 1️⃣ username과 password로 인증 시도
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );
        // 이 과정에서 자동으로:
        // - UserDetailsService가 호출됨
        // - DB에서 testuser 조회
        // - BCrypt로 비밀번호 비교
        // - 일치하면 인증 성공, 아니면 BadCredentialsException

        // 2️⃣ 인증 성공! JWT 토큰 생성
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String jwt = jwtUtils.generateToken(userDetails.getUsername());

        // 3️⃣ 사용자 정보 조회
        var user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 4️⃣ 응답 생성
        return AuthResponse.builder()
                .accessToken(jwt)              // JWT 토큰
                .tokenType("Bearer")           // 토큰 타입
                .expiresIn(jwtExpiration)      // 만료 시간 (86400000ms = 24시간)
                .username(user.getUsername())  // testuser
                .role(user.getRole().name())   // USER
                .build();
    }
}
```

**이 서비스가 하는 일 (쉽게 설명)**:
```
로비 직원이 하는 일:
1. "신분증(username/password) 보여주세요"
2. "신분증이 진짜인지 확인해볼게요" (authenticationManager)
3. "맞네요! 출입증(JWT) 발급해드릴게요" (generateToken)
4. "여기 출입증입니다. 24시간 유효합니다" (AuthResponse)
```

---

### 4. Controller 패키지

#### `MessageController.java` - 메시지 API

**역할**: 메시지 CRUD API 제공

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserRepository userRepository;

    // 1️⃣ 메시지 생성 (현재 사용자 필요)
    @PostMapping("/messages")
    public ResponseEntity<Message> createMessage(
            @Valid @RequestBody MessageRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {  // ← JWT에서 자동 주입!

        // userDetails는 JwtAuthenticationFilter가 SecurityContext에 저장한 거!
        User author = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Message message = messageService.createMessage(request.getContent(), author);
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    // 2️⃣ 메시지 목록 조회
    @GetMapping("/messages")
    public ResponseEntity<List<Message>> getAllMessages() {
        // 여기 도착하기 전에 이미 JWT 검증 완료!
        // SecurityConfig에서 .authenticated() 설정했기 때문

        List<Message> messages = messageService.getAllMessages();
        return ResponseEntity.ok(messages);
    }

    // 3️⃣ 특정 메시지 조회
    @GetMapping("/messages/{id}")
    public ResponseEntity<Message> getMessageById(@PathVariable Long id) {
        return messageService.getMessageById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 4️⃣ 메시지 삭제
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }

    // 5️⃣ 헬스체크 (토큰 불필요)
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        // SecurityConfig에서 .permitAll() 설정
        // 경비원(필터)이 체크는 하지만 통과시킴
        return ResponseEntity.ok("Backend is running!");
    }
}
```

**중요!**
- Controller에는 JWT 검증 코드가 **없습니다**!
- 왜? `JwtAuthenticationFilter`가 **먼저** 검증하기 때문!
- `@AuthenticationPrincipal`로 현재 사용자 정보를 바로 받을 수 있음

---

#### `AuthController.java` - 인증 관련 REST API

```java
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    // 1️⃣ 로그인 API (토큰 불필요)
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(response);
    }

    // 2️⃣ 로그아웃 API (클라이언트가 토큰 삭제)
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout() {
        // JWT는 서버에 상태를 저장하지 않으므로
        // 클라이언트가 localStorage에서 토큰을 삭제하면 끝
        return ResponseEntity.ok(new MessageResponse("Logged out successfully"));
    }

    // 3️⃣ 현재 로그인한 사용자 정보 조회 (토큰 필요)
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        // @AuthenticationPrincipal: SecurityContext에서 현재 사용자 자동 주입
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }
}
```

---

## 🔄 전체 흐름 정리 (그림으로 이해하기)

### Flow 1: 로그인 (JWT 발급)

```
클라이언트                         백엔드
    │                                │
    │  POST /api/auth/login          │
    │  { username, password }        │
    ├────────────────────────────────>│
    │                                │
    │                                │ AuthController.login()
    │                                │     ↓
    │                                │ AuthService.login()
    │                                │     ↓
    │                                │ authenticationManager.authenticate()
    │                                │     ├─> UserDetailsService (DB에서 testuser 조회)
    │                                │     └─> BCrypt 비교 (일치!)
    │                                │     ↓
    │                                │ JwtUtils.generateToken("testuser")
    │                                │     └─> "eyJhbGci..." 생성
    │                                │
    │  { accessToken: "eyJhbGci..." }│
    │<────────────────────────────────┤
    │                                │
    │ localStorage에 저장             │
    │                                │
```

---

### Flow 2: 메시지 조회 (JWT 검증)

```
클라이언트                         백엔드
    │                                │
    │  GET /api/messages             │
    │  Authorization: Bearer token   │
    ├────────────────────────────────>│
    │                                │
    │                                │ JwtAuthenticationFilter
    │                                │     ├─> parseJwt() - 토큰 추출
    │                                │     ├─> validateToken() - 검증 (OK!)
    │                                │     ├─> getUsernameFromToken() - "testuser"
    │                                │     ├─> loadUserByUsername() - DB 조회
    │                                │     └─> SecurityContext에 저장
    │                                │     ↓
    │                                │ AuthorizationFilter
    │                                │     ├─> SecurityContext 확인 (인증됨!)
    │                                │     └─> 통과!
    │                                │     ↓
    │                                │ MessageController.getAllMessages()
    │                                │     └─> DB 조회
    │                                │
    │  [ 메시지 목록 ]                 │
    │<────────────────────────────────┤
    │                                │
```

---

## 💡 핵심 요약

### 1. Controller는 JWT를 신경 안 씀!

```java
@GetMapping("/messages")
public ResponseEntity<List<Message>> getAllMessages() {
    // JWT 검증 코드 없음!
    // 왜? 필터가 이미 검증했기 때문!

    return ResponseEntity.ok(messageService.getAllMessages());
}
```

### 2. 필터가 모든 검증을 대신 함!

```
요청 → JwtAuthenticationFilter → AuthorizationFilter → Controller
       (토큰 검증)                (권한 확인)           (비즈니스 로직)
```

### 3. SecurityConfig가 규칙을 정함!

```java
.requestMatchers("/api/auth/**").permitAll()      // 토큰 불필요
.requestMatchers("/api/messages/**").authenticated()  // 토큰 필요
```

### 4. @AuthenticationPrincipal로 현재 사용자 정보 받기!

```java
public ResponseEntity<Message> createMessage(
        @AuthenticationPrincipal UserDetailsImpl userDetails) {  // ← 자동 주입!

    // userDetails.getId() - 현재 로그인한 사용자 ID
    // userDetails.getUsername() - "testuser"
}
```

---

## 📌 자주 확인할 파일들

| 문제 | 확인할 파일 | 설명 |
|------|------------|------|
| **토큰 검증 실패** | `JwtAuthenticationFilter` | 필터가 제대로 실행되는지 |
| **403 에러** | `SecurityConfig` | URL 권한 설정 확인 |
| **로그인 실패** | `AuthService` | 비밀번호 비교 로직 |
| **사용자 정보 없음** | `UserDetailsServiceImpl` | DB 조회 로직 |
| **토큰 만료** | `application.properties` | `jwt.expiration` 값 |

---

## 💾 application.properties 설정

```properties
# JWT 설정
jwt.secret=your-very-long-secret-key-at-least-256-bits-for-hs256-algorithm-please-change-in-production
jwt.expiration=86400000

# 86400000ms = 24시간
# 3600000ms = 1시간
# 60000ms = 1분
```

---

## 🧪 실제 테스트 해보기

### 1. Postman으로 로그인

```bash
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}

# 응답에서 accessToken 복사
```

### 2. 토큰으로 메시지 조회

```bash
GET http://localhost:8080/api/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

# 200 OK + 메시지 목록
```

### 3. 토큰 없이 호출 (실패)

```bash
GET http://localhost:8080/api/messages
(Authorization 헤더 없음)

# 403 Forbidden
```

---

끝!
