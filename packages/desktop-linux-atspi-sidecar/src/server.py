import sys
import json
import logging
from typing import Dict, Any, Optional

# Configure logging to stderr so stdout is clean for JSON-RPC
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('atspi-server')

class JsonRpcServer:
    def __init__(self, handler: Any):
        self.handler = handler

    def run(self):
        logger.info("Starting JSON-RPC server on stdin/stdout")
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                
                request = json.loads(line)
                response = self.handle_request(request)
                if response:
                    print(json.dumps(response), flush=True)
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
            except Exception as e:
                logger.error(f"Error processing request: {e}")

    def handle_request(self, request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if 'method' not in request or 'id' not in request:
            return None # Ignore notifications or invalid requests for now

        req_id = request['id']
        method_name = request['method']
        params = request.get('params', {})

        try:
            if not hasattr(self.handler, method_name):
                raise ValueError(f"Method not found: {method_name}")
            
            method = getattr(self.handler, method_name)
            result = method(**params)
            
            return {
                "jsonrpc": "2.0",
                "result": result,
                "id": req_id
            }
        except Exception as e:
            logger.exception(f"Exception during method {method_name}")
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32000,
                    "message": str(e)
                },
                "id": req_id
            }
