import os
import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "https://xn--2v5bo7x.com"

# 폴더 경로 정의
PATHS = [
    "static/css",
    "static/js",
    "static/images",
    "static/images/EquipImage",
    "data/events"
]

def create_directories():
    print("[-] 디렉토리를 생성하는 중...")
    for path in PATHS:
        os.makedirs(path, exist_ok=True)
    print("[+] 디렉토리 생성 완료.")

def download_file(url, filepath):
    try:
        # 공백이나 특수 문자가 포함된 URL 인코딩 처리
        parsed_url = urllib.parse.urlparse(url)
        encoded_path = urllib.parse.quote(parsed_url.path)
        encoded_url = urllib.parse.urlunparse(parsed_url._replace(path=encoded_path))
        
        req = urllib.request.Request(
            encoded_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
            out_file.write(response.read())
        print(f"[+] 다운로드 성공: {filepath}")
        return True
    except Exception as e:
        print(f"[!] 다운로드 실패: {url} -> {e}")
        return False

def replace_colon_on_item_name(name):
    return name.replace(' : ', '-').replace(': ', '-').replace(':', '-')

def main():
    create_directories()
    
    # 1. CSS 파일 다운로드
    css_files = [
        "style.css",
        "common-modern.css",
        "darkmode.css",
        "randbox.css",
        "modern-index.css",
        "alerts.css"
    ]
    print("\n[-] CSS 파일 다운로드 중...")
    for css in css_files:
        download_file(f"{BASE_URL}/static/css/{css}", f"static/css/{css}")
        
    # 2. JS 파일 다운로드
    js_files = [
        "darkmode.js",
        "common-modern.js",
        "auth.js",
        "randbox.js"
    ]
    print("\n[-] JS 파일 다운로드 중...")
    for js in js_files:
        download_file(f"{BASE_URL}/static/js/{js}", f"static/js/{js}")
        
    # 3. 기타 에셋 다운로드
    print("\n[-] 기본 에셋 다운로드 중...")
    download_file(f"{BASE_URL}/static/images/favicon.ico", "static/images/favicon.ico")
    download_file(f"{BASE_URL}/static/images/noimg.webp", "static/images/noimg.webp")
    
    # 4. 이벤트 목록 다운로드
    print("\n[-] 이벤트 목록 다운로드 중...")
    events_list_path = "data/events.json"
    if download_file(f"{BASE_URL}/list_event_files", events_list_path):
        with open(events_list_path, 'r', encoding='utf-8') as f:
            events = json.load(f)
            
        unique_items = set()
        
        # 5. 각 이벤트의 개별 상세 데이터 다운로드
        print("\n[-] 개별 이벤트 상세 데이터 및 아이템 이미지 수집 중...")
        for event in events:
            event_id = event['id']
            # URL에 특수문자 및 공백 처리
            encoded_id = urllib.parse.quote(event_id)
            event_url = f"{BASE_URL}/get_event_data/{encoded_id}"
            event_file_path = f"data/events/{event_id}.json"
            
            if download_file(event_url, event_file_path):
                # 아이템 이름 수집
                try:
                    with open(event_file_path, 'r', encoding='utf-8') as ef:
                        event_data = json.load(ef)
                        for box in event_data.get('boxes', []):
                            for item in box.get('items', []):
                                if item.get('name'):
                                    unique_items.add(item['name'])
                except Exception as ex:
                    print(f"[!] {event_id} 데이터 파싱 오류: {ex}")
        
        # 6. 수집된 모든 고유 아이템 이미지 다운로드
        print(f"\n[-] 수집된 고유 아이템 개수: {len(unique_items)}")
        print("[-] 아이템 이미지 다운로드 중...")
        
        success_count = 0
        for item_name in unique_items:
            img_filename = replace_colon_on_item_name(item_name)
            img_url = f"{BASE_URL}/static/images/EquipImage/{img_filename}.webp"
            img_path = f"static/images/EquipImage/{img_filename}.webp"
            
            # 파일이 이미 존재하면 다운로드 건너뛰기 (시간 절약)
            if os.path.exists(img_path):
                success_count += 1
                continue
                
            if download_file(img_url, img_path):
                success_count += 1
                
        print(f"\n[+] 자산 다운로드 완료! 총 {len(unique_items)}개 중 {success_count}개 다운로드 성공.")
    else:
        print("[!] 이벤트 목록을 받아오지 못해 이미지 다운로드를 진행할 수 없습니다.")

if __name__ == "__main__":
    main()
