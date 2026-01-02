# 빠른 시작 가이드

## 가장 빠른 실행 방법

### 0단계: 사전 준비

**Java가 설치되어 있지 않다면:**
```bash
# Homebrew로 Java 17 설치 (권장)
brew install openjdk@17

# Java 경로 설정
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
source ~/.zshrc

# 확인
java -version
```

### 1단계: 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:3000 에서 확인

### 2단계: 백엔드 실행

**Maven Wrapper 사용 (권장):**
```bash
cd backend
./setup-maven-wrapper.sh  # 처음 한 번만 실행
./mvnw spring-boot:run
```

**Maven이 설치된 경우:**
```bash
cd backend
mvn spring-boot:run
```

→ http://localhost:8080 에서 확인

### 3단계: 테스트
1. 프론트엔드에서 메시지를 입력하고 전송 버튼을 클릭하세요!
2. 메시지가 목록에 표시되는지 확인하세요
3. 새로고침 버튼으로 메시지 목록을 다시 불러올 수 있습니다

## 문제 해결

### Maven Wrapper 권한 오류
```bash
chmod +x backend/mvnw
chmod +x backend/setup-maven-wrapper.sh
```

### 백엔드 연결 안됨
- 백엔드가 실행 중인지 확인: http://localhost:8080/api/health
- 프론트엔드의 서버 상태 표시기를 확인하세요 (초록색 = 연결됨, 빨간색 = 연결 안됨)

### Java 설치 안됨
Java가 설치되어 있지 않다면:
```bash
# Homebrew로 설치 (권장)
brew install openjdk@17

# 경로 설정
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
source ~/.zshrc
```

### Java 버전 확인
```bash
java -version  # Java 17 이상 필요
```

## 다음 단계
자세한 내용은 [README.md](README.md)를 참고하세요.
