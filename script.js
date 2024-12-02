let attendanceData = {}; // 요일별 데이터를 저장할 객체
let selectedDayData = {}; // 현재 선택된 요일 데이터
let todayDate = ""; // 오늘 날짜 저장

// 오늘 날짜를 "MM/DD" 형식으로 가져오기
function getTodayDate() {
    const today = new Date();
    const month = today.getMonth() + 1; // 월 (0부터 시작하므로 +1)
    const day = today.getDate(); // 일
    return `${month}/${day}`;
}

// 엑셀 파일 읽기
function loadExcelFile() {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    if (!file) {
        alert("엑셀 파일을 선택해주세요!");
        return;
    }

    todayDate = getTodayDate(); // 오늘 날짜 설정

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // 월요일부터 목요일까지의 시트를 데이터로 저장
        ['월', '화', '수', '목'].forEach(day => {
            const sheet = workbook.Sheets[day];
            if (sheet) {
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // 다섯 번째 열 이후로 날짜 열을 찾기
                let dateColumnIndex = -1;
                for (let i = 4; i < jsonData[0].length; i++) { // 다섯 번째 열부터 시작
                    if (jsonData[0][i] === todayDate) {
                        dateColumnIndex = i;
                        break;
                    }
                }

                // 날짜 열이 없으면 오늘 날짜를 다섯 번째 열에 추가
                if (dateColumnIndex === -1) {
                    dateColumnIndex = 4; // 다섯 번째 열부터 시작
                    jsonData[0][dateColumnIndex] = todayDate;
                }

                attendanceData[day] = { data: jsonData, dateColumn: dateColumnIndex };
            }
        });

        // 요일 선택 섹션 표시
        document.getElementById('day-select-section').style.display = 'block';
        document.getElementById('file-upload-section').style.display = 'none';
    };
    reader.readAsArrayBuffer(file);
}

// 요일 데이터 로드 및 학번 입력 창 표시
function loadDayData() {
    const day = document.getElementById('day-select').value;
    selectedDayData = attendanceData[day];

    if (selectedDayData && selectedDayData.data.length > 0) {
        document.getElementById('student-input-section').style.display = 'block'; // 학번 입력 창 표시
        document.getElementById('day-select-section').style.display = 'none'; // 요일 선택 섹션 숨김
        document.getElementById('result').textContent = ""; // 이전 결과 초기화
    } else {
        alert(`${day} 명단이 없습니다. 올바른 파일을 선택했는지 확인해주세요.`);
    }
}

// 학번 대조 및 출석 표시
function checkAttendance() {
    const studentId = document.getElementById('student-id').value.trim();
    const result = document.getElementById('result');
    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');

    if (!studentId) {
        alert("학번을 입력해주세요!");
        return;
    }

    // 선택된 요일 데이터에서 날짜 열 인덱스 가져오기
    const dateIndex = selectedDayData.dateColumn;
    let found = false;

    for (let i = 1; i < selectedDayData.data.length; i++) {
        if (selectedDayData.data[i][1] == studentId) { // 두 번째 열이 학번
            selectedDayData.data[i][dateIndex] = "O"; // 다섯 번째 열부터 시작한 날짜 열에 "O" 표시
            found = true;
            break;
        }
    }

    if (found) {
        result.textContent = "승인 완료.";
        result.style.color = "#4caf50"; // 초록색으로 표시
        correctSound.play(); // 성공 효과음 재생
        changeBackgroundColor('success'); // 배경색을 초록색으로 변경
        document.getElementById('download-button').style.display = 'block'; // 다운로드 버튼 표시
    } else {
        result.textContent = "승인 실패.";
        result.style.color = "#f44336"; // 빨간색으로 표시
        wrongSound.play(); // 실패 효과음 재생
        changeBackgroundColor('failure'); // 배경색을 빨간색으로 변경
    }
}
// 배경색을 서서히 변경한 후 원래 색으로 복원하는 함수 수정
function changeBackgroundColor(status) {
    const body = document.body;
    const originalColor = '#ffe6e6'; // 원래 연한 핑크 배경색

    if (status === 'success') {
        body.style.backgroundColor = '#4caf50'; // 초록색
    } else if (status === 'failure') {
        body.style.backgroundColor = '#f44336'; // 빨간색
    }

    // 일정 시간 후 원래 색상으로 복구
    setTimeout(() => {
        body.style.backgroundColor = originalColor;
    }, 1000); // 1초 후 원래 색상으로 복원
}

// 엑셀 파일 다운로드 함수
function downloadExcel() {
    const day = document.getElementById('day-select').value;
    const dateIndex = selectedDayData.dateColumn;

    // 학번이 입력되지 않은 학생의 오늘 날짜 열에 "X" 표시
    for (let i = 1; i < selectedDayData.data.length; i++) {
        if (!selectedDayData.data[i][dateIndex]) { // 출석 체크가 없는 경우
            selectedDayData.data[i][dateIndex] = "X"; // "X"로 표시
        }
    }

    // 엑셀 파일 생성 및 다운로드
    const worksheet = XLSX.utils.aoa_to_sheet(selectedDayData.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, day);

    XLSX.writeFile(workbook, `${day} 출석체크 결과.xlsx`);
}

// 엔터 키로 "확인" 버튼 누르기
document.getElementById('student-id').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        checkAttendance(); // "확인" 함수 호출
    }
});
let attendanceChart; // Chart.js 인스턴스 저장
const goalCounts = { 월: 39, 화: 56, 수: 36, 목: 55 }; // 요일별 목표 인원
let currentAttendance = { 월: 0, 화: 0, 수: 0, 목: 0 }; // 현재 출석 인원 초기화

// 그래프 생성 또는 업데이트 함수
function updateAttendanceChart(day) {
    const ctx = document.getElementById('goalChart').getContext('2d');

    // 그래프가 이미 생성되었으면 업데이트
    if (attendanceChart) {
        attendanceChart.data.datasets[1].data = [currentAttendance[day]];
        attendanceChart.update();
    } else {
        // 새로운 그래프 생성
        attendanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [day + "요일"],
                datasets: [
                    {
                        label: '목표 인원',
                        data: [goalCounts[day]],
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: '현재 출석 인원',
                        data: [currentAttendance[day]],
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    // 통계 섹션과 제목 업데이트
    document.getElementById('attendance-statistics').style.display = 'block';
    document.getElementById('day-title').textContent = `${day}요일 출석 현황`;
}

// 요일 선택에 따라 데이터 로드 및 그래프 업데이트
function loadDayData() {
    const day = document.getElementById('day-select').value;
    selectedDayData = attendanceData[day];

    if (selectedDayData && selectedDayData.data.length > 0) {
        document.getElementById('student-input-section').style.display = 'block';
        document.getElementById('day-select-section').style.display = 'none';
        document.getElementById('result').textContent = "";

        // 선택된 요일의 데이터만 그래프에 반영
        updateAttendanceChart(day);
    } else {
        alert(`${day} 명단이 없습니다. 올바른 파일을 선택했는지 확인해주세요.`);
    }
}

// 학번 입력 및 그래프 업데이트
function checkAttendance() {
    const studentId = document.getElementById('student-id').value.trim();
    const result = document.getElementById('result');
    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');
    const day = document.getElementById('day-select').value;

    if (!studentId) {
        alert("학번을 입력해주세요!");
        return;
    }

    const dateIndex = selectedDayData.dateColumn;
    let found = false;

    for (let i = 1; i < selectedDayData.data.length; i++) {
        if (selectedDayData.data[i][1] == studentId) {
            if (selectedDayData.data[i][dateIndex] !== "O") {
                selectedDayData.data[i][dateIndex] = "O"; // 출석 체크
                currentAttendance[day] += 1; // 현재 출석 인원 증가
                found = true;
            }
            break;
        }
    }

    if (found) {
        result.textContent = "승인 완료.";
        result.style.color = "#4caf50";
        correctSound.play();
        changeBackgroundColor('success');
        document.getElementById('download-button').style.display = 'block';

        // 그래프 업데이트
        updateAttendanceChart(day);
    } else {
        result.textContent = "승인 실패.";
        result.style.color = "#f44336";
        wrongSound.play();
        changeBackgroundColor('failure');
    }
}
