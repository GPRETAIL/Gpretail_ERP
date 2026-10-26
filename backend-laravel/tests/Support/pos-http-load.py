"""Opt-in loopback-only HTTP regression for the disposable TEMP POS load lab."""
import concurrent.futures
import json
import statistics
import sys
import time
import urllib.parse
import urllib.request
import uuid

base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8149/api"
other = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8150/api"
for address in (base, other):
    parsed = urllib.parse.urlparse(address)
    if parsed.hostname != "127.0.0.1" or parsed.scheme != "http":
        raise ValueError("This harness only accepts the loopback test lab")
headers = {"Content-Type": "application/json", "Accept": "application/json", "X-Company-Scope-Id": "1"}


def call(path, payload=None, target=base):
    started = time.perf_counter()
    request = urllib.request.Request(target + path, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        value = json.load(response)
        metrics = {"http_ms": round((time.perf_counter() - started) * 1000, 2), "server_timing": response.headers.get("Server-Timing"), "replayed": response.headers.get("X-Pos-Checkout-Replayed") == "1"}
    return value, metrics


activation, _ = call("/activation/status")
assert activation["data"]["plan_tier"] == "TEST", "Not the disposable test deployment"
login, _ = call("/auth/login", {"username": "temp-pos-load", "password": "temporary-test-only"})
assert login["data"]["user"]["platform_company_code"] == "TEMP-LOAD-COMPANY"
headers["Authorization"] = "Bearer " + login["data"]["token"]
report = {"catalog_products": 10000, "samples": [], "lookups": []}
for path in ("/pos-sales/stock-products", "/pos-sales/stock-products?search=TEMP-LOAD-10000", "/pos-sales/barcode-lookup?barcode=TEMP-LOAD-10000", "/pos-sales/latest-document"):
    result, metric = call(path)
    if path == "/pos-sales/stock-products":
        assert len(result["data"]) == 50
    if "search=" in path:
        assert len(result["data"]) == 1 and result["data"][0]["productName"] == "TEMP Load Product 10000"
    report["lookups"].append({"path": path, **metric})

for size in (1, 10, 100, 200, 1000):
    for run in range(1, 4):
        items = [{"productId": i, "variantId": i, "barcodeId": i, "qty": 1, "price": 100} for i in range(10001-size, 10001)]
        payload = {"checkoutKey": str(uuid.uuid4()), "saleSaveAs": "paid_settled", "cashAmount": size*100, "items": items}
        result, metric = call("/pos-sales", payload)
        sale = result["data"]
        assert len(sale["items"]) == size and float(sale["grand_total"]) == size*100 and sale["status"] == "PAID"
        assert len(sale["payments"]) == 1 and float(sale["payments"][0]["amount"]) == size*100
        retry, replay_metric = call("/pos-sales", payload)
        assert retry["data"]["id"] == sale["id"] and replay_metric["replayed"]
        details, _ = call("/pos-sales/"+str(sale["id"]))
        assert len(details["data"]["items"]) == size
        report["samples"].append({"basket": size, "run": run, **metric})

before, _ = call("/pos-sales/barcode-lookup?barcode=TEMP-LOAD-09999")
payload = {"checkoutKey": str(uuid.uuid4()), "saleSaveAs": "paid_settled", "cashAmount": 100, "items": [{"productId": 9999, "variantId": 9999, "barcodeId": 9999, "qty": 1, "price": 100}]}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    futures = [pool.submit(call, "/pos-sales", payload, node) for node in (base, other)]
    results = [future.result() for future in futures]
assert results[0][0]["data"]["id"] == results[1][0]["data"]["id"]
after, _ = call("/pos-sales/barcode-lookup?barcode=TEMP-LOAD-09999")
assert float(before["data"]["stock_qty"])-float(after["data"]["stock_qty"]) == 1
report["simultaneous_retry"] = {"same_invoice": True, "stock_decrement": 1, "responses": [entry[1] for entry in results]}
report["median_http_ms"] = {str(size): statistics.median(row["http_ms"] for row in report["samples"] if row["basket"] == size) for size in (1, 10, 100, 200, 1000)}
print(json.dumps(report, indent=2))
