#!/bin/bash
# Maven Wrapper 설정 스크립트

echo "Maven Wrapper 설정 중..."

# .mvn/wrapper 디렉토리 생성
mkdir -p .mvn/wrapper

# Maven Wrapper jar 파일 다운로드
WRAPPER_JAR=".mvn/wrapper/maven-wrapper.jar"
WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"

if [ ! -f "$WRAPPER_JAR" ]; then
    echo "Maven Wrapper jar 파일 다운로드 중..."
    if command -v curl > /dev/null; then
        curl -L "$WRAPPER_URL" -o "$WRAPPER_JAR"
    elif command -v wget > /dev/null; then
        wget "$WRAPPER_URL" -O "$WRAPPER_JAR"
    else
        echo "오류: curl 또는 wget이 필요합니다."
        exit 1
    fi
    echo "다운로드 완료!"
else
    echo "Maven Wrapper jar 파일이 이미 존재합니다."
fi

# 실행 권한 부여
chmod +x mvnw

echo "설정 완료! 이제 ./mvnw spring-boot:run 명령어를 사용할 수 있습니다."

