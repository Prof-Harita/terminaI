import sys
from server import JsonRpcServer
from atspi_client import AtspiClient

def main():
    client = AtspiClient()
    server = JsonRpcServer(client)
    server.run()

if __name__ == "__main__":
    main()
