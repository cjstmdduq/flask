from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
import json
import os
from datetime import datetime
import uuid
import pandas as pd
from io import BytesIO

app = Flask(__name__)

# 설정
app.config['SECRET_KEY'] = 'your-secret-key-here'
HISTORY_FILE = 'data/history.json'

# 히스토리 데이터 디렉토리 생성
os.makedirs('data', exist_ok=True)

def load_history():
    """히스토리 데이터 로드"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_history(history_data):
    """히스토리 데이터 저장"""
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history_data, f, ensure_ascii=False, indent=2)


def normalize_date_value(value):
    """API 응답용 날짜 값을 ISO 형식 문자열로 정규화"""
    if pd.isna(value):
        return None
    return value.isoformat() if hasattr(value, 'isoformat') else str(value)

@app.route('/')
def index():
    """메인 대시보드"""
    return render_template('index.html')

@app.route('/api/save_analysis', methods=['POST'])
def save_analysis():
    """분석 결과 저장"""
    try:
        data = request.json
        
        # 히스토리 데이터 로드
        history_data = load_history()
        
        # 새 분석 기록 생성
        new_record = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'module': data.get('module', 'unknown'),
            'inputs': data.get('inputs', {}),
            'results': data.get('results', {}),
            'metadata': data.get('metadata', {})
        }
        
        # 히스토리에 추가
        history_data.append(new_record)
        
        # 최대 1000개 기록만 유지
        if len(history_data) > 1000:
            history_data = history_data[-1000:]
        
        # 저장
        save_history(history_data)
        
        return jsonify({
            'success': True,
            'message': '분석 결과가 저장되었습니다.',
            'id': new_record['id']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'저장 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/get_history')
def get_history():
    """히스토리 데이터 조회"""
    try:
        history_data = load_history()
        
        # 최신순으로 정렬
        history_data.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # 필터링
        module = request.args.get('module')
        if module:
            history_data = [h for h in history_data if h['module'] == module]
        
        # 날짜 필터링
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date:
            history_data = [h for h in history_data if h['timestamp'] >= start_date]
        if end_date:
            history_data = [h for h in history_data if h['timestamp'] <= end_date]
        
        # 개수 제한
        limit = request.args.get('limit')
        if limit:
            try:
                limit = int(limit)
                history_data = history_data[:limit]
            except ValueError:
                pass
        
        return jsonify({
            'success': True,
            'data': history_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/delete_history/<history_id>', methods=['DELETE'])
def delete_history(history_id):
    """히스토리 삭제"""
    try:
        history_data = load_history()
        
        # 해당 ID의 기록 찾기
        history_data = [h for h in history_data if h['id'] != history_id]
        
        # 저장
        save_history(history_data)
        
        return jsonify({
            'success': True,
            'message': '기록이 삭제되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'삭제 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/export_history')
def export_history():
    """히스토리 데이터 내보내기 (Excel)"""
    try:
        history_data = load_history()
        
        if not history_data:
            return jsonify({
                'success': False,
                'message': '내보낼 데이터가 없습니다.'
            }), 404
        
        # DataFrame으로 변환
        rows = []
        for record in history_data:
            rows.append({
                'ID': record['id'],
                '날짜': record['timestamp'],
                '모듈': record['module'],
                '기간': record.get('metadata', {}).get('period', ''),
                '총일수': record.get('metadata', {}).get('total_days', 0),
                '매출액': record.get('inputs', {}).get('sales_amount', 0),
                '환불액': record.get('inputs', {}).get('refund_amount', 0),
                '총할인액': record.get('inputs', {}).get('total_discount', 0),
                '광고비': record.get('inputs', {}).get('advertising_cost', 0),
                '목표광고비율': record.get('inputs', {}).get('target_ratio', 0),
                '순매출': record.get('results', {}).get('net_sales', 0),
                '일평균순매출': record.get('results', {}).get('daily_avg_net_sales', 0),
                '실할인액': record.get('results', {}).get('effective_discount', 0),
                '실할인률': record.get('results', {}).get('effective_discount_ratio', 0),
                '매출대비광고비율': record.get('results', {}).get('sales_advertising_ratio', 0),
                '보정광고비율': record.get('results', {}).get('corrected_ratio', 0),
                '적정광고비': record.get('results', {}).get('appropriate_advertising', 0),
                '일당적정광고비': record.get('results', {}).get('daily_appropriate_advertising', 0),
            })
        
        df = pd.DataFrame(rows)
        
        # Excel 파일로 변환
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='분석기록')
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'analysis_history_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'내보내기 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/statistics')
def get_statistics():
    """통계 데이터 조회"""
    try:
        history_data = load_history()
        
        if not history_data:
            return jsonify({
                'success': True,
                'data': {
                    'total_records': 0,
                    'total_sales': 0,
                    'total_net_sales': 0,
                    'avg_advertising_ratio': 0,
                    'avg_refund_ratio': 0,
                    'avg_discount_ratio': 0
                }
            })
        
        # 통계 계산
        total_sales = sum(record['inputs']['sales_amount'] for record in history_data)
        total_net_sales = sum(record['results']['net_sales'] for record in history_data)
        avg_advertising_ratio = sum(record['results']['sales_advertising_ratio'] for record in history_data) / len(history_data)
        
        refund_ratios = [record['inputs']['refund_amount'] / record['inputs']['sales_amount'] 
                        if record['inputs']['sales_amount'] > 0 else 0 
                        for record in history_data]
        avg_refund_ratio = sum(refund_ratios) / len(refund_ratios) if refund_ratios else 0
        
        avg_discount_ratio = sum(record['results']['effective_discount_ratio'] for record in history_data) / len(history_data)
        
        return jsonify({
            'success': True,
            'data': {
                'total_records': len(history_data),
                'total_sales': total_sales,
                'total_net_sales': total_net_sales,
                'avg_advertising_ratio': avg_advertising_ratio,
                'avg_refund_ratio': avg_refund_ratio,
                'avg_discount_ratio': avg_discount_ratio
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'통계 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/settle_data')
def get_settle_data():
    """정산 데이터 조회"""
    try:
        settle_file = 'data/SettleCaseByCase.csv'
        
        if not os.path.exists(settle_file):
            return jsonify({
                'success': False,
                'message': '정산 데이터 파일을 찾을 수 없습니다.'
            }), 404
        
        # CSV 읽기
        df = pd.read_csv(settle_file, encoding='utf-8-sig')
        
        # 날짜 필터링
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 결제일 컬럼을 날짜 형식으로 변환
        df['결제일'] = pd.to_datetime(df['결제일'], format='%Y.%m.%d', errors='coerce')
        
        if start_date:
            df = df[df['결제일'] >= start_date]
        if end_date:
            df = df[df['결제일'] <= end_date]
        
        # 정산상태별 집계
        status_summary = df.groupby('정산상태').agg({
            '정산기준금액': 'sum',
            '정산예정금액': 'sum',
            'No.': 'count'
        }).reset_index()
        
        # 일별 집계
        daily_summary = df.groupby(df['결제일'].dt.date).agg({
            '정산기준금액': 'sum',
            '정산예정금액': 'sum',
            '네이버페이 주문관리 수수료': 'sum',
            '매출 연동 수수료 합계': 'sum',
            'No.': 'count'
        }).reset_index()
        daily_summary.columns = ['date', 'gross_sales', 'net_sales', 'naver_fee', 'sales_fee', 'order_count']
        daily_summary['date'] = daily_summary['date'].apply(normalize_date_value)
        
        # 전체 통계
        total_gross_sales = float(df['정산기준금액'].sum())
        total_net_sales = float(df['정산예정금액'].sum())
        total_fees = float(df['네이버페이 주문관리 수수료'].sum()) + float(df['매출 연동 수수료 합계'].sum())

        # 할인율 계산 (수수료 기반)
        discount_denominator = total_net_sales + abs(total_fees)
        actual_discount_rate = (abs(total_fees) / discount_denominator * 100) if discount_denominator > 0 else 0

        total_stats = {
            'total_gross_sales': total_gross_sales,
            'total_net_sales': total_net_sales,
            'total_naver_fee': float(df['네이버페이 주문관리 수수료'].sum()),
            'total_sales_fee': float(df['매출 연동 수수료 합계'].sum()),
            'total_orders': int(len(df)),
            'cancelled_orders': int(len(df[df['정산상태'] == '정산전 취소'])),
            'settled_orders': int(len(df[df['정산상태'].isin(['일반정산', '빠른정산'])])),
            'actual_discount_rate': actual_discount_rate
        }
        
        return jsonify({
            'success': True,
            'data': {
                'total_stats': total_stats,
                'status_summary': status_summary.to_dict('records'),
                'daily_summary': daily_summary.to_dict('records')
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'정산 데이터 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/settle_data/monthly')
def get_settle_data_monthly():
    """월별 정산 데이터 집계"""
    try:
        settle_file = 'data/SettleCaseByCase.csv'

        if not os.path.exists(settle_file):
            return jsonify({
                'success': False,
                'message': '정산 데이터 파일을 찾을 수 없습니다.'
            }), 404

        df = pd.read_csv(settle_file, encoding='utf-8-sig')
        df['결제일'] = pd.to_datetime(df['결제일'], format='%Y.%m.%d', errors='coerce')

        # 월별 집계
        df['year_month'] = df['결제일'].dt.to_period('M')
        monthly_summary = df.groupby('year_month').agg({
            '정산기준금액': 'sum',
            '정산예정금액': 'sum',
            '네이버페이 주문관리 수수료': 'sum',
            '매출 연동 수수료 합계': 'sum',
            'No.': 'count'
        }).reset_index()

        monthly_summary['year_month'] = monthly_summary['year_month'].astype(str)
        monthly_summary.columns = ['month', 'gross_sales', 'net_sales', 'naver_fee', 'sales_fee', 'order_count']

        return jsonify({
            'success': True,
            'data': monthly_summary.to_dict('records')
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'월별 데이터 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/sales_performance')
def get_sales_performance():
    """판매성과 데이터 조회"""
    try:
        sales_file = 'data/SalesPerformance.csv'

        if not os.path.exists(sales_file):
            return jsonify({
                'success': False,
                'message': '판매성과 데이터 파일을 찾을 수 없습니다.'
            }), 404

        # CSV 읽기
        df = pd.read_csv(sales_file, encoding='utf-8-sig')

        # 날짜 필터링
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # 날짜 컬럼을 날짜 형식으로 변환 (YYYY.MM.DD 또는 YYYY-MM-DD 지원)
        normalized_dates = (
            df['날짜']
            .astype(str)
            .str.strip()
            .str.replace('.', '-', regex=False)
        )
        df['날짜'] = pd.to_datetime(normalized_dates, format='%Y-%m-%d', errors='coerce')
        
        # 날짜 파싱에 실패한 행 제거
        df = df.dropna(subset=['날짜'])

        # 숫자 컬럼의 쉼표 제거 및 숫자 변환 (빈 값 처리)
        def safe_float_convert(series):
            return pd.to_numeric(
                series.astype(str).str.replace(',', '').str.strip().replace('', '0').replace('nan', '0'),
                errors='coerce'
            ).fillna(0)
        
        df['결제금액'] = safe_float_convert(df['결제금액'])
        df['쿠폰합계'] = safe_float_convert(df['쿠폰합계'])
        df['환불금액'] = safe_float_convert(df['환불금액'])

        if start_date:
            df = df[df['날짜'] >= start_date]
        if end_date:
            df = df[df['날짜'] <= end_date]

        # 일별 집계
        daily_summary = df.groupby(df['날짜'].dt.date).agg({
            '결제금액': 'sum',
            '쿠폰합계': 'sum',
            '환불금액': 'sum'
        }).reset_index()
        daily_summary.columns = ['date', 'gross_sales', 'coupon_total', 'refund_amount']
        daily_summary['date'] = daily_summary['date'].apply(normalize_date_value)

        # 순매출 계산 (결제금액 - 환불금액)
        daily_summary['net_sales'] = daily_summary['gross_sales'] - daily_summary['refund_amount']

        # 전체 통계
        total_gross_sales = float(df['결제금액'].sum())
        total_coupon = float(df['쿠폰합계'].sum())
        total_refund = float(df['환불금액'].sum())
        total_net_sales = total_gross_sales - total_refund

        # 실 할인률 계산 (할인금액 / (순매출 + 할인금액))
        discount_denominator = total_net_sales + total_coupon
        actual_discount_rate = (total_coupon / discount_denominator * 100) if discount_denominator > 0 else 0

        total_stats = {
            'total_gross_sales': total_gross_sales,
            'total_net_sales': total_net_sales,
            'total_coupon': total_coupon,
            'total_refund': total_refund,
            'actual_discount_rate': actual_discount_rate
        }

        return jsonify({
            'success': True,
            'data': {
                'total_stats': total_stats,
                'daily_summary': daily_summary.to_dict('records')
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'판매성과 데이터 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/ad_data')
def get_ad_data():
    """광고비 데이터 조회"""
    try:
        ad_file = 'data/AdMultipleReport.csv'

        if not os.path.exists(ad_file):
            return jsonify({
                'success': False,
                'message': '광고비 데이터 파일을 찾을 수 없습니다.'
            }), 404

        # CSV 읽기
        df = pd.read_csv(ad_file, encoding='utf-8-sig')

        # 날짜 필터링
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # 일별 컬럼을 날짜 형식으로 변환
        df['일별'] = pd.to_datetime(df['일별'].str.rstrip('.'), format='%Y.%m.%d', errors='coerce')

        # 총비용 컬럼의 쉼표 제거 및 숫자 변환
        df['총비용(VAT포함,원)'] = df['총비용(VAT포함,원)'].astype(str).str.replace(',', '').astype(float)

        if start_date:
            df = df[df['일별'] >= start_date]
        if end_date:
            df = df[df['일별'] <= end_date]

        # 일별 집계 (날짜별 총비용 합계)
        daily_summary = df.groupby(df['일별'].dt.date).agg({
            '총비용(VAT포함,원)': 'sum'
        }).reset_index()
        daily_summary.columns = ['date', 'total_cost']
        daily_summary['date'] = daily_summary['date'].apply(normalize_date_value)

        # 캠페인 유형별 집계
        campaign_summary = df.groupby('캠페인유형').agg({
            '총비용(VAT포함,원)': 'sum'
        }).reset_index()
        campaign_summary.columns = ['campaign_type', 'total_cost']

        # 전체 통계
        total_stats = {
            'total_ad_cost': float(df['총비용(VAT포함,원)'].sum()),
            'daily_average': float(df.groupby(df['일별'].dt.date)['총비용(VAT포함,원)'].sum().mean()) if len(df) > 0 else 0,
            'campaign_count': int(df['캠페인'].nunique())
        }

        return jsonify({
            'success': True,
            'data': {
                'total_stats': total_stats,
                'campaign_summary': campaign_summary.to_dict('records'),
                'daily_summary': daily_summary.to_dict('records')
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'광고비 데이터 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/timeslot_data')
def get_timeslot_data():
    """시간대별 유입 데이터 조회"""
    try:
        timeslot_file = 'data/timeslot.csv'

        if not os.path.exists(timeslot_file):
            return jsonify({
                'success': False,
                'message': '시간대 데이터 파일을 찾을 수 없습니다.'
            }), 404

        # CSV 읽기
        df = pd.read_csv(timeslot_file, encoding='utf-8-sig')

        # 날짜 필터링
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # 날짜 컬럼을 날짜 형식으로 변환
        df['날짜'] = pd.to_datetime(df['날짜'].str.rstrip('.'), format='%Y.%m.%d', errors='coerce')

        # 날짜 파싱에 실패한 행 제거
        df = df.dropna(subset=['날짜'])

        if start_date:
            try:
                start = pd.to_datetime(start_date)
                df = df[df['날짜'] >= start]
            except (ValueError, TypeError):
                pass
        if end_date:
            try:
                end = pd.to_datetime(end_date)
                df = df[df['날짜'] <= end]
            except (ValueError, TypeError):
                pass

        # 시간대 숫자 추출 (예: "00시" -> 0)
        df['시간'] = df['시간대'].str.extract(r'(\d+)').astype(int)

        # 요일 순서 정의 (일-토)
        weekday_order = ['일', '월', '화', '수', '목', '금', '토']
        df['요일_순서'] = df['요일'].apply(lambda x: weekday_order.index(x) if x in weekday_order else -1)
        df = df[df['요일_순서'] >= 0]

        # NaN 값을 빈 문자열로 변환 (groupby에서 NaN이 제외되지 않도록)
        df['채널상세'] = df['채널상세'].fillna('')

        # 히트맵용 데이터: 요일별/시간대별 집계
        heatmap_data = df.groupby(['요일', '요일_순서', '시간']).agg({
            '고객수': 'sum',
            '유입수': 'sum'
        }).reset_index().sort_values(['요일_순서', '시간'])

        # 채널별 시간대 데이터 (채널그룹, 채널명, 채널상세 포함)
        channel_hourly = df.groupby(['시간', '채널그룹', '채널명', '채널상세']).agg({
            '고객수': 'sum',
            '유입수': 'sum'
        }).reset_index()

        # 요일/시간대/채널별 데이터 (세부 필터용)
        channel_weekday_hourly = df.groupby(['요일', '요일_순서', '시간', '채널그룹', '채널명', '채널상세']).agg({
            '고객수': 'sum',
            '유입수': 'sum'
        }).reset_index().sort_values(['요일_순서', '시간'])

        # 전체 통계
        total_stats = {
            'total_customers': int(df['고객수'].sum()),
            'total_inflows': int(df['유입수'].sum()),
            'unique_channels': int(df['채널그룹'].nunique()),
            'date_range_days': int((df['날짜'].max() - df['날짜'].min()).days + 1)
        }

        return jsonify({
            'success': True,
            'data': {
                'total_stats': total_stats,
                'heatmap_data': heatmap_data.to_dict('records'),
                'channel_hourly': channel_hourly.to_dict('records'),
                'channel_weekday_hourly': channel_weekday_hourly.to_dict('records'),
                'weekday_order': weekday_order
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'시간대 데이터 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5050)
