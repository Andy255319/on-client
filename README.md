# ALEKOV 엔드포인트 보안 관제 대시보드 (`on-client`)

> **로컬 엔드포인트 실측 진단과 제로 트러스트(ZTNA/SDP) 아키텍처를 결합한 차세대 보안 관제 대시보드**  
> 실제 로컬 PC 보안 측정값(`[실측]`)과 모의 예제 데이터(`[SDP 미연결 · 예제]`)를 투명하게 분리하여 엔드포인트 상태를 한눈에 모니터링합니다.

---

## 1. 프로젝트 개요 및 규격

* **저장소 주소**: `https://github.com/Andy255319/on-client.git`
* **지원 및 실행 환경**: Windows 11 / Windows_NT, Node.js 22~24 (권장 `v24.19.0`, 외부 npm 의존성 없음)
* **화면 틀 작전**: **관제 대시보드형 (Control Dashboard)**
  * 상단 4대 핵심 관제 지표 요약 카드
  * 하단 내 PC 보안·네트워크 실측 현황판 및 최근 24시간 이벤트 로그 분석 배치
* **배포 포장 형태**: **기본 포장 독립 패키지 (Basic Packaging, `dist\Keshev`)**
  * `dist\Keshev\케셰브 시작.bat` 더블클릭만으로 무설치 즉시 구동 및 브라우저 자동 실행
* **앱 패키지 버전**: `v0.2.11` (`package.json`)

---

## 2. 제공 기능 vs 직접 개선한 핵심 기능

| 구분 | 항목 | 기본 시작 틀 (제공 상태) | 직접 개선 및 구현한 기능 (학생 구현) |
|---|---|---|---|
| **핵심 1** | **4대 관제 지표 요약** | 텍스트 박스 위주의 단순 정적 메시지 | • **상단 4대 관제 카드 분리 배치** (기기 준수, 세션, PC 실측, 실시간 위협)<br>• **`[실측]`**(녹색)과 **`[SDP 미연결 · 예제]`**(주황색) 배지로 데이터 출처 투명 분리<br>• `student/appearance.json` 테마 기반 맞춤형 관제 스타일링 |
| **핵심 2** | **내 PC 보안·네트워크 실측** | 로컬 PC 상태 측정 부재 (단순 미연결 오류) | • **내 PC 보안·네트워크 구성 실측 현황판 신설**<br>• 실제 로컬 활성 네트워크 어댑터 및 IPv4 주소 추출 (`os.networkInterfaces`)<br>• Windows 방화벽 읽기 전용 상태 점검 (`netsh advfirewall`)<br>• 최근 24시간 Windows System·Application 이벤트 로그 집계 및 **"침해/공격 탐지 결과 아님"** 안내 명시 |
| **핵심 3** | **비동기 갱신 & W3C 접근성** | 전체 페이지 새로고침(F5) 방식에 의존 | • **`[다시 조회]` 비동기 버튼 신설** (화면 깜빡임 없는 실시간 부분 갱신)<br>• `⏳ 로컬 PC 보안 상태 및 Windows 로그 측정 중...` 로딩 인디케이터 제공<br>• **W3C WAI 지침 준수**: `tabindex="0"`, 키보드 `Tab`/`Enter`/`Space` 완벽 제어 |
| **도구·배포** | **원클릭 실행 패키지** | 단순 실행 시 SDP 미연결 오류 화면 발생 | • `tools/package-app.ps1` 개선으로 `-Demo` 플래그 및 브라우저 자동 실행 연동<br>• `dist\Keshev\케셰브 시작.bat` 더블클릭만으로 즉시 구동 |

---

## 3. 시스템 아키텍처 및 데이터 흐름

```mermaid
flowchart TD
  Browser["브라우저 화면<br/>public/index.html · public/app.js"]
  Student["학생 렌더러 확장<br/>student/extension.mjs"]
  Server["로컬 앱 서버<br/>src/server.mjs"]
  
  Browser -->|"렌더러 슬롯 호출"| Student
  Browser <-->|"동일 출처 HTTP API (127.0.0.1:5189)"| Server

  Server --> Engine["엔진 선택기<br/>src/engine.mjs"]
  Engine --> Disconnected["기본 실행<br/>(미연결)"]
  Engine --> Demo["--demo<br/>(예제 모의 데이터)"]

  Server --> LocalDiag["로컬 진단 모듈<br/>GET /api/pc-diagnostics"]
  LocalDiag --> OS["OS 네트워크 & 방화벽<br/>IPv4 · netsh advfirewall"]
  LocalDiag --> EventLog["Windows 이벤트 로그<br/>Get-WinEvent (최근 24시간)"]

  Server --> Sdp["선택 구성<br/>src/engine/sdp-host.mjs"]
  Sdp -.->|"운영자 승인 시"| SdpSource["엔터프라이즈 SDP/XDR 원천"]

  Server --> Ai["앱 내 AI 서비스<br/>src/ai/"]
  Ai -.->|"운영자 키 발급 시"| Gateway["보안 AI 게이트웨이"]
```

> **데이터 출처 격리 원칙**:  
> 로컬 실측 데이터(`GET /api/pc-diagnostics`)는 실제 PC에서 안전하게 읽기 전용으로 수집되며, 기업용 SDP/ZTNA 서버 및 AI 게이트웨이 연결은 운영 환경 설정에 따라 독립적으로 분리되어 관리됩니다.

---

## 4. 디렉토리 구조 및 구성요소 역할

```text
on-client/
├── dist/
│   └── Keshev/                # 독립 실행 배포 패키지 (원클릭 배치 및 바로가기)
├── docs/                      # 설계 명세, 커리큘럼, 시연 가이드 및 트러블슈팅
│   ├── ALEPH_FINAL_WORK_RECORD.md   # 최종 구현 작업 상세 기록
│   ├── FINAL_DEMO_AND_SUMMARY.md    # 1분 시연 시나리오 및 개선 요약
│   └── CONNECTION_TROUBLESHOOT.md   # 포트 충돌 및 연결 문제 해결 가이드
├── public/                    # 관제 대시보드 기본 웹 자산
│   ├── index.html             # 메인 HTML 뷰
│   ├── style.css              # 레이아웃 및 컴포넌트 스타일
│   └── app.js                 # 클라이언트 인터랙션 로직
├── src/                       # 로컬 앱 백엔드 서버
│   ├── server.mjs             # 웹 서버 및 /api/pc-diagnostics 실측 엔드포인트
│   ├── engine.mjs             # 엔진 분기 (미연결 / 데모 모드)
│   └── vulnerabilities/       # OSV 패키지 취약점 진단 모듈
├── student/                   # 학생 직접 구현 영역 (핵심 모듈)
│   ├── extension.mjs          # 4대 관제 카드, 실측 현황판, [다시 조회] 비동기 핸들러
│   └── appearance.json        # 관제 대시보드 테마 및 색상 정의
└── tools/                     # 기동 및 패키징 스크립트
    ├── start-alekov.ps1       # 로컬 개발 서버 기동 스크립트
    └── package-app.ps1        # dist/Keshev 독립 실행 패키지 생성 스크립트
```

| 주요 구성요소 | 파일 경로 | 주요 역할 |
|---|---|---|
| **학생 화면 확장** | `student/extension.mjs` | 상단 4대 관제 카드, 실측 현황판 렌더링, `[다시 조회]` 비동기 이벤트 및 W3C 키보드 접근성 처리 |
| **테마 설정** | `student/appearance.json` | 관제 대시보드 헤더 뱃지, 카드 스타일 및 컬러 팔레트 정의 |
| **로컬 백엔드 서버** | `src/server.mjs` | 정적 웹 서빙 및 로컬 PC 실측 엔드포인트(`GET /api/pc-diagnostics`) 제공 |
| **원클릭 배포 패키지** | `dist/Keshev/`, `tools/package-app.ps1` | 외부 의존성 없는 독립 실행 패키지 빌드 및 `케셰브 시작.bat` 자동화 |
| **실행 스크립트** | `tools/start-alekov.ps1` | Node.js 환경 점검, 포트(5189) 충돌 검사, 브라우저 자동 기동 처리 |
| **최종 증빙 문서** | `docs/ALEPH_FINAL_WORK_RECORD.md` 등 | 핵심 기능 명세, 실측 근거, 1분 시연 시나리오 및 완성 기록 |

---

## 5. 실행 및 검증 방법

### 1) 실행 방법

#### 방법 A: 원클릭 패키지 실행 (추천)
`dist\Keshev\케셰브 시작.bat`를 더블클릭합니다. 별도 터미널 명령어 입력 없이 브라우저(`http://127.0.0.1:5189/`)가 자동으로 열리며 관제 대시보드가 구동됩니다.

#### 방법 B: PowerShell 스크립트 실행
프로젝트 루트 폴더에서 아래 명령어를 실행합니다:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1 -Demo
```

---

### 2) 문법 및 코드 무결성 검증

외부 npm 패키지 설치(`npm install`) 없이 순수 Node.js 내장 환경에서 동작합니다:
```powershell
# 1. 학생 확장 모듈 문법 검사 (0 errors 확인)
npm run check

# 2. 서버 백엔드 문법 검사 (0 errors 확인)
node --check src/server.mjs
```

---

### 3) 독립 실행 패키지 재생성

```powershell
npm run package-app
```
실행 시 `dist\Keshev` 폴더가 재생성되며, `-Demo` 플래그와 브라우저 자동 실행이 연결된 `케셰브 시작.bat`가 함께 갱신됩니다.

---

## 6. 핵심 기능 1분 시연 순서

1. **상단 4대 관제 카드 확인**:
   * 기기 준수 상태(`[SDP 미연결 · 예제]`), 로그인 세션(`[SDP 미연결 · 예제]`), 내 PC 보안 & 네트워크(**`[실측]`**), 실시간 위협(XDR) 카드의 출처 배지가 서로 명확히 구분되어 표시되는 것을 확인합니다.
2. **내 PC 보안·네트워크 실측 현황판 점검**:
   * 로컬 활성 IPv4 주소, 방화벽(도메인/개인/공용) 보호 상태, 최근 24시간 Windows 이벤트 로그(System/Application) 실측 건수와 필수 안내 문구("침해나 공격 탐지 결과 아님")를 확인합니다.
3. **`[다시 조회]` 버튼 실시간 갱신 및 키보드 조작**:
   * 마우스 클릭 또는 키보드 `Tab` 이동 후 `Enter`/`Space`를 눌러 `⏳ 로컬 PC 보안 상태 및 Windows 로그 측정 중...` 인디케이터와 함께 비동기로 실측 데이터와 시각이 즉시 갱신되는 것을 확인합니다.

---

## 7. 정직한 한계와 미연결 안내 (Fact & Limits)

과정의 학습 계약과 무결성 원칙에 따라, 구현하지 않았거나 권한상 확인할 수 없는 항목은 정상으로 꾸며내지 않고 한계로 투명하게 표시합니다.

1. **SDP 서버 원천 미연결 (예제 데이터 모드)**:
   * 실제 엔터프라이즈 SDP/ZTNA 서버와는 미연결 상태입니다. 기기 준수 판정과 세션, XDR 모의 위협은 학습용 예제 데이터로 표시되며 `[SDP 미연결 · 예제]` 배지가 부여됩니다.
2. **비파괴 읽기 전용 점검 원칙**:
   * 관리자 권한이 필요한 레지스트리 심층 설정 변경이나 공격 시뮬레이션은 시스템 보호를 위해 수행하지 않으며, 미확인 값은 임의 조작 없이 **'확인 불가(unknown)'**로 명시합니다.
3. **Windows 이벤트 로그 안내**:
   * 실측된 시스템·응용프로그램 이벤트 로그 건수는 침해나 공격 탐지 결과가 아니며, 정상적인 Windows 동작 기록임을 화면에 필수 안내 문구로 명시합니다.
4. **승인 런타임 미설치 상태**:
   * 공식 서명된 매니페스트 발급 런타임이 미설치된 환경이므로, 규정에 명시된 **기본 포장(`dist\Keshev`)**을 채택하여 안정성을 검증했습니다.

---

## 8. 보안 및 안전 수칙

* **인증 정보 보호**: AI API 키, 비밀번호, 토큰 등 민감한 인증 정보는 코드, 커밋, 캡처 화면, 문서 등에 일절 포함하지 않습니다.
* **비밀 설정값 분리**: 주소나 시크릿 키를 소스코드나 공개 문서에 하드코딩하지 않습니다.
* **문제 해결**: 포트 충돌(`EADDRINUSE`)이나 브라우저 연결 문제는 `docs/CONNECTION_TROUBLESHOOT.md`를 참고하십시오.