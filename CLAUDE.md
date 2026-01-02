# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 필요한 가이드를 제공합니다.

## 1. 프로젝트 개요 및 기술 스택

Next.js 16.1 App Router 아키텍처를 기반으로 하며, 최신 React 19 기능을 적극 활용하는 프론트엔드 애플리케이션입니다.

### 핵심 기술 스택

- **Framework**: Next.js 16.1 (App Router)
- **Library**: React 19 RC
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (PostCSS 플러그인)
- **Package Manager**: Bun
- **Icons**: Lucide React
- **State Management**: URL Search Params (Server State), React Context (Global Client State)

## 2. 주요 명령어

```bash
# 개발
bun dev                    # 개발 서버 시작 (http://localhost:3000)

# 빌드 & 프로덕션
bun run build             # 프로덕션 빌드
bun start                 # 프로덕션 서버 시작

# 코드 품질
bun run lint              # ESLint 실행
```

## 3. 디자인 패턴: Atomic Design

이 프로젝트는 UI 컴포넌트의 재사용성을 위해 **Atomic Design Pattern**을 엄격히 따릅니다.

### 계층 구조 및 역할

| 계층          | 경로                    | 역할 및 특징                                                                        |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| **Atoms**     | `components/atoms/`     | 더 이상 쪼갤 수 없는 최소 단위 (Button, Input, Text, Icon). **상태 없음.**          |
| **Molecules** | `components/molecules/` | Atoms의 조합. 단일 기능 수행 (FormField, SearchBar). **최소한의 로컬 상태.**        |
| **Organisms** | `components/organisms/` | 서비스의 독립된 섹션 (Header, LoginForm, ProductList). **비즈니스 로직 포함 가능.** |
| **Templates** | `components/templates/` | 페이지의 레이아웃 구조 정의. 데이터가 없는 와이어프레임 성격.                       |
| **Pages**     | `app/**/page.tsx`       | Templates에 실제 데이터를 주입. Server Component가 기본.                            |

> **참고**: 아이콘 사용 시 `lucide-react`를 사용하며, 필요시 Atoms의 `Icon.tsx` 래퍼를 통해 사용합니다.

## 4. 아키텍처 및 코딩 규칙

### App Router & React 19

- **Server Components 기본**: 모든 컴포넌트는 기본적으로 서버 컴포넌트로 작성합니다.
- **Client Components**: 상호작용(onClick, onChange), React Hooks(useState, useEffect)가 필요한 경우 파일 최상단에 `'use client'`를 명시합니다.
- **Form Handling**: React 19의 `useActionState`, `useFormStatus` 훅을 활용하여 폼 상태를 관리합니다.

### 데이터 처리 (Data Fetching & Mutation)

- **조회 (Fetching)**: Server Component에서 `fetch` 또는 DB 호출을 직접 수행합니다. `useEffect`를 통한 클라이언트 페칭은 지양합니다.
- **변경 (Mutation)**: **Server Actions** (`'use server'`)를 우선적으로 사용합니다.
- **API Routes (`app/api`)**: 외부 서비스(Webhook) 연동이나 REST API 제공이 필요한 특수한 경우에만 사용합니다.

### 스타일링 (Tailwind CSS v4)

- **설정**: `tailwind.config.js` 대신 `app/globals.css` 내부의 `@theme` 블록을 사용하여 테마를 설정합니다.
- **클래스 병합**: 조건부 스타일링 시 `clsx`와 `tailwind-merge`를 조합한 `cn()` 유틸리티 함수(`lib/utils.ts`)를 사용합니다.
- **다크 모드**: CSS 클래스 기반(`dark:`)을 사용합니다.
- **동적 클래스**: `bg-${color}-500`과 같은 문자열 보간법을 피하고, 전체 클래스 명을 명시합니다.

### 파일 및 폴더 구조 규칙

- **경로 별칭**: `@/*`는 프로젝트 루트(`./`)를 가리킵니다.
- **컴포넌트**: PascalCase (예: `PrimaryButton.tsx`)
- **배럴 파일 지양**: 순환 의존성 방지와 트리쉐이킹 최적화를 위해 `index.ts`를 통한 재내보내기(Barrel file)는 사용하지 않고 개별 파일 경로로 import 합니다.

## 5. 프로젝트 구조

```
app/                          # Pages & Routes
├── layout.tsx               # Root Layout (Geist Font, Providers)
├── globals.css              # Tailwind v4 @theme & Global Styles
├── (auth)/                  # Route Group: 인증
│   └── login/page.tsx       # -> uses templates/AuthLayout
├── (shop)/                  # Route Group: 커머스
│   └── products/
│       ├── page.tsx         # Server Component (Data Fetching)
│       └── actions.ts       # Server Actions (AddToCart etc.)
└── api/                     # Edge cases only (Webhooks)

components/                  # UI Components (Atomic)
├── atoms/
├── molecules/
├── organisms/
└── templates/

lib/                         # Business Logic & Utils
├── utils.ts                 # cn() 등 공용 유틸리티
├── actions/                 # 재사용 가능한 Server Actions
└── data/                    # Data Fetching Logic (DB query wrappers)

hooks/                       # Global Custom Hooks (useCart, etc.)
types/                       # TypeScript Definitions
```

## 6. 개발 워크플로우 가이드

새로운 기능을 구현할 때 다음 순서를 따르십시오:

1.  **타입 정의**: `types/` 폴더에 필요한 데이터 모델 인터페이스 정의
2.  **UI 컴포넌트 제작 (Bottom-up)**:
    - `Atoms` 확인 또는 생성 (스타일링 위주)
    - `Molecules` 조합 (간단한 상호작용)
    - `Organisms` 구현 (기능 단위 완성)
3.  **데이터 로직 구현**:
    - 조회 로직: Server Component에서 바로 호출할 함수 작성
    - 변경 로직: Server Actions (`'use server'`) 작성
4.  **페이지 조립**:
    - `Templates`에 UI 배치
    - `Page` (Server Component)에서 데이터 Fetch 후 Template에 전달
5.  **검증**: `bun run lint` 및 브라우저 확인

## 7. 주요 설정 파일

- `next.config.ts`: Next.js 설정
- `tsconfig.json`: TypeScript 및 경로 별칭 설정
- `app/globals.css`: Tailwind CSS v4 테마 및 스타일 설정
- `eslint.config.mjs`: Lint 규칙
