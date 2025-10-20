// 플라스크 대시보드 JavaScript

let salesTrendChart = null;
let adDistributionChart = null;
let ratioTrendChart = null;
let allHistoryData = [];
let filteredData = [];

// 대시보드 초기화
async function initDashboard() {
    try {
        await loadAllHistory();
        calculateStats();
        renderCharts();
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('대시보드 초기화 오류:', error);
        showError('대시보드를 불러오는 중 오류가 발생했습니다.');
    }
}

// 전체 히스토리 데이터 로드
async function loadAllHistory() {
    try {
        const response = await fetch('/api/get_history?module=calculator1');
        const data = await response.json();
        
        if (data.success) {
            allHistoryData = data.data;
            filteredData = [...allHistoryData];
            
            // 날짜순 정렬 (오래된 것부터)
            filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } else {
            console.error('히스토리 로드 실패:', data.message);
        }
    } catch (error) {
        console.error('히스토리 로드 오류:', error);
        throw error;
    }
}

// 통계 계산
function calculateStats() {
    if (filteredData.length === 0) {
        document.getElementById('totalSales').textContent = '₩0';
        document.getElementById('netSales').textContent = '₩0';
        document.getElementById('avgAdRatio').textContent = '0%';
        document.getElementById('totalAnalyses').textContent = '0';
        document.getElementById('salesChange').textContent = '데이터 없음';
        document.getElementById('netSalesChange').textContent = '데이터 없음';
        document.getElementById('adRatioChange').textContent = '데이터 없음';
        document.getElementById('analysesInfo').innerHTML = '<i data-lucide="database" style="width: 14px; height: 14px;"></i> 전체 기간';
        return;
    }
    
    // 총 매출
    const totalSales = filteredData.reduce((sum, record) => sum + record.inputs.sales_amount, 0);
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    
    // 순매출
    const netSales = filteredData.reduce((sum, record) => sum + record.results.net_sales, 0);
    document.getElementById('netSales').textContent = formatCurrency(netSales);
    
    // 평균 광고비율
    const avgAdRatio = filteredData.reduce((sum, record) => sum + record.results.sales_advertising_ratio, 0) / filteredData.length;
    document.getElementById('avgAdRatio').textContent = formatPercentage(avgAdRatio);
    
    // 분석 건수
    document.getElementById('totalAnalyses').textContent = filteredData.length;
    
    // 변화율 계산 (최근 vs 이전)
    if (filteredData.length >= 2) {
        const recent = filteredData[filteredData.length - 1];
        const previous = filteredData[filteredData.length - 2];
        
        // 매출 변화
        const salesChange = ((recent.inputs.sales_amount - previous.inputs.sales_amount) / previous.inputs.sales_amount) * 100;
        const salesChangeEl = document.getElementById('salesChange');
        salesChangeEl.className = 'stat-change ' + (salesChange >= 0 ? 'positive' : 'negative');
        salesChangeEl.innerHTML = `<i data-lucide="${salesChange >= 0 ? 'trending-up' : 'trending-down'}" style="width: 14px; height: 14px;"></i> ${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1)}%`;
        
        // 순매출 변화
        const netSalesChange = ((recent.results.net_sales - previous.results.net_sales) / previous.results.net_sales) * 100;
        const netSalesChangeEl = document.getElementById('netSalesChange');
        netSalesChangeEl.className = 'stat-change ' + (netSalesChange >= 0 ? 'positive' : 'negative');
        netSalesChangeEl.innerHTML = `<i data-lucide="${netSalesChange >= 0 ? 'trending-up' : 'trending-down'}" style="width: 14px; height: 14px;"></i> ${netSalesChange >= 0 ? '+' : ''}${netSalesChange.toFixed(1)}%`;
        
        // 광고비율 변화
        const adRatioChange = ((recent.results.sales_advertising_ratio - previous.results.sales_advertising_ratio) / previous.results.sales_advertising_ratio) * 100;
        const adRatioChangeEl = document.getElementById('adRatioChange');
        adRatioChangeEl.className = 'stat-change ' + (adRatioChange <= 0 ? 'positive' : 'negative'); // 광고비율은 낮을수록 좋음
        adRatioChangeEl.innerHTML = `<i data-lucide="activity" style="width: 14px; height: 14px;"></i> ${adRatioChange >= 0 ? '+' : ''}${adRatioChange.toFixed(1)}%`;
    }
    
    // 아이콘 재초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// 차트 렌더링
function renderCharts() {
    renderSalesTrendChart();
    renderAdDistributionChart();
    renderRatioTrendChart();
}

// 매출 추세 차트
function renderSalesTrendChart() {
    const ctx = document.getElementById('salesTrendChart');
    
    if (salesTrendChart) {
        salesTrendChart.destroy();
    }
    
    if (filteredData.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    // 날짜 형식 변환 (yy.mm.dd)
    const labels = filteredData.map(record => {
        const date = new Date(record.timestamp);
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yy}.${mm}.${dd}`;
    });
    
    const salesData = filteredData.map(record => record.inputs.sales_amount);
    const netSalesData = filteredData.map(record => record.results.net_sales);
    const adCostData = filteredData.map(record => record.inputs.advertising_cost);
    
    salesTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '매출액',
                    data: salesData,
                    borderColor: '#525252',
                    backgroundColor: 'rgba(82, 82, 82, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '순매출',
                    data: netSalesData,
                    borderColor: '#737373',
                    backgroundColor: 'rgba(115, 115, 115, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '광고비',
                    data: adCostData,
                    borderColor: '#a3a3a3',
                    backgroundColor: 'rgba(163, 163, 163, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 10000).toFixed(0) + '만원';
                        }
                    }
                }
            }
        }
    });
}

// 광고비 분포 차트
function renderAdDistributionChart() {
    const ctx = document.getElementById('adDistributionChart');
    
    if (adDistributionChart) {
        adDistributionChart.destroy();
    }
    
    if (filteredData.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    // 광고비율 구간별 분포
    const ranges = {
        '매우 낮음 (<7.5%)': 0,
        '적정 (7.5-10%)': 0,
        '높음 (10-15%)': 0,
        '매우 높음 (>15%)': 0
    };
    
    filteredData.forEach(record => {
        const ratio = record.results.sales_advertising_ratio * 100;
        if (ratio < 7.5) ranges['매우 낮음 (<7.5%)']++;
        else if (ratio < 10) ranges['적정 (7.5-10%)']++;
        else if (ratio < 15) ranges['높음 (10-15%)']++;
        else ranges['매우 높음 (>15%)']++;
    });
    
    adDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                data: Object.values(ranges),
                backgroundColor: [
                    '#525252',
                    '#737373',
                    '#a3a3a3',
                    '#d4d4d4'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + '건 (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// 환불률 & 할인률 추이 차트
function renderRatioTrendChart() {
    const ctx = document.getElementById('ratioTrendChart');
    
    if (ratioTrendChart) {
        ratioTrendChart.destroy();
    }
    
    if (filteredData.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    // 날짜 형식 변환 (yy.mm.dd)
    const labels = filteredData.map(record => {
        const date = new Date(record.timestamp);
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yy}.${mm}.${dd}`;
    });
    
    const refundRatios = filteredData.map(record => {
        return (record.inputs.refund_amount / record.inputs.sales_amount) * 100;
    });
    
    const discountRatios = filteredData.map(record => {
        return record.results.effective_discount_ratio * 100;
    });
    
    ratioTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '환불률',
                    data: refundRatios,
                    borderColor: '#737373',
                    backgroundColor: 'rgba(115, 115, 115, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '실할인률',
                    data: discountRatios,
                    borderColor: '#a3a3a3',
                    backgroundColor: 'rgba(163, 163, 163, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

// 필터 적용
function applyFilters() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    
    if (!startDate && !endDate) {
        showError('필터링할 날짜를 선택해주세요.');
        return;
    }
    
    filteredData = allHistoryData.filter(record => {
        const recordDate = new Date(record.timestamp);
        
        if (startDate && recordDate < new Date(startDate)) {
            return false;
        }
        
        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            if (recordDate > endDateTime) {
                return false;
            }
        }
        
        return true;
    });
    
    // 날짜순 정렬
    filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 차트 및 통계 업데이트
    calculateStats();
    renderCharts();
    
    showSuccess(`필터 적용: ${filteredData.length}건의 데이터가 표시됩니다.`);
}

// 필터 초기화
function resetFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    
    filteredData = [...allHistoryData];
    filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    calculateStats();
    renderCharts();
    
    showSuccess('필터가 초기화되었습니다.');
}

// 데이터 테이블 표시
function showDataTable() {
    const container = document.getElementById('dataTableContainer');
    container.style.display = 'block';
    
    const tbody = document.getElementById('dataTableBody');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">표시할 데이터가 없습니다.</td></tr>';
        return;
    }
    
    // 최신순으로 정렬
    const sortedData = [...filteredData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const rows = sortedData.map(record => {
        const date = new Date(record.timestamp).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const refundRatio = (record.inputs.refund_amount / record.inputs.sales_amount) * 100;
        
        return `
            <tr>
                <td>${date}</td>
                <td>${record.metadata.period}</td>
                <td>${formatCurrency(record.inputs.sales_amount)}</td>
                <td>${formatCurrency(record.results.net_sales)}</td>
                <td>${formatCurrency(record.inputs.advertising_cost)}</td>
                <td>${formatPercentage(record.results.sales_advertising_ratio)}</td>
                <td>${refundRatio.toFixed(2)}%</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewDetail('${record.id}')">
                        <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRecord('${record.id}')">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
    
    // 아이콘 재초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // 스크롤
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 데이터 테이블 숨기기
function hideDataTable() {
    document.getElementById('dataTableContainer').style.display = 'none';
}

// 상세 보기
function viewDetail(recordId) {
    const record = allHistoryData.find(r => r.id === recordId);
    if (record) {
        // 계산기 페이지로 이동하여 해당 기록 로드
        window.location.href = `/calculator1?load=${recordId}`;
    }
}

// 기록 삭제
async function deleteRecord(recordId) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/delete_history/${recordId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('기록이 삭제되었습니다.');
            
            // 데이터 새로고침
            await loadAllHistory();
            calculateStats();
            renderCharts();
            
            // 테이블이 열려있으면 업데이트
            if (document.getElementById('dataTableContainer').style.display !== 'none') {
                showDataTable();
            }
        } else {
            showError('삭제 중 오류가 발생했습니다: ' + data.message);
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        showError('삭제 중 오류가 발생했습니다.');
    }
}

// 전체 데이터 내보내기
function exportAllData() {
    window.location.href = '/api/export_history';
}

// CSV 파일 업로드 처리
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showSuccess('파일을 업로드하는 중...');
        
        const response = await fetch('/api/upload_csv', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(`${data.count}건의 데이터가 성공적으로 업로드되었습니다.`);
            
            // 데이터 새로고침
            await loadAllHistory();
            calculateStats();
            renderCharts();
        } else {
            showError('업로드 중 오류가 발생했습니다: ' + data.message);
        }
    } catch (error) {
        console.error('업로드 오류:', error);
        showError('업로드 중 오류가 발생했습니다.');
    }
    
    // 파일 입력 초기화
    event.target.value = '';
}

// 통화 포맷팅
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// 퍼센트 포맷팅
function formatPercentage(value) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
    }).format(value);
}

// 오류 표시
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        <i data-lucide="alert-circle" style="width: 16px; height: 16px;"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// 성공 메시지 표시
function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 3000);
}
