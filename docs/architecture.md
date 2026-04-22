# Code Notes - Architecture Documentation

## Overview

Code Notes is a cross-platform note-taking application for code questions and quizzes. It supports web browsers and Tauri desktop (including Android), and can be embedded into `glean-oak-app` via Shadow DOM. Built as a Turborepo monorepo with offline-first IndexedDB storage and checkpoint-based sync.

```mermaid
C4Context
    title Code Notes - System Context

    Person(user, "Developer", "Studies code questions, takes quizzes")

    System(codeNotes, "Code Notes", "Cross-platform Q&A and quiz app")

    System_Ext(qmHub, "glean-oak-app", "Admin panel hosting embedded apps")
    System_Ext(qmServer, "glean-oak-server", "Axum API server with MongoDB")

    Rel(user, codeNotes, "Creates topics, questions, takes quizzes")
    Rel(user, qmHub, "Uses embedded Code Notes")
    Rel(qmHub, codeNotes, "Embeds via Shadow DOM")
    Rel(codeNotes, qmServer, "Syncs data via /api/v1/sync")
```

## Monorepo Structure

```mermaid
flowchart TB
    subgraph Apps["apps/"]
        Web["web/<br/>@code-notes/web<br/>Standalone Vite app"]
        Native["native/<br/>@code-notes/tauri<br/>Tauri v2 desktop + Android"]
    end

    subgraph Packages["packages/"]
        UI["ui/<br/>@code-notes/ui<br/>Components, adapters, hooks, store"]
        Shared["shared/<br/>@code-notes/shared<br/>Types, constants, utilities"]
        TSConfig["tsconfig/<br/>Shared TS configs"]
        ESLint["eslint-config/<br/>Shared ESLint config"]
    end

    Web --> UI
    Native --> UI
    UI --> Shared
    Web --> Shared
    Native --> Shared
    Web --> TSConfig
    Native --> TSConfig
    UI --> TSConfig

    classDef app fill:#dbeafe,stroke:#3b82f6
    classDef pkg fill:#d1fae5,stroke:#10b981
    class Web,Native app
    class UI,Shared,TSConfig,ESLint pkg
```

## Service Architecture

The app uses a **Service Locator** pattern. Services are registered via setter functions at startup and retrieved via getters throughout the app.

```mermaid
flowchart TB
    subgraph Embed["CodeNotesApp (embed entry)"]
        Init["Service initialization<br/>on mount + DB ready"]
    end

    subgraph Factory["ServiceFactory"]
        direction LR
        Set["setXxxService()"]
        Get["getXxxService()"]
    end

    subgraph Services["Service Interfaces"]
        ITopics["ITopicsService"]
        IQuestions["IQuestionsService"]
        IQuery["IQueryService"]
        IProgress["IProgressService"]
        IQuiz["IQuizService"]
        IDataMgmt["IDataManagementService"]
        ISync["ISyncService"]
        IAuth["IAuthService"]
    end

    subgraph Adapters["Web Adapters (IndexedDB)"]
        WebTopics["WebTopicsAdapter"]
        WebQuestions["WebQuestionsAdapter"]
        WebQuery["WebQueryAdapter"]
        WebProgress["WebProgressAdapter"]
        WebQuiz["WebQuizAdapter"]
        WebDataMgmt["WebDataManagementAdapter"]
        SyncAdapter["IndexedDBSyncAdapter"]
        AuthAdapter["QmServerAuthAdapter"]
    end

    Init --> Set
    Set --> Services
    Services --> Adapters

    Get -.->|"used by store,<br/>components, hooks"| Services

    classDef iface fill:#fef3c7,stroke:#f59e0b
    classDef adapter fill:#e0e7ff,stroke:#6366f1
    class ITopics,IQuestions,IQuery,IProgress,IQuiz,IDataMgmt,ISync,IAuth iface
    class WebTopics,WebQuestions,WebQuery,WebProgress,WebQuiz,WebDataMgmt,SyncAdapter,AuthAdapter adapter
```

### Service Registration Flow

```mermaid
sequenceDiagram
    participant App as CodeNotesApp
    participant DB as initDb()
    participant SF as ServiceFactory
    participant Auth as QmServerAuthAdapter
    participant Sync as IndexedDBSyncAdapter

    App->>DB: initDb(userId)
    DB-->>App: DB ready

    App->>SF: setTopicsService(new WebTopicsAdapter())
    App->>SF: setQuestionsService(new WebQuestionsAdapter())
    App->>SF: setQueryService(new WebQueryAdapter())
    App->>SF: setProgressService(new WebProgressAdapter())
    App->>SF: setQuizService(new WebQuizAdapter())
    App->>SF: setDataManagementService(new WebDataManagementAdapter())

    App->>Auth: getAuthService()
    Note right of Auth: Lazy-creates QmServerAuthAdapter<br/>if not already set

    App->>Sync: new IndexedDBSyncAdapter(config)
    Note right of Sync: Config wired to Auth's<br/>getSyncConfig() and getTokens()
    App->>SF: setSyncService(syncAdapter)

    App->>App: Render AppShell
```

## Data Model

```mermaid
erDiagram
    TOPIC {
        string id PK
        string name
        string description
        string slug
        string icon
        string color
        string[] subtopics
        int order
        string createdAt
        string updatedAt
        int syncVersion
        int syncedAt
    }

    QUESTION {
        string id PK
        string topicId FK
        string subtopic
        int questionNumber
        string question
        json answer "{ markdown: string }"
        string[] tags
        enum difficulty "beginner | intermediate | advanced"
        int order
        string createdAt
        string updatedAt
        int syncVersion
        int syncedAt
    }

    QUESTION_PROGRESS {
        string questionId PK
        string topicId FK
        enum status "NotStudied | Studying | Mastered | NeedsReview"
        int confidenceLevel "0-5 scale"
        int timesReviewed
        int timesCorrect
        int timesIncorrect
        string lastReviewedAt
        string nextReviewAt
        string createdAt
        string updatedAt
        int syncVersion
        int syncedAt
    }

    QUIZ_SESSION {
        string id PK
        enum sessionType "Random | Sequential | QuickRefresher | TopicFocused | DifficultyFocused"
        string[] topicIds
        string[] questionIds
        int currentIndex
        string startedAt
        string completedAt
        json[] results "QuizResult[]"
        int syncVersion
        int syncedAt
    }

    SYNC_META {
        string key PK
        string value
    }

    PENDING_CHANGES {
        int id PK "auto-increment"
        string tableName
        string rowId
        enum operation "create | update | delete"
        json data
        int version
        int createdAt
    }

    TOPIC ||--o{ QUESTION : "has many"
    QUESTION ||--o| QUESTION_PROGRESS : "tracks"
    QUIZ_SESSION }o--o{ QUESTION : "includes"
    TOPIC ||--o{ QUESTION_PROGRESS : "aggregates"
```

## State Management

Zustand store with slices, persisted to localStorage. IndexedDB is the source of truth for data; the store caches it for reactive UI updates.

```mermaid
flowchart LR
    subgraph Store["Zustand Store"]
        TS["topicsSlice<br/>Topic CRUD"]
        QS["questionsSlice<br/>Question CRUD"]
        PS["progressSlice<br/>Learning progress"]
        QzS["quizSlice<br/>Quiz sessions"]
        UIS["uiSlice<br/>Sidebar, fontSize, modals"]
    end

    subgraph Persist["persist middleware"]
        LS["localStorage<br/>'code-notes-storage'"]
    end

    subgraph DataLayer["IndexedDB (Dexie)"]
        IDB[(CodeNotesDB)]
    end

    Store -->|"partialize:<br/>topics, questions,<br/>sidebarOpen, fontSize"| Persist
    Persist --> LS

    Store -->|"CRUD via<br/>getXxxService()"| DataLayer

    classDef store fill:#fef3c7,stroke:#f59e0b
    classDef data fill:#e0e7ff,stroke:#6366f1
    class TS,QS,PS,QzS,UIS store
    class IDB data
```

**Persisted fields:** `topics`, `questions`, `sidebarOpen`, `fontSize`

**Not persisted (fetched fresh):** `progressMap` (Map object), `activeSession` (ephemeral quiz state)

## Sync Architecture

Offline-first with checkpoint-based delta sync against `glean-oak-server`.

```mermaid
sequenceDiagram
    participant App as Code Notes
    participant IDB as IndexedDB
    participant Sync as IndexedDBSyncAdapter
    participant Storage as IndexedDBSyncStorage
    participant Client as GleanOakClient
    participant Server as glean-oak-server

    App->>Sync: syncNow()
    Sync->>Client: Refresh tokens
    Sync->>Storage: getPendingChanges()
    Storage->>IDB: Read _pendingChanges
    IDB-->>Storage: PendingChange[]
    Sync->>Storage: getCheckpoint()
    Storage->>IDB: Read _syncMeta["checkpoint"]
    IDB-->>Storage: Checkpoint

    Sync->>Client: delta(pendingChanges, checkpoint)
    Client->>Server: POST /api/v1/sync/{appId}/delta

    Server-->>Client: DeltaResponse { push, pull }

    alt Push phase
        Note over Sync: Mark synced records<br/>in _pendingChanges
        Sync->>Storage: markSynced(syncedIds)
    end

    loop Pull pages (while hasMore)
        Sync->>Client: pull(checkpoint)
        Client->>Server: POST /api/v1/sync/{appId}/pull
        Server-->>Client: PullResponse { records, checkpoint, hasMore }
    end

    Note over Sync: Collect ALL records<br/>from all pages first

    Sync->>Storage: applyRemoteChanges(allRecords)
    Storage->>IDB: Upsert/delete records
    Sync->>Storage: saveCheckpoint(finalCheckpoint)

    Sync-->>App: SyncResult { pushed, pulled, conflicts }
```

### Auth Flow (Dual Auth)

```mermaid
flowchart LR
    subgraph Headers["HTTP Headers"]
        APIKey["X-API-Key<br/>X-App-Id"]
        JWT["Authorization:<br/>Bearer {accessToken}"]
    end

    subgraph Auth["QmServerAuthAdapter"]
        Tokens["accessToken<br/>refreshToken<br/>userId"]
        Config["serverUrl<br/>appId<br/>apiKey"]
    end

    Auth -->|"App identity"| APIKey
    Auth -->|"User identity"| JWT
    APIKey --> Server["glean-oak-server"]
    JWT --> Server

    classDef header fill:#fecaca,stroke:#ef4444
    class APIKey,JWT header
```

## Embedding in glean-oak-app

```mermaid
flowchart TB
    subgraph GleanOak["glean-oak-app"]
        Router["BrowserRouter"]
        Shadow["ShadowWrapper<br/>(Shadow DOM isolation)"]
    end

    subgraph CodeNotes["CodeNotesApp"]
        Theme["ThemeProvider"]
        Platform["PlatformProvider"]
        BasePath["BasePathContext<br/>'/code-notes'"]
        Portal["PortalContainerContext"]
        Shell["AppShell<br/>(Routes + Layout)"]
    end

    Router --> Shadow
    Shadow --> CodeNotes

    Theme --> Platform
    Platform --> BasePath
    BasePath --> Portal
    Portal --> Shell

    GleanOak -->|"props: authTokens,<br/>basePath, embedded,<br/>useRouter=false"| CodeNotes

    classDef host fill:#fee2e2,stroke:#ef4444
    classDef embed fill:#dbeafe,stroke:#3b82f6
    class GleanOak,Router,Shadow host
    class Theme,Platform,BasePath,Portal,Shell embed
```

**Key embedding behaviors:**
- `useRouter=false` — shares parent's `BrowserRouter`
- `embedded=true` — ThemeProvider dispatches custom events instead of modifying `document.documentElement`
- Auth tokens passed as props (SSO via shared localStorage)
- Logout cleanup syncs pending changes before deleting user's IndexedDB

## Platform Differences

Both Tauri and Web use IndexedDB for all data. The only difference is platform services.

```mermaid
flowchart TB
    subgraph Common["Shared (both platforms)"]
        IndexedDB["IndexedDB via Dexie.js"]
        WebAdapters["Web*Adapter classes"]
        SyncClient["IndexedDBSyncAdapter"]
        AuthClient["QmServerAuthAdapter"]
    end

    subgraph TauriOnly["Tauri-only"]
        Opener["@tauri-apps/plugin-opener<br/>Native URL handling"]
        FS["@tauri-apps/plugin-fs<br/>File system access"]
        Dialog["@tauri-apps/plugin-dialog<br/>Native dialogs"]
    end

    subgraph WebOnly["Web-only"]
        WindowOpen["window.open()<br/>Browser URL handling"]
    end

    Common --> TauriOnly
    Common --> WebOnly

    classDef common fill:#d1fae5,stroke:#10b981
    classDef tauri fill:#e0e7ff,stroke:#6366f1
    classDef web fill:#fef3c7,stroke:#f59e0b
    class IndexedDB,WebAdapters,SyncClient,AuthClient common
    class Opener,FS,Dialog tauri
    class WindowOpen web
```

## Component Architecture (Atomic Design)

```mermaid
flowchart TB
    subgraph Templates
        AppShell["AppShell<br/>Layout + routing"]
        AppLayout["AppLayout"]
    end

    subgraph Pages
        Topics["TopicsPage"]
        Questions["QuestionsPage"]
        QuestionDetail["QuestionDetailPage"]
        Progress["ProgressDashboardPage"]
        QuizMode["QuizModePage"]
        QuizSession["QuizSessionPage"]
        QuizResults["QuizResultsPage"]
        Search["SearchPage"]
        Settings["SettingsPage"]
        Import["ImportPage"]
        DataMgmt["DataManagementPage"]
        Login["LoginPage"]
    end

    subgraph Organisms
        Sidebar["Sidebar"]
        BottomNav["BottomNavigation"]
        TopicForm["TopicForm"]
        QuestionForm["QuestionForm"]
        ImportForm["ImportForm"]
        SyncSettings["SyncSettings"]
    end

    subgraph Molecules
        MarkdownRenderer["MarkdownRenderer"]
        ConfidenceRating["ConfidenceRating"]
        ProgressBadge["ProgressBadge"]
        Modal["Modal"]
    end

    subgraph Atoms
        Button["Button"]
        Input["Input"]
        Card["Card"]
        Badge["Badge"]
        Dialog["Dialog"]
        Select["Select"]
        Label["Label"]
        Textarea["Textarea"]
        LoadingSpinner["LoadingSpinner"]
        ErrorBoundary["ErrorBoundary"]
        ThemeToggle["ThemeToggle"]
    end

    Templates --> Pages
    Pages --> Organisms
    Organisms --> Molecules
    Molecules --> Atoms

    classDef tmpl fill:#fecaca,stroke:#ef4444
    classDef page fill:#fed7aa,stroke:#f97316
    classDef org fill:#fef08a,stroke:#eab308
    classDef mol fill:#bbf7d0,stroke:#22c55e
    classDef atom fill:#bfdbfe,stroke:#3b82f6

    class AppShell,AppLayout tmpl
    class Topics,Questions,QuestionDetail,Progress,QuizMode,QuizSession,QuizResults,Search,Settings,Import,DataMgmt,Login page
    class Sidebar,BottomNav,TopicForm,QuestionForm,ImportForm,SyncSettings org
    class MarkdownRenderer,ConfidenceRating,ProgressBadge,Modal mol
    class Button,Input,Card,Badge,Dialog,Select,Label,Textarea,LoadingSpinner,ErrorBoundary,ThemeToggle atom
```

## Routing

All routes are defined in `AppShell.tsx` with lazy-loaded pages.

| Route | Page | Description |
|-------|------|-------------|
| `/` | TopicsPage | Topic list (home) |
| `/topics/:topicId` | QuestionsPage | Questions for a topic |
| `/questions/:questionId` | QuestionDetailPage | Single question view |
| `/quiz` | QuizModePage | Quiz mode selection |
| `/quiz/:sessionId` | QuizSessionPage | Active quiz |
| `/quiz/results/:sessionId` | QuizResultsPage | Quiz results |
| `/progress` | ProgressDashboardPage | Learning progress |
| `/search` | SearchPage | BM25 global search with filters |
| `/import` | ImportPage | Data import |
| `/data-management` | DataManagementPage | Export/clear data |
| `/settings` | SettingsPage | App settings |
| `/login` | LoginPage | Auth (skippable) |

When embedded, routes are prefixed with `basePath` (e.g., `/code-notes/quiz`).

## Quiz Flow

```mermaid
stateDiagram-v2
    [*] --> SelectMode: Open /quiz

    SelectMode --> ConfigureQuiz: Choose session type
    note right of SelectMode
        Random, Sequential,
        QuickRefresher,
        TopicFocused,
        DifficultyFocused
    end note

    ConfigureQuiz --> ActiveSession: Start quiz
    note right of ConfigureQuiz
        Select topics,
        difficulty,
        max questions
    end note

    ActiveSession --> AnswerQuestion: Show question
    AnswerQuestion --> RateConfidence: Reveal answer
    RateConfidence --> AnswerQuestion: Next question

    RateConfidence --> Results: Last question
    note right of RateConfidence
        1-5 star rating
        + correct/incorrect
    end note

    Results --> [*]: Done
    Results --> SelectMode: New quiz

    note right of Results
        Score summary,
        progress updates
    end note
```

## Per-User Database Isolation

Each authenticated user gets their own IndexedDB instance, named with a SHA-256 hash prefix of the user ID.

```mermaid
flowchart LR
    subgraph Users
        U1["User A<br/>userId: abc123"]
        U2["User B<br/>userId: def456"]
        U3["Standalone<br/>no userId"]
    end

    subgraph Databases
        DB1["CodeNotesDB_a1b2c3d4e5f6"]
        DB2["CodeNotesDB_9f8e7d6c5b4a"]
        DB3["CodeNotesDB<br/>(legacy name)"]
    end

    U1 --> DB1
    U2 --> DB2
    U3 --> DB3

    classDef user fill:#dbeafe,stroke:#3b82f6
    classDef db fill:#d1fae5,stroke:#10b981
    class U1,U2,U3 user
    class DB1,DB2,DB3 db
```

On logout, pending changes are synced first, then the user's database is deleted via `Dexie.delete()`.
