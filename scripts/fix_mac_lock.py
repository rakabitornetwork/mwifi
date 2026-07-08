#!/usr/bin/env python3
"""Fix on-login MAC lock + immediate fix for GS7F4T3."""

import os
import paramiko
import time

HOST = os.environ.get("ROUTEROS_HOST", "31.57.178.91")
PORT = int(os.environ.get("ROUTEROS_PORT", "1722"))
USER = os.environ.get("ROUTEROS_USER", "cursor")
PASSWORD = os.environ.get("ROUTEROS_PASSWORD", "")

PROFILES = {
    "VC-5-Jam": "5h",
    "Vcorner 5 Jam": "5h",
    "Supri 6 Jam": "6h",
    "Supri 12 Jam": "12h",
    "Resa 6 Jam": "6h",
}

REMOVE_EVENT = (
    "{/ip hotspot user remove [find where name=[/system scheduler get [find] name]];"
    "/system scheduler remove [find]}"
)


def profile_block(name: str, validity: str) -> str:
    return f"""/ip hotspot user profile set [find where name="{name}"] on-login={{
:local mac $"mac-address";
:if ([:len [/system scheduler find where name=$user]] = 0) do={{
  /system scheduler add name=$user disabled=no start-date=[/system clock get date] start-time=[/system clock get time] interval={validity} on-event={REMOVE_EVENT} comment=mwifi;
}};
:if ([:len $mac] > 0) do={{
  :if ([/ip hotspot user get [find where name=$user] mac-address] = "") do={{
    /ip hotspot user set mac-address=$mac [find where name=$user];
  }};
}};
}}"""


def run(client, cmd: str) -> str:
    time.sleep(0.4)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    return stdout.read().decode("utf-8", errors="replace")


def main() -> None:
    if not PASSWORD:
        raise SystemExit("ROUTEROS_PASSWORD required")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30, look_for_keys=False, allow_agent=False)

    rsc = "\n".join(profile_block(n, v) for n, v in PROFILES.items()) + "\n"
    sftp = client.open_sftp()
    with sftp.file("mwifi_mac_fix.rsc", "w") as f:
        f.write(rsc)
    sftp.close()

    print(run(client, "/import file-name=mwifi_mac_fix.rsc"))
    run(client, "/file remove mwifi_mac_fix.rsc")

    # Fix all active sessions missing MAC on user record
    active = run(client, "/ip hotspot active print detail without-paging")
    import re
    pairs = list(zip(
        re.findall(r'user="([^"]+)"', active),
        re.findall(r"mac-address=([0-9A-F:]+)", active, re.I),
    ))
    for uname, mac in pairs:
        run(client, f'/ip hotspot user set [find where name="{uname}"] mac-address={mac}')
        print(f"locked MAC {uname} -> {mac}")

    print("=== GS7F4T3 user ===")
    print(run(client, '/ip hotspot user print detail where name="GS7F4T3"'))
    print("=== Resa 6 Jam on-login ===")
    print(run(client, '/ip hotspot user profile print detail where name="Resa 6 Jam"')[:2000])

    client.close()


if __name__ == "__main__":
    main()
