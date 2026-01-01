import sys
from server import JsonRpcServer

def main():
    server = JsonRpcServer()
    server.run()

if __name__ == "__main__":
    main()
