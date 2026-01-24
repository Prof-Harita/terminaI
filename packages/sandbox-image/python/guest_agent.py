
import socket
import subprocess
import json
import os
import sys
import threading
import struct

# Constants
AGENT_PREFIX = "AGNT:"

def run_agent():
    print(f"{AGENT_PREFIX} READY")
    sys.stdout.flush()
    
    while True:
        try:
            # Blocking read from stdin (connected to ttyS0)
            line = sys.stdin.readline()
            if not line:
                break
                
            line = line.strip()
            if not line:
                continue
                
            # Process command
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                send_error(f"Invalid JSON: {line}")
                continue
                
            cmd_type = msg.get('type')
            
            if cmd_type == 'execute':
                # Run sync
                handle_execute(msg)
            else:
                send_error(f"Unknown type: {cmd_type}")
                
        except Exception as e:
            send_error(f"Fatal Loop Error: {e}")

def send_response(data):
    # Prefix ensures Host can filter this line from Kernel logs
    try:
        payload = json.dumps(data)
        print(f"{AGENT_PREFIX} {payload}")
        sys.stdout.flush()
    except Exception as e:
        # Fallback
        print(f"{AGENT_PREFIX} {{\"error\": \"Serialization failed\"}}")
        sys.stdout.flush()

def send_error(msg):
    send_response({"error": msg})

def handle_execute(msg):
    cmd = msg.get('cmd')
    cancel_token = msg.get('token') # Optional
    
    if not cmd:
        send_error("No cmd")
        return

    cwd = msg.get('cwd')
    env_vars = msg.get('env', {})
    full_env = os.environ.copy()
    full_env.update(env_vars)
    
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            env=full_env,
            capture_output=True,
            text=False # Keep bytes for fidelity, we decode carefully
        )
        
        # Decode output
        stdout_str = proc.stdout.decode('utf-8', errors='replace')
        stderr_str = proc.stderr.decode('utf-8', errors='replace')
        
        resp = {
            "type": "execute_result",
            "token": cancel_token,
            "exitCode": proc.returncode,
            "stdout": stdout_str,
            "stderr": stderr_str
        }
        send_response(resp)
        
    except Exception as e:
        send_error(str(e))

if __name__ == "__main__":
    # Ensure stdout/stdin are unbuffered or handle flush manually
    run_agent()
