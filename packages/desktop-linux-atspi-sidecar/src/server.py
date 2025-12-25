
import sys
import json
import traceback
from atspi_client import AtspiClient

class JsonRpcServer:
    def __init__(self):
        self.client = AtspiClient()
        self.methods = {
            "get_capabilities": self.client.get_capabilities,
            "snapshot": self.client.get_snapshot,
            "click": self.client.click,
            "type": self.client.type_text,
            "key": self.client.press_key,
            "scroll": self.client.scroll,
            "focus": self.client.focus,
            "click_xy": self.client.click_xy,  # Expose explicit coordinate click

    def run(self):
        # Unbuffered stdin/stdout
        sys.stdin.reconfigure(encoding='utf-8')
        sys.stdout.reconfigure(encoding='utf-8')
        
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            
            try:
                request = json.loads(line)
                self.handle_request(request)
            except json.JSONDecodeError:
                self.send_error(None, -32700, "Parse error")
            except Exception as e:
                self.send_error(None, -32603, f"Internal error: {str(e)}")

    def handle_request(self, request):
        req_id = request.get("id")
        method = request.get("method")
        params = request.get("params", {})

        if method not in self.methods:
            self.send_error(req_id, -32601, f"Method not found: {method}")
            return

        try:
            result = self.methods[method](params)
            self.send_response(req_id, result)
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self.send_error(req_id, -32000, str(e))

    def send_response(self, req_id, result):
        response = {
            "jsonrpc": "2.0",
            "result": result,
            "id": req_id
        }
        print(json.dumps(response), flush=True)

    def send_error(self, req_id, code, message):
        response = {
            "jsonrpc": "2.0",
            "error": {
                "code": code,
                "message": message
            },
            "id": req_id
        }
        print(json.dumps(response), flush=True)

if __name__ == "__main__":
    server = JsonRpcServer()
    server.run()
