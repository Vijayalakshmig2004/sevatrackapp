import time
import requests
import json
import os
import concurrent.futures
import pandas as pd
from datetime import datetime
from openpyxl.styles import Font, PatternFill, Alignment

# Attempt to load target URL from input.json, default to local if not found
BASE_URL = "http://localhost:3000"
INPUT_JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "input.json")

if os.path.exists(INPUT_JSON_PATH):
    try:
        with open(INPUT_JSON_PATH, "r") as f:
            data = json.load(f)
            if "baseUrl" in data:
                BASE_URL = data["baseUrl"]
    except Exception as e:
        print(f"Error reading input.json: {e}")

print(f"Load testing target: {BASE_URL}")

# Load test parameters
CONCURRENT_USERS = 100
DURATION_SECONDS = 60
ENDPOINT = f"{BASE_URL}/"

# Shared state for threads
results = []
is_running = True

def user_worker():
    """Simulates a single virtual user making continuous requests."""
    global is_running
    session = requests.Session()
    while is_running:
        start_time = time.time()
        try:
            response = session.get(ENDPOINT, timeout=5)
            status = response.status_code
        except Exception as e:
            status = 0 # 0 indicates failure/timeout
        
        end_time = time.time()
        response_time_ms = (end_time - start_time) * 1000
        
        results.append({
            "status": status,
            "response_time_ms": response_time_ms
        })

def run_load_test():
    global is_running
    print(f"Starting load test with {CONCURRENT_USERS} concurrent users for {DURATION_SECONDS} seconds...")
    
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        futures = [executor.submit(user_worker) for _ in range(CONCURRENT_USERS)]
        
        # Wait for the duration
        time.sleep(DURATION_SECONDS)
        
        # Signal threads to stop
        is_running = False
        print("Stopping virtual users...")
        
        # Wait for all threads to finish their current request
        concurrent.futures.wait(futures)

    end_time = time.time()
    actual_duration = end_time - start_time
    
    # Process results
    total_requests = len(results)
    if total_requests == 0:
        print("No requests were completed.")
        return
        
    successful_requests = sum(1 for r in results if r["status"] == 200)
    failed_requests = total_requests - successful_requests
    
    response_times = [r["response_time_ms"] for r in results]
    min_time = min(response_times)
    max_time = max(response_times)
    avg_time = sum(response_times) / total_requests
    
    rps = total_requests / actual_duration

    print("\n--- Load Test Results ---")
    print(f"Total Requests: {total_requests}")
    print(f"Successful Requests: {successful_requests}")
    print(f"Failed/Timeout Requests: {failed_requests}")
    print(f"Requests per second (RPS): {rps:.2f} req/sec")
    print(f"Average Response Time: {avg_time:.2f} ms")
    print(f"Min Response Time: {min_time:.2f} ms")
    print(f"Max Response Time: {max_time:.2f} ms")
    
    generate_excel_report(total_requests, successful_requests, failed_requests, rps, min_time, max_time, avg_time)

def generate_excel_report(total, success, failed, rps, min_rt, max_rt, avg_rt):
    report_data = [
        ["Metric", "Value"],
        ["Target URL", BASE_URL],
        ["Virtual Users", CONCURRENT_USERS],
        ["Duration (Seconds)", DURATION_SECONDS],
        ["Total Requests Sent", total],
        ["Successful Requests (200 OK)", success],
        ["Failed/Timeout Requests", failed],
        ["Requests Per Second (RPS)", f"{rps:.2f} req/sec"],
        ["Average Response Time", f"{avg_rt:.2f} ms"],
        ["Minimum Response Time", f"{min_rt:.2f} ms"],
        ["Maximum Response Time", f"{max_rt:.2f} ms"],
    ]
    
    df = pd.DataFrame(report_data[1:], columns=report_data[0])
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_filename = os.path.join(os.path.dirname(__file__), "Load_Test_Report.xlsx")
    
    # Write to Excel
    writer = pd.ExcelWriter(report_filename, engine='openpyxl')
    df.to_excel(writer, sheet_name='Load Test Metrics', index=False)
    
    # Formatting
    worksheet = writer.sheets['Load Test Metrics']
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F81BD", end_color="4F81BD", fill_type="solid")
    
    for col in worksheet.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(cell.value)
            except:
                pass
            cell.alignment = Alignment(horizontal="left", vertical="center")
            
            # Format header
            if cell.row == 1:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")
                
        adjusted_width = (max_length + 2)
        worksheet.column_dimensions[column].width = adjusted_width

    writer.close()
    print(f"\nReport successfully saved to: {report_filename}")

if __name__ == "__main__":
    run_load_test()
