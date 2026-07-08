#!/usr/bin/env python3
import os
import paramiko
import time

VOUCHER = "GS7F4T3"
HOST = os.environ.get("ROUTEROS_HOST", "31.57.178.91")
PORT = int(os.environ.get("ROUTEROS_PORT", "1722"))
USER = os.environ.get("ROUTEROS_USER", "cursor")
PASSWORD = os.environ.get("ROUTEROS_PASSWORD", "")

if not PASSWORD:
    raise SystemExit("Set ROUTEROS_PASSWORD")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30, look_for_keys=False, allow_agent=False)

def run(cmd: str) -> str:
    time.sleep(0.3)
    return client.exec_command(cmd, timeout=60)[1].read().decode("utf-8", errors="replace")

for cmd in [
    f'/ip hotspot user print detail where name="{VOUCHER}"',
    f'/ip hotspot active print detail where user="{VOUCHER}"',
    f'/system scheduler print detail where name="{VOUCHER}"',
]:
    print("===", cmd, "===")
    print(run(cmd))

client.close()
