

# **차세대 웹 기반 엔터프라이즈 프로젝트 관리 시스템 구축을 위한 심층 기술 보고서: MS Project 수준의 일정 엔진과 실시간 협업의 융합**

## **1\. 서론 및 연구 배경**

현대의 디지털 프로젝트 관리(Project Management, PM) 소프트웨어 시장은 극명하게 양분되어 있다. 한쪽 끝에는 Microsoft Project (MS Project)와 Primavera P6와 같은 전통적인 데스크톱 기반 솔루션이 자리 잡고 있다. 이들은 수십 년간 건설, 항공우주, 플랜트 엔지니어링과 같이 복잡한 공정 관리가 필수적인 산업에서 '골드 스탠다드'로 군림해 왔다. 이들의 핵심 경쟁력은 강력한 일정 관리 엔진(Scheduling Engine)에 있다. 임계 경로법(Critical Path Method, CPM)을 기반으로 수만 개의 작업(Task)과 복잡한 제약 조건(Constraints), 그리고 자원 평준화(Resource Leveling) 알고리즘을 정교하게 처리하는 능력은 대규모 프로젝트의 성공을 위한 필수 요소로 인식되어 왔다.1 그러나 이러한 레거시 시스템들은 가파른 학습 곡선, 폐쇄적인 데이터 구조, 그리고 무엇보다 현대적인 웹 환경에서 요구되는 실시간 협업 기능의 부재라는 한계를 드러내고 있다.

반대편에는 Monday.com, Smartsheet, Wrike, Asana와 같은 '웹 네이티브' 협업 도구들이 급부상했다. 이들은 직관적인 사용자 경험(UX), 유연한 시각화(칸반, 타임라인), 그리고 뛰어난 실시간성(Real-time Collaboration)을 앞세워 IT, 마케팅, 일반 사무 관리 영역을 빠르게 장악했다.3 Smartsheet는 엑셀과 유사한 친숙한 스프레드시트 인터페이스를, Monday.com은 시각적인 보드 형태를 제공하며 진입 장벽을 낮췄다. 그러나 이들 도구는 본질적으로 '커뮤니케이션'과 '태스크 추적'에 최적화되어 있을 뿐, 엄밀한 의미의 '프로젝트 엔지니어링' 도구로서는 한계를 가진다. 대부분의 웹 기반 도구는 단순한 종료-시작(Finish-to-Start) 의존성만을 지원하거나, 복잡한 래그(Lag)/리드(Lead) 타임 계산, 다중 자원 제약 하에서의 자동 스케줄링, 그리고 수천 단계의 계층 구조를 가진 WBS(Work Breakdown Structure) 처리 시 심각한 성능 저하를 겪는다.4

본 연구 보고서는 이 두 세계의 간극을 메우는 것을 목표로 한다. 즉, MS Project가 가진 강력한 분석적 엄밀성과 알고리즘적 깊이를 유지하면서도, 현대적인 웹 기술 스택(React, Microservices, CRDTs 등)을 활용하여 Monday.com 수준의 사용자 경험과 실시간 협업을 제공하는 '하이브리드형 고성능 웹 PM 도구'의 개발 방안을 제시한다. 이를 위해 15,000 단어 분량에 걸쳐 기능 요구사항, 시스템 아키텍처, 데이터베이스 설계, 핵심 알고리즘, 그리고 프론트엔드 최적화 전략을 심층적으로 분석한다.

---

## **2\. 시장 분석 및 기술적 벤치마킹**

최적의 솔루션을 설계하기 위해서는 현존하는 시장 리더들의 기술적 장단점을 면밀히 해부하여, 기술적 스위트 스팟(Technical Sweet Spot)을 식별해야 한다.

### **2.1 주요 경쟁 도구의 기술적 특성 비교**

기존 도구들은 '통제(Control)'와 '협업(Collaboration)'이라는 두 가지 축 사이에서 상반된 포지셔닝을 취하고 있다.

| 기능 범주 | Microsoft Project (Desktop/Online) | Smartsheet | Monday.com | Wrike | 목표 시스템 (Target System) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **스케줄링 엔진** | **최상** (CPM, 4가지 의존성, 제약조건, 달력) | **중** (기본 의존성 중심, 수식 기반) | **중하** (시각적 타임라인 위주) | **중** (Gantt 중심이나 로직 단순) | **최상** (MS Project 수준의 CPM \+ 제약조건) |
| **자원 평준화** | **알고리즘 기반** (자동 평준화, 분할 지원) | 수동 / 기본 알림 | 수동 할당 | 수동 / 기본 워크로드 뷰 | **알고리즘 기반** (Burgess, Min-Moment 구현) |
| **데이터 구조** | **계층형** (깊은 WBS 지원, 요약 작업 자동화) | **플랫형** (스프레드시트 메타포, 들여쓰기 흉내) | **아이템형** (그룹/아이템 구조, 깊은 계층 불가) | **폴더형** (폴더/태스크 구조) | **심층 계층형** (Closure Table 기반 무한 깊이) |
| **확장성(Scalability)** | **대용량** (데스크톱 기준 수십만 건) | **소/중규모** (브라우저 돔 한계, 시트당 행 제한) | **중규모** (데이터 많을 시 UI 렌더링 지연) | **중규모** | **대용량** (가상화 및 스트리밍 기술로 5만+ 태스크) |
| **협업 방식** | **체크인/아웃** (파일 잠금 방식, 동시 편집 불가) | **행 잠금** (제한적 동시성) | **실시간** (웹소켓 기반, 필드 단위 업데이트) | **실시간** | **실시간 동시 편집** (CRDT/Yjs 기반 충돌 없는 병합) |
| **커스터마이징** | VBA/Macros (강력하나 보안 취약) | 수식/API | 위젯/Low-code | API/Wrike Integrate | **마이크로서비스/Webhooks/플러그인 아키텍처** |

1

전략적 시사점:  
MS Project의 건설 및 엔지니어링 산업 내 독점적 지위는 "시작-시작(SS) \+ 3일 지연"과 같은 복잡한 공정 논리를 처리할 수 있는 능력에서 기인한다.1 그러나 Project Online으로의 전환 과정에서도 레거시 아키텍처의 잔재로 인해 현대적인 SaaS가 제공하는 부드러운 협업 경험을 제공하지 못하고 있다. 반면 Smartsheet는 스프레드시트라는 익숙한 메타포로 성공했으나, 본질적으로 '표' 기반이므로 WBS의 부모-자식 간 데이터 롤업(Roll-up)이나 복잡한 자원 배분 로직을 구현하는 데 한계가 있다. Monday.com은 뛰어난 UI를 자랑하지만, 데이터셋이 커질수록 DOM 조작 비용이 증가하여 렌더링 성능이 급격히 저하되는 문제가 보고된다.4  
따라서, 성공적인 개발을 위해서는 **서버 사이드 스케줄링 엔진**을 통해 MS Project 수준의 연산 능력을 확보하고, **클라이언트 사이드 반응형 아키텍처**를 통해 Monday.com 수준의 UX를 구현하는 이원화된 전략이 필요하다.

---

## **3\. 핵심 기능 요구사항 정의 (Functional Requirements)**

'MS Project와 유사한'이라는 모호한 요구사항을 구체적인 기능 명세로 변환하기 위해, 프로젝트 관리 지식 체계(PMBOK)와 엔터프라이즈 환경의 요구사항을 기반으로 필수 기능을 정의한다.

### **3.1 작업 분류 체계 (WBS) 및 데이터 구조**

가장 기초가 되는 기능은 프로젝트의 범위를 관리 가능한 단위로 분해하는 WBS의 구현이다.7

* **무한 계층 구조 (Infinite Hierarchy):** 사용자는 태스크를 무한히 하위로 들여쓰기(Indent)할 수 있어야 하며, 시스템은 이를 시각적으로 트리 구조로 표현해야 한다.  
* **요약 작업 (Summary Tasks):** 하위 태스크(Child Tasks)가 생성되면 상위 태스크는 자동으로 '요약 작업'으로 변환되어야 한다. 요약 작업의 기간(Duration), 시작일, 종료일, 완료율(% Complete), 비용 등은 하위 태스크들의 데이터를 기반으로 자동 집계(Roll-up)되어야 한다. 사용자가 요약 작업의 날짜를 강제로 수정하려 할 경우, 스케줄링 모드(수동/자동)에 따라 하위 태스크에 영향을 주거나 경고를 표시해야 한다.9  
* **WBS 코드 자동 생성:** 1, 1.1, 1.1.1, 1.1.2 등 계층 구조가 변경될 때마다 WBS 코드가 자동으로 재계산되어야 한다.

### **3.2 고급 스케줄링 및 의존성 관리**

단순한 간트 차트 그리기 도구를 넘어선 '스케줄링 엔진'이 되기 위한 핵심 요건이다.

* **4가지 의존성 유형 지원:**  
  1. **Finish-to-Start (FS):** 선행 작업이 끝나야 후행 작업이 시작된다. (가장 일반적)  
  2. **Start-to-Start (SS):** 선행 작업이 시작되면 후행 작업도 시작할 수 있다. (예: 터 파기 시작과 동시에 배관 준비 시작)  
  3. **Finish-to-Finish (FF):** 선행 작업이 끝나야 후행 작업도 끝날 수 있다. (예: 문서 작성이 끝나야 문서 검토도 끝남)  
  4. **Start-to-Finish (SF):** 선행 작업이 시작되어야 후행 작업이 끝날 수 있다. (드물지만 교대 근무 스케줄링 등에 필요)  
* **래그(Lag) 및 리드(Lead) 타임:** 의존 관계에 시간적 완충(Lag, \+3일)이나 중첩(Lead, \-2일)을 적용할 수 있어야 한다. 이는 정교한 공정 계획 수립에 필수적이다.  
* **제약 조건 (Constraints):** CPM 논리를 오버라이드할 수 있는 제약 조건을 지원해야 한다.10  
  * *유연한 제약:* 가능한 한 빨리(ASAP), 가능한 한 늦게(ALAP).  
  * *반-유연한 제약:* 지정일보다 빠르지 않게 시작(SNET), 지정일보다 늦지 않게 완료(FNLT).  
  * *엄격한 제약:* 반드시 지정일에 시작(MSO), 반드시 지정일에 완료(MFO). 이 제약 조건은 일정 충돌 시 의존성보다 우선순위를 가질 수 있다.

### **3.3 자원 관리 및 평준화 (Resource Management)**

* **자원 풀 (Resource Pool):** 프로젝트 간 공유 가능한 자원(인력, 장비, 재료) 데이터베이스를 구축해야 한다.  
* **할당 단위 (Assignment Units):** 한 작업에 자원을 50%, 100%, 혹은 200%(2명 투입) 등으로 할당할 수 있어야 한다.  
* **자원 달력 (Resource Calendars):** 프로젝트 표준 달력 외에 자원별 휴가, 근무 시간 예외 사항을 반영하여 스케줄을 계산해야 한다.  
* **자원 평준화 (Resource Leveling):** 특정 기간에 자원 요구량이 가용량을 초과할 경우(Over-allocation), 여유 시간(Float)을 활용하여 작업을 지연시키거나 분할하여 자원 부하를 평탄화하는 알고리즘을 내장해야 한다.11

### **3.4 실시간 협업 및 동시성**

* **동시 편집 (Co-authoring):** 구글 닥스(Google Docs)와 같이 여러 사용자가 동시에 간트 차트의 다른 부분을 수정할 수 있어야 하며, 변경 사항은 밀리초 단위로 동기화되어야 한다.  
* **필드 레벨 잠금 및 프레즌스 (Presence):** 특정 사용자가 편집 중인 셀이나 태스크에는 시각적 표시(Avatar)를 하여 충돌을 방지해야 한다.  
* **알림 시스템:** 임계 경로(Critical Path) 변경, 마일스톤 지연 등 중요 이벤트 발생 시 실시간 푸시 알림을 제공해야 한다.

---

## **4\. 시스템 아키텍처 설계 (System Architecture)**

대용량 데이터(태스크 10,000개 이상)를 처리하면서도 실시간성을 보장하기 위해서는 고도로 최적화된 아키텍처가 요구된다. 일반적인 CRUD 웹 애플리케이션 구조로는 스케줄링 엔진의 연산 부하를 감당할 수 없다.

### **4.1 하이레벨 아키텍처: 모듈러 모놀리스와 마이크로서비스의 조화**

복잡한 상태 관리가 필요한 스케줄링 엔진의 특성상, 핵심 비즈니스 로직은 **모듈러 모놀리스(Modular Monolith)** 형태로 구성하여 분산 트랜잭션의 오버헤드를 줄이고 데이터 일관성을 보장하는 것이 유리하다. 반면, 알림, 인증, 리포팅 등 주변 기능은 \*\*마이크로서비스(Microservices)\*\*로 분리하여 확장성을 확보한다.13

**제안 기술 스택:**

* **Frontend:** React.js (컴포넌트 재사용성 및 가상 DOM 성능 활용).6  
* **State Management:** 클라이언트 로컬 상태는 Redux Toolkit 또는 Recoil, 협업 상태 동기화는 Yjs.15  
* **Backend (API & Engine):** Node.js (I/O 집약적 작업) 또는 Go/Rust (CPU 집약적 스케줄링 알고리즘). 특히 CPM 계산과 자원 평준화는 연산 비용이 높으므로 Rust나 Go로 작성된 별도 모듈이나 WASM(WebAssembly) 활용을 고려한다.  
* **Database:** PostgreSQL (관계형 데이터 및 JSONB) \+ Redis (캐싱 및 Pub/Sub).  
* **Infrastructure:** Docker 컨테이너화 및 Kubernetes 오케스트레이션.14

### **4.2 3계층(Three-Tier) 아키텍처의 고도화 구현**

전통적인 3계층 구조를 웹 기반 PM 도구의 특성에 맞게 고도화해야 한다.13

1. **프레젠테이션 계층 (Presentation Tier \- Client):**  
   * 단순한 뷰어가 아닌, 'Thick Client'로서 동작해야 한다. 사용자가 드래그 앤 드롭으로 태스크를 이동할 때, 서버 왕복 없이 클라이언트 사이드에서 즉각적인 반응(Optimistic UI)을 보여주어야 한다.  
   * **가상화 (Virtualization):** 5,000개 이상의 태스크를 렌더링할 때 브라우저의 DOM 노드 수가 폭증하여 메모리 누수와 스크롤 버벅임이 발생한다. react-window나 react-virtualized와 같은 윈도잉(Windowing) 기술을 적용하여 뷰포트에 보이는 50\~100개의 행만 DOM에 렌더링하고, 나머지는 스크롤 위치에 따라 동적으로 교체해야 한다.6  
2. **애플리케이션 계층 (Application Tier \- Server):**  
   * API 게이트웨이를 통해 요청을 라우팅한다.  
   * **스케줄링 워커 (Scheduling Worker):** 사용자의 변경 사항(예: 태스크 A의 기간 2일 연장)이 발생하면, 이를 큐(Kafka/RabbitMQ)에 넣고, 비동기 워커가 전체 프로젝트의 날짜와 임계 경로를 재계산한다. 계산이 완료되면 WebSocket을 통해 클라이언트에 변경된 날짜들을 브로드캐스트한다.18  
3. **데이터 계층 (Data Tier \- Persistence):**  
   * PostgreSQL을 메인 저장소로 사용하되, 실시간 협업을 위한 임시 상태 저장은 Redis를 활용한다.  
   * 읽기 성능 최적화를 위해 읽기 전용 복제본(Read Replica)을 구성하고, CQRS(Command Query Responsibility Segregation) 패턴을 도입하여 쓰기 모델(복잡한 정규화)과 읽기 모델(조회 전용 비정규화 테이블)을 분리하는 것을 고려한다.20

### **4.3 데이터베이스 스키마 설계: 계층형 데이터의 효율적 처리**

WBS와 같은 깊은 트리 구조를 관계형 데이터베이스에 저장하는 것은 고전적인 난제이다. 단순한 parent\_id 방식(Adjacency List)은 특정 태스크의 모든 하위 자손을 조회하거나(서브트리 조회), 전체 깊이를 계산할 때 재귀 쿼리(Recursive CTE)를 사용해야 하므로 성능상 불리하다.21

권장 방안: 클로저 테이블 (Closure Table) 패턴  
읽기 작업(서브트리 조회, 경로 탐색)이 빈번하고 쓰기 작업(태스크 이동)이 상대적으로 적은 PM 도구의 특성상, 클로저 테이블 패턴이 가장 우수한 성능을 제공한다.23  
**Schema Design Example:**

**Table 1: tasks (엔티티 저장)**

| Column | Type | Description |
| :---- | :---- | :---- |
| id | UUID | Primary Key |
| project\_id | UUID | Foreign Key, 인덱스 |
| name | VARCHAR | 태스크 명 |
| duration | INT | 기간 (분 단위) |
| start\_date | TIMESTAMP | 시작일 |
| finish\_date | TIMESTAMP | 종료일 |

**Table 2: task\_hierarchy (관계 저장 \- Closure Table)**

| Column | Type | Description |
| :---- | :---- | :---- |
| ancestor\_id | UUID | FK to tasks.id (상위/조상) |
| descendant\_id | UUID | FK to tasks.id (하위/자손) |
| depth | INT | 조상과 자손 간의 거리 (0=자기자신) |

**쿼리 효율성 분석:**

* **서브트리 조회:** SELECT \* FROM task\_hierarchy WHERE ancestor\_id \= 쿼리 하나로 해당 요약 작업에 포함된 모든 하위 태스크를 한 번에 가져올 수 있다. 이는 WBS 롤업 계산(하위 태스크 비용 합산 등) 시 매우 강력한 성능을 발휘한다.26  
* **경로 조회:** 특정 태스크의 전체 경로(예: 프로젝트 \> 1단계 \> 2단계 \> 태스크 A)를 조회하기도 용이하다.  
* **단점 및 해결:** 태스크를 다른 상위 작업으로 이동(Move)할 때 다수의 행을 삭제하고 다시 삽입해야 하는 오버헤드가 있으나, 이는 트랜잭션 내에서 처리 가능하며 읽기 성능의 이점이 이를 상쇄한다.27

---

## **5\. 알고리즘 코어: 스케줄링 및 평준화 (Algorithmic Core)**

단순한 '할 일 목록' 앱과 전문 PM 소프트웨어를 가르는 기준은 바로 알고리즘 엔진의 유무이다.

### **5.1 임계 경로법 (CPM) 구현 상세**

CPM은 프로젝트의 최단 완료 시간을 결정하고, 각 태스크의 여유 시간(Float/Slack)을 계산하는 핵심 알고리즘이다.2 시스템은 다음의 4단계 프로세스를 구현해야 한다.

1. **위상 정렬 (Topological Sort) 및 순환 감지:**  
   * 태스크 간의 의존성 그래프(Directed Acyclic Graph, DAG)를 구성하고 위상 정렬을 수행하여 계산 순서를 선형화한다.  
   * 이 과정에서 순환 참조(Cycle, 예: A-\>B-\>C-\>A)가 발견되면 즉시 에러를 반환하고 사용자에게 루프를 끊도록 안내해야 한다.  
2. **전진 계산 (Forward Pass \- Early Dates):**  
   * 프로젝트 시작일로부터 출발하여 각 태스크의 가장 빠른 시작일(Early Start, ES)과 가장 빠른 종료일(Early Finish, EF)을 계산한다.  
   * $$ES\_{task} \= \\max(EF\_{predecessor} \+ Lag)$$  
     (모든 선행 작업 중 가장 늦게 끝나는 시점을 기준)  
   * $$EF\_{task} \= ES\_{task} \+ Duration$$  
3. **후진 계산 (Backward Pass \- Late Dates):**  
   * 프로젝트 종료일(또는 마지막 태스크의 EF)로부터 역순으로 계산하여 가장 늦은 종료일(Late Finish, LF)과 가장 늦은 시작일(Late Start, LS)을 도출한다.  
   * $$LF\_{task} \= \\min(LS\_{successor} \- Lag)$$  
     (모든 후행 작업이 제때 시작하기 위해 늦어도 끝나야 하는 시점)  
   * $$LS\_{task} \= LF\_{task} \- Duration$$  
4. **여유 시간(Float) 및 임계 경로 도출:**  
   * **총 여유 시간 (Total Float):**  
     $$TF \= LS \- ES$$  
     또는  
     $$LF \- EF$$  
     . 이 값이 0인 태스크들의 집합이 바로 \*\*임계 경로(Critical Path)\*\*이며, 간트 차트에서 붉은색으로 강조되어야 한다.  
   * **자유 여유 시간 (Free Float):** 후행 작업의 ES에 영향을 주지 않고 지연될 수 있는 시간.  
     $$FF \= \\min(ES\_{successor}) \- EF\_{task}$$  
     .

**구현 시 고려사항:** 웹 환경에서는 계산의 반응성을 높이기 위해 클라이언트(브라우저) 측에서 Web Worker를 이용해 1차적으로 계산하여 UI에 반영하고, 서버 측에서 최종적으로 검증하여 저장하는 하이브리드 방식을 권장한다.

### **5.2 자원 평준화 알고리즘 (Resource Leveling Heuristics)**

자원 평준화는 자원 제약 하에서 프로젝트 일정을 최적화하는 문제(RCPSP)로, NP-Hard 문제에 속한다. 따라서 최적해를 구하는 것은 계산 비용이 너무 크므로, 휴리스틱(Heuristic) 방법을 사용한다.10

선정 알고리즘: Burgess Method  
Burgess 방식은 각 시간 단위별 자원 사용량의 제곱의 합(Sum of Squares)을 최소화하는 것을 목표로 한다. 이는 자원 사용 그래프를 가장 평평하게(Smoothing) 만드는 효과가 있다.31  
**알고리즘 로직 (Pseudocode Steps):**

1. **초기화:** 모든 태스크를 ES(가장 빠른 시작일) 기준으로 배치하고, 시간 $t$별 자원 요구량 $R\_t$를 계산한다.  
2. **평가 지표 계산:** 현재 스케줄의 모멘트  
   $$M \= \\sum\_{t=1}^{T} (R\_t)^2$$  
   를 계산한다.  
3. **반복 최적화:** 네트워크의 마지막 태스크부터 역순으로 순회한다.  
   * 대상 태스크를 오른쪽(시간 축 뒤)으로 1단위씩 이동시킨다 (단, 여유 시간(Total Float) 범위 내에서).  
   * 이동 후의 새로운 모멘트 $M'$을 계산한다.  
   * 만약 $M' \< M$ 이면, 이동을 확정하고 $M$을 $M'$로 업데이트한다.  
   * 개선되지 않으면 원래 위치로 되돌린다.  
4. **수렴:** 모든 태스크에 대해 더 이상 개선이 없을 때까지 위 과정을 반복한다.

대안: 최소 모멘트 법 (Minimum Moment Method)  
자원 사용량에 시간 가중치를 곱한 모멘트를 최소화하는 방식으로, 자원을 프로젝트의 중앙으로 집중시키는 경향이 있다.33 구현이 다소 복잡하나 Burgess보다 수렴 속도가 빠를 수 있다. MVP 단계에서는 Burgess 방식을 우선 구현하고, 추후 고도화 단계에서 옵션으로 제공하는 것이 좋다.

---

## **6\. 프론트엔드 전략: 간트 차트 컴포넌트**

시각적인 간트 차트는 사용자가 시스템과 상호작용하는 핵심 인터페이스이다. 이를 직접 개발할지(Build), 상용 라이브러리를 구매할지(Buy) 결정하는 것은 프로젝트의 성패를 가르는 중요한 의사결정이다.

### **6.1 Build vs. Buy 분석**

**옵션 A: DHTMLX Gantt**

* **특징:** 업계 표준에 가까운 라이브러리로, 30,000개 이상의 태스크를 처리할 수 있는 강력한 렌더링 성능을 보유하고 있다. 임계 경로, 자원 도표, 자동 스케줄링 기능을 내장하고 있다.35  
* **장점:** 검증된 안정성, 풍부한 기능.  
* **단점:** DOM 기반 렌더링으로 메모리 사용량이 높을 수 있으며, React와의 통합 시 래퍼(Wrapper)를 사용해야 하는 등 개발 경험(DX)이 다소 떨어질 수 있다.

**옵션 B: Bryntum Gantt**

* **특징:** 최신 웹 기술(ES6+, SASS)로 개발되었으며, React, Vue, Angular와 완벽하게 통합된다. 특히 스케줄러(Scheduler) 엔진과 간트 엔진이 분리되어 있어 확장에 용이하다. 'Virtual Rendering' 기술을 핵심으로 사용하여 스크롤 성능이 매우 뛰어나다.38  
* **장점:** 최고의 성능과 모던한 UI/UX, React 친화적 API.  
* **단점:** 높은 라이선스 비용.

**옵션 C: 자체 개발 (Custom Implementation)**

* **특징:** vis-timeline이나 SVG/Canvas를 활용해 직접 개발.  
* **평가:** 의존성 선 연결(Routing), 드래그 앤 드롭 스냅(Snapping), 줌 레벨 조정, 타임스케일 렌더링 등 기본 기능 구현에만 수천 시간이 소요될 수 있다. 핵심 비즈니스 로직(스케줄링 엔진) 개발에 집중하기 위해 **상용 라이브러리 사용을 강력히 권장**한다.

**권장 사항:** **Bryntum Gantt**가 기술적 요구사항(React 통합, 고성능, 커스터마이징)에 가장 부합한다.40 예산 제약이 있다면 DHTMLX가 합리적인 대안이다.

### **6.2 대용량 데이터 처리를 위한 프론트엔드 최적화 (Big Data UX)**

5,000개 이상의 태스크를 브라우저 렉(Lag) 없이 처리하기 위한 필수 기술:

1. **수직 가상화 (Vertical Virtualization):** 전체 태스크가 10,000개라 하더라도, 사용자의 화면(뷰포트)에 보이는 것은 30\~50개뿐이다. 스크롤 이벤트에 맞춰 현재 보이는 영역의 데이터만 DOM에 렌더링하고, 벗어난 영역은 DOM에서 제거하거나 재사용하는 기법을 사용해야 한다.6  
2. **수평 가상화 (Horizontal Virtualization):** 타임스케일(날짜 축) 또한 프로젝트 기간이 5년이라면 매우 길어진다. 현재 보고 있는 날짜 구간(Time span)만 렌더링해야 한다.  
3. **GPU 가속:** 간트 바(Bar)의 이동이나 리사이징 시 top, left 속성 대신 transform: translate3d()를 사용하여 레이아웃 리플로우(Reflow)를 방지하고 GPU 합성을 유도해야 한다.

---

## **7\. 실시간 협업 및 데이터 일관성 (Real-Time Collaboration)**

'MS Project의 웹 버전'을 표방한다면 구글 닥스 수준의 동시 편집 경험은 필수 차별화 요소이다.41

### **7.1 갈등 해결 전략: OT vs. CRDT**

여러 사용자가 동시에 같은 태스크를 수정할 때 충돌(Conflict)을 어떻게 해결할 것인가?

* **운영 변환 (Operational Transformation, OT):** 구글 닥스가 사용하는 방식. 중앙 서버가 모든 연산을 받아 순서를 정렬하고 변환하여 클라이언트에 내려준다. 텍스트 편집에는 적합하나, 간트 차트와 같은 복잡한 데이터 구조(트리+의존성)에서는 구현 난이도가 극도로 높다.41  
* **충돌 없는 복제 데이터 타입 (CRDTs):** 각 클라이언트가 변경 사항을 독립적으로 적용하고, 네트워크가 연결되었을 때 수학적으로 증명된 병합 로직을 통해 모든 클라이언트가 동일한 상태(Eventual Consistency)에 도달하도록 한다.42

권장 기술: Yjs (CRDT 라이브러리)  
Yjs는 공유 데이터 유형(SharedMap, SharedArray)을 제공하는 고성능 CRDT 라이브러리이다.

* **구현 방안:** Redux 스토어 또는 React 상태를 Yjs의 Y.Map(태스크 속성) 및 Y.Array(태스크 목록)와 바인딩한다.  
* **네트워크:** y-websocket을 사용하여 중앙 중계 서버를 통해 클라이언트 간 변경 사항(Delta)을 실시간으로 교환한다.  
* **오프라인 지원:** CRDT의 특성상 오프라인 상태에서 작업 후 온라인 전환 시 충돌 없이 자동 병합이 가능하다. 이는 현장 인터넷이 불안정한 건설 프로젝트 관리 시 매우 큰 장점이 된다.15

### **7.2 통신 아키텍처**

* **WebSocket 서버:** Node.js 기반의 경량 서버를 구축하여 클라이언트 간의 메시지 브로커 역할을 수행한다.  
* **Pub/Sub 시스템:** 서버가 여러 대(스케일 아웃)일 경우, Redis Pub/Sub을 도입하여 서버 A에 연결된 사용자의 변경 사항이 서버 B에 연결된 사용자에게도 전달되도록 구성해야 한다.6

---

## **8\. 보안 및 엔터프라이즈 컴플라이언스 (Security & Compliance)**

기업 고객을 위해서는 단순한 기능을 넘어선 보안 통제 장치가 필요하다.

### **8.1 역할 기반 접근 제어 (RBAC)**

단순한 관리자/사용자 구분을 넘어선 세밀한 권한 관리가 필요하다.46

* **계층형 RBAC 모델 (Hierarchical RBAC):** 상위 역할은 하위 역할의 권한을 상속받는다.  
* **권한 세분화:**  
  * *Viewer:* 프로젝트 조회만 가능.  
  * *Task Updater:* 자신에게 할당된 태스크의 '진척률(% Complete)'과 '메모'만 수정 가능 (가장 많은 사용자).  
  * *Planner:* 태스크 생성, 의존성 연결, 일정 변경 가능.  
  * *Resource Manager:* 자원 단가 및 가용성 수정 가능.  
  * *Admin:* 프로젝트 설정 및 권한 관리.  
* **구현:** API 게이트웨이 레벨(Middleware)에서 JWT 토큰 내의 Role을 검사하여 1차 차단하고, 비즈니스 로직 내에서 리소스별 소유권을 검사하는 2중 방어 체계를 구축한다.

### **8.2 감사 로그 (Audit Logging)**

누가, 언제, 무엇을 변경했는지에 대한 완벽한 추적성이 요구된다.

* **이벤트 소싱(Event Sourcing) 패턴 활용:** 모든 데이터 변경을 '이벤트' 형태로 기록한다 (예: TaskRescheduled, ResourceReassigned).  
* **저장소:** 로그 데이터는 수정 불가능한(Append-only) 저장소에 보관해야 한다. 검색과 분석을 위해 Elasticsearch나 AWS CloudWatch Logs 등으로 비동기 전송하는 파이프라인(예: Logstash, Fluentd)을 구축한다.49 로그에는 반드시 User\_ID, Timestamp, Previous\_Value, New\_Value, Request\_ID가 포함되어야 한다.51

---

## **9\. 개발 로드맵: MVP에서 엔터프라이즈까지**

MS Project의 방대한 기능을 한 번에 구현하는 것은 불가능하다. 단계적 개발 전략이 필요하다.

### **단계 1: MVP \- 핵심 골격 완성 (개발 기간: 3\~4개월)**

52

* **목표:** 단일 사용자(Single-player)가 프로젝트 일정을 수립하고 저장할 수 있는 수준.  
* **주요 기능:**  
  * 계층형 WBS 데이터베이스 구현 (Closure Table).  
  * 기본 간트 차트 시각화 (Bryntum Gantt 도입).  
  * 기본 CPM 알고리즘 (FS 의존성만 지원, 순방향/역방향 계산).  
  * 태스크 CRUD 및 기본 프로젝트 저장/불러오기.  
* **기술 검증:** 대용량 데이터(태스크 1,000개) 렌더링 성능 검증.

### **단계 2: 협업 및 고급 로직 (개발 기간: 4\~6개월)**

* **목표:** 팀 단위 사용 및 실시간 협업 지원.  
* **주요 기능:**  
  * Yjs 기반 실시간 동기화 및 프레즌스 구현.  
  * 4가지 의존성 유형(SS, FF, SF) 및 Lag/Lead 지원.  
  * RBAC(권한 관리) 시스템 적용.  
  * 자원 할당 기능 (평준화 제외).

### **단계 3: 엔터프라이즈 엔진 (개발 기간: 6개월+)**

* **목표:** MS Project 대체 가능 수준의 고도화.  
* **주요 기능:**  
  * Burgess 자원 평준화 알고리즘 탑재.  
  * 베이스라인(Baseline) 관리 및 편차 분석(Variance Analysis).  
  * 고급 리포팅 (S-Curve, EVM).  
  * 외부 시스템 연동 (Jira, Slack, SAP).

---

## **10\. 결론**

본 보고서에서 제안하는 시스템은 단순한 '웹 기반 태스크 관리 도구'가 아니다. 이는 **MS Project의 강력한 스케줄링 엔진**을 마이크로서비스와 Web Assembly 기술로 복원하고, 이를 **React와 CRDT 기반의 반응형 인터페이스**로 감싼 차세대 엔터프라이즈 솔루션이다.

**Closure Table**을 통한 효율적인 WBS 데이터 관리, **CPM 및 Burgess 알고리즘**을 통한 과학적인 공정 관리, **가상화 렌더링**을 통한 대용량 처리 성능, 그리고 **Yjs**를 활용한 실시간 협업 환경의 구축은 기존 시장의 양분된 니즈를 통합하는 핵심 열쇠가 될 것이다. 이러한 기술적 접근은 프로젝트 관리의 정밀성과 협업의 민첩성을 동시에 달성하게 하여, 궁극적으로 조직의 프로젝트 성공률을 획기적으로 높이는 데 기여할 것이다.

#### **참고 자료**

1. Compare Microsoft Project vs Smartsheet vs monday.com \- Crozdesk, 11월 26, 2025에 액세스, [https://crozdesk.com/compare/microsoft-project-vs-monday-vs-smartsheet](https://crozdesk.com/compare/microsoft-project-vs-monday-vs-smartsheet)  
2. Critical path method \- Wikipedia, 11월 26, 2025에 액세스, [https://en.wikipedia.org/wiki/Critical\_path\_method](https://en.wikipedia.org/wiki/Critical_path_method)  
3. Smartsheet Vs Wrike: Comparison & Reviews For 2025 \- The Digital Project Manager, 11월 26, 2025에 액세스, [https://thedigitalprojectmanager.com/tools/smartsheet-vs-wrike/](https://thedigitalprojectmanager.com/tools/smartsheet-vs-wrike/)  
4. Smartsheet vs monday.com \- Price and Features Comparison \- Tech.co, 11월 26, 2025에 액세스, [https://tech.co/project-management-software/smartsheet-vs-monday](https://tech.co/project-management-software/smartsheet-vs-monday)  
5. Compare The Best Project Management Software for 2025 \- SelectSoftware Reviews, 11월 26, 2025에 액세스, [https://www.selectsoftwarereviews.com/buyer-guide/project-management-software](https://www.selectsoftwarereviews.com/buyer-guide/project-management-software)  
6. Design — Performant Web Application with Large Dataset : r/ExperiencedDevs \- Reddit, 11월 26, 2025에 액세스, [https://www.reddit.com/r/ExperiencedDevs/comments/u4bm9k/design\_performant\_web\_application\_with\_large/](https://www.reddit.com/r/ExperiencedDevs/comments/u4bm9k/design_performant_web_application_with_large/)  
7. What is a Work Breakdown Structure (WBS) | Project Management, 11월 26, 2025에 액세스, [https://www.workbreakdownstructure.com/](https://www.workbreakdownstructure.com/)  
8. Work Breakdown Structure (WBS) Guide \- Project Manager, 11월 26, 2025에 액세스, [https://www.projectmanager.com/guides/work-breakdown-structure](https://www.projectmanager.com/guides/work-breakdown-structure)  
9. How to use a work breakdown structure (WBS) \- Adobe for Business, 11월 26, 2025에 액세스, [https://business.adobe.com/blog/basics/what-is-work-breakdown-structure](https://business.adobe.com/blog/basics/what-is-work-breakdown-structure)  
10. A Heuristic Algorithm for Resource Leveling in Multi-Project, Multi-Resource Scheduling, 11월 26, 2025에 액세스, [https://www.researchgate.net/publication/229765919\_A\_Heuristic\_Algorithm\_for\_Resource\_Leveling\_in\_Multi-Project\_Multi-Resource\_Scheduling](https://www.researchgate.net/publication/229765919_A_Heuristic_Algorithm_for_Resource_Leveling_in_Multi-Project_Multi-Resource_Scheduling)  
11. A guide to the fundamentals of resource leveling \- Work Life by Atlassian, 11월 26, 2025에 액세스, [https://www.atlassian.com/blog/add-ons/resource-leveling-guide](https://www.atlassian.com/blog/add-ons/resource-leveling-guide)  
12. What is Resource Leveling? (Techniques and Examples) \[2025\] \- Asana, 11월 26, 2025에 액세스, [https://asana.com/resources/resource-leveling](https://asana.com/resources/resource-leveling)  
13. What Is Three-Tier Architecture? | IBM, 11월 26, 2025에 액세스, [https://www.ibm.com/think/topics/three-tier-architecture](https://www.ibm.com/think/topics/three-tier-architecture)  
14. Web Application Architecture: Choosing the Best for Your Product \- MobiDev, 11월 26, 2025에 액세스, [https://mobidev.biz/blog/web-application-architecture-types](https://mobidev.biz/blog/web-application-architecture-types)  
15. Building REAL-TIME collaborative diagrams with React Flow, Yjs, and HocusPocus \[Part 1/2\] \- YouTube, 11월 26, 2025에 액세스, [https://m.youtube.com/watch?v=aiqVTRPhudc](https://m.youtube.com/watch?v=aiqVTRPhudc)  
16. Collaborative \- React Flow, 11월 26, 2025에 액세스, [https://reactflow.dev/examples/interaction/collaborative](https://reactflow.dev/examples/interaction/collaborative)  
17. React Gantt Chart | Quick & Easy Task Scheduling \- Syncfusion, 11월 26, 2025에 액세스, [https://www.syncfusion.com/react-components/react-gantt-chart](https://www.syncfusion.com/react-components/react-gantt-chart)  
18. Design architecture for large file downloads \- DEV Community, 11월 26, 2025에 액세스, [https://dev.to/sridharcr/design-architecture-for-large-file-downloads-1ojn](https://dev.to/sridharcr/design-architecture-for-large-file-downloads-1ojn)  
19. How To Build a Scalable Platform Architecture for Real-Time Data \- The New Stack, 11월 26, 2025에 액세스, [https://thenewstack.io/how-to-build-a-scalable-platform-architecture-for-real-time-data/](https://thenewstack.io/how-to-build-a-scalable-platform-architecture-for-real-time-data/)  
20. Part 2 \- WorldStore: Distributed caching with Reactivity \- The Asana Blog, 11월 26, 2025에 액세스, [https://asana.com/inside-asana/worldstore-distributed-caching-reactivity-part-2](https://asana.com/inside-asana/worldstore-distributed-caching-reactivity-part-2)  
21. Hierarchical Data and How to Query It in SQL? \- GeeksforGeeks, 11월 26, 2025에 액세스, [https://www.geeksforgeeks.org/sql/hierarchical-data-and-how-to-query-it-in-sql/](https://www.geeksforgeeks.org/sql/hierarchical-data-and-how-to-query-it-in-sql/)  
22. Hierarchical Database vs Relational Databases: Differences & Similarities \- Airbyte, 11월 26, 2025에 액세스, [https://airbyte.com/data-engineering-resources/hierarchical-vs-relational-database](https://airbyte.com/data-engineering-resources/hierarchical-vs-relational-database)  
23. The simplest(?) way to do tree-based queries in SQL \- dirtSimple.org, 11월 26, 2025에 액세스, [https://dirtsimple.org/2010/11/simplest-way-to-do-tree-based-queries.html](https://dirtsimple.org/2010/11/simplest-way-to-do-tree-based-queries.html)  
24. Closure Table \- Fueled, 11월 26, 2025에 액세스, [https://fueled.com/blog/closure-table/](https://fueled.com/blog/closure-table/)  
25. Closure Tables in SQL: Master Hierarchical Data in 2025 \- VibePanda, 11월 26, 2025에 액세스, [https://www.vibepanda.io/resources/guide/handling-hierarchical-data-closure-tables-sql](https://www.vibepanda.io/resources/guide/handling-hierarchical-data-closure-tables-sql)  
26. Handling Hierarchical Data with Closure Tables in PostgreSQL | by Yusoof Ali | Medium, 11월 26, 2025에 액세스, [https://medium.com/@yusoofash/handling-hierarchical-data-with-closure-tables-in-postgresql-167aac3a74f2](https://medium.com/@yusoofash/handling-hierarchical-data-with-closure-tables-in-postgresql-167aac3a74f2)  
27. Storing a Tree Structure in a Relational Database Baeldung on SQL, 11월 26, 2025에 액세스, [https://www.baeldung.com/sql/storing-tree-in-rdb](https://www.baeldung.com/sql/storing-tree-in-rdb)  
28. Critical Path Method (CPM) / Christophe Yamahata \- Observable, 11월 26, 2025에 액세스, [https://observablehq.com/@christophe-yamahata/critical-path-method](https://observablehq.com/@christophe-yamahata/critical-path-method)  
29. Critical Path Method Explained: Boost Project Efficiency \- Simplilearn.com, 11월 26, 2025에 액세스, [https://www.simplilearn.com/tutorials/project-management-tutorial/critical-path-method](https://www.simplilearn.com/tutorials/project-management-tutorial/critical-path-method)  
30. ALGORITHMS FOR THE RESOURCE LEVELLING PROBLEM Allen R. Mushi \- DORAS | DCU Research Repository, 11월 26, 2025에 액세스, [https://doras.dcu.ie/19129/1/Allen\_R\_Mushi\_20130620141228.pdf](https://doras.dcu.ie/19129/1/Allen_R_Mushi_20130620141228.pdf)  
31. Resources loading, leveling and crashing \- DTU \- ProjectLab, 11월 26, 2025에 액세스, [http://wiki.doing-projects.org/index.php/Resources\_loading,\_leveling\_and\_crashing](http://wiki.doing-projects.org/index.php/Resources_loading,_leveling_and_crashing)  
32. A Memetic Algorithm for the Solution of the Resource Leveling Problem \- MDPI, 11월 26, 2025에 액세스, [https://www.mdpi.com/2075-5309/13/11/2738](https://www.mdpi.com/2075-5309/13/11/2738)  
33. \#38 Minimum Moment Concept | Project Planning & Control \- YouTube, 11월 26, 2025에 액세스, [https://www.youtube.com/watch?v=yMO9dMX0iCk](https://www.youtube.com/watch?v=yMO9dMX0iCk)  
34. Minimum Moment Method for Resource Leveling Using Entropy Maximization | Journal of Construction Engineering and Management | Vol 136, No 5 \- ASCE Library, 11월 26, 2025에 액세스, [https://ascelibrary.org/doi/abs/10.1061/%28ASCE%29CO.1943-7862.0000149](https://ascelibrary.org/doi/abs/10.1061/%28ASCE%29CO.1943-7862.0000149)  
35. Best JavaScript Gantt Chart Libraries 2025–2026 Guide \- AnyChart, 11월 26, 2025에 액세스, [https://www.anychart.com/blog/2025/11/05/best-javascript-gantt-chart-libraries/](https://www.anychart.com/blog/2025/11/05/best-javascript-gantt-chart-libraries/)  
36. Fast and Light Alternative to Bryntum Gantt \- dhtmlx, 11월 26, 2025에 액세스, [https://dhtmlx.com/blog/alternative-to-bryntum-gantt/](https://dhtmlx.com/blog/alternative-to-bryntum-gantt/)  
37. 5 JavaScript Project Management Libraries to Boost Web Development | HackerNoon, 11월 26, 2025에 액세스, [https://hackernoon.com/5-javascript-project-management-libraries-to-boost-web-development-162c35e4](https://hackernoon.com/5-javascript-project-management-libraries-to-boost-web-development-162c35e4)  
38. The DHTMLX Grid alternative: Why Choose Bryntum Grid, 11월 26, 2025에 액세스, [https://bryntum.com/the-dhtmlx-grid-alternative-why-choose-bryntum-grid/](https://bryntum.com/the-dhtmlx-grid-alternative-why-choose-bryntum-grid/)  
39. The DHTMLX Gantt alternative: Why Choose Bryntum Gantt, 11월 26, 2025에 액세스, [https://bryntum.com/the-dhtmlx-gantt-alternative-why-choose-bryntum-gantt/](https://bryntum.com/the-dhtmlx-gantt-alternative-why-choose-bryntum-gantt/)  
40. Top 5 JavaScript Gantt chart libraries in 2025 \- Bryntum, 11월 26, 2025에 액세스, [https://bryntum.com/blog/top-5-javascript-gantt-chart-libraries/](https://bryntum.com/blog/top-5-javascript-gantt-chart-libraries/)  
41. Differences between OT and CRDT \- Stack Overflow, 11월 26, 2025에 액세스, [https://stackoverflow.com/questions/26694359/differences-between-ot-and-crdt](https://stackoverflow.com/questions/26694359/differences-between-ot-and-crdt)  
42. Building Collaborative Interfaces: Operational Transforms vs. CRDTs \- DEV Community, 11월 26, 2025에 액세스, [https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo](https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo)  
43. Building real-time collaboration applications: OT vs CRDT \- TinyMCE, 11월 26, 2025에 액세스, [https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)  
44. \[1810.02137\] Real Differences between OT and CRDT for Co-Editors \- arXiv, 11월 26, 2025에 액세스, [https://arxiv.org/abs/1810.02137](https://arxiv.org/abs/1810.02137)  
45. Real-time collaboration for multiple users in React Flow projects with Yjs \[EBOOK\], 11월 26, 2025에 액세스, [https://www.synergycodes.com/blog/real-time-collaboration-for-multiple-users-in-react-flow-projects-with-yjs-e-book](https://www.synergycodes.com/blog/real-time-collaboration-for-multiple-users-in-react-flow-projects-with-yjs-e-book)  
46. What Is Role-Based Access Control (RBAC)? \- IBM, 11월 26, 2025에 액세스, [https://www.ibm.com/think/topics/rbac](https://www.ibm.com/think/topics/rbac)  
47. The Definitive Guide to Role-Based Access Control (RBAC) \- StrongDM, 11월 26, 2025에 액세스, [https://www.strongdm.com/rbac](https://www.strongdm.com/rbac)  
48. How Enterprise Software Implements Role-Based Access Control (RBAC) \- Nakisa, 11월 26, 2025에 액세스, [https://nakisa.com/blog/how-enterprise-software-implements-role-based-access-control-rbac/](https://nakisa.com/blog/how-enterprise-software-implements-role-based-access-control-rbac/)  
49. Microservices Logging: Best Practices, Importance & Challenges \- Groundcover, 11월 26, 2025에 액세스, [https://www.groundcover.com/microservices-observability/microservices-logging](https://www.groundcover.com/microservices-observability/microservices-logging)  
50. Pattern: Audit logging \- Microservices.io, 11월 26, 2025에 액세스, [https://microservices.io/patterns/observability/audit-logging.html](https://microservices.io/patterns/observability/audit-logging.html)  
51. Logging in Microservices: 5 Best Practices \- Better Stack, 11월 26, 2025에 액세스, [https://betterstack.com/community/guides/logging/logging-microservices/](https://betterstack.com/community/guides/logging/logging-microservices/)  
52. How to Prioritize and Identify Key Features for Your MVP \- LowCode Agency, 11월 26, 2025에 액세스, [https://www.lowcode.agency/blog/how-to-choose-mvp-features](https://www.lowcode.agency/blog/how-to-choose-mvp-features)  
53. How to Prioritize Features for Your Minimum Viable Product (MVP) \- Net Solutions, 11월 26, 2025에 액세스, [https://www.netsolutions.com/hub/minimum-viable-product/prioritize-features/](https://www.netsolutions.com/hub/minimum-viable-product/prioritize-features/)