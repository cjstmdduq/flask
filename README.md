# 플라스크 (Flask)

> 자사데이터 기반으로 매출·광고·할인 종합분석을 제공하는 웹 계산기 모음. 향후 다양한 계산기가 계속 추가될 예정입니다.

## ⚡ 빠른 실행 명령어 [이거]

```bash
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py
```

### 디렉토리 외부(루트디렉토리) 터미널 실행명령어

'''bash
cd /Users/cjstmdduq/Code/Flask && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py
'''


### 단계별 실행

```bash
# 1. 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 서버 실행 (localhost:5050)
python app.py
```

### 🔄 서버 새로고침

```bash
# 코드 변경 사항 반영하며 다시 실행
pkill -f "python app.py" 2>/dev/null || true
python app.py
```

### ⏹️ 서버 중지
터미널에서 `Ctrl + C`로 서버를 중지하거나 위 새로고침 명령 첫 줄을 단독으로 실행하세요.

### ⚠️ 포트 충돌 해결

```bash
# 5050 포트를 사용하는 프로세스 확인 및 종료 후 다시 실행
lsof -ti:5050 | xargs kill -9
python app.py
```

### 브라우저 접속
- 메인 대시보드: `http://localhost:5050/`
- 매출·광고·할인 분석: `http://localhost:5050/calculator1`

---

## 📊 주요 기능

- 매출·광고·할인 데이터 종합 분석
- 실시간 계산 및 결과 시각화
- 분석 결과 클립보드 복사 및 히스토리 저장
- 사용자 정의 집계기간과 한글 단위 변환 지원

## 분석 모델 요약

- **집계기간**: 기본 14일, 사용자 설정 가능
- **매출정보**: 매출액, 환불금액, 환불비율, 순매출액, 일평균 순매출 계산
- **할인정보**: 총할인액, 실할인액, 실할인률 계산
- **광고정보**: 광고실비, 일평균 광고비, 매출대비 광고비율, 보정광고비율, 적정·일당 광고비 계산

## 사용 방법

1. 집계기간 설정 (기본: 최근 14일)
2. 매출·환불·할인·광고 데이터를 입력
3. "분석 계산" 버튼으로 결과 확인
4. 필요 시 "보고서 추출"로 클립보드 복사

## 입력 데이터 정의

- 매출액, 환불금액, 총할인액, 광고실비, 목표 광고비율(%)

## 📁 프로젝트 구조

```
Flask/
├── app.py
├── data/
│   └── history.json
├── static/
│   ├── css/
│   │   └── calculator.css
│   └── js/
│       └── common.js
├── templates/
│   ├── calculator1.html
│   └── index.html
├── README.md
└── requirements.txt
```

## 🛠 기술 스택

- Flask, Jinja2, Bootstrap 5, Vanilla JS
