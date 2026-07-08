#!/usr/bin/env python3
"""Import multi-line on-login scripts to RouterOS hotspot profiles."""

import paramiko
import time
import os

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
:if ([:len [/system scheduler find where name=$user]] = 0) do={{
  :local mac $"mac-address";
  /system scheduler add name=$user disabled=no start-date=[/system clock get date] start-time=[/system clock get time] interval={validity} on-event={REMOVE_EVENT} comment=mwifi;
  :if ([:len $mac] > 0) do={{ /ip hotspot user set mac-address=$mac [find where name=$user]; }};
}};
}}"""


def main() -> None:
    if not PASSWORD:
        raise SystemExit("Set ROUTEROS_PASSWORD environment variable.")
    rsc = "\n".join(profile_block(n, v) for n, v in PROFILES.items()) + "\n"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST, port=PORT, username=USER, password=PASSWORD,
        timeout=30, look_for_keys=False, allow_agent=False,
    )

    sftp = client.open_sftp()
    with sftp.file("mwifi_hotspot_fix.rsc", "w") as remote:
        remote.write(rsc)
    sftp.close()

    def run(cmd: str) -> str:
        time.sleep(0.5)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=90)
        return stdout.read().decode("utf-8", errors="replace") + stderr.read().decode("utf-8", errors="replace")

    print(run("/import file-name=mwifi_hotspot_fix.rsc"))
    print(run("/file remove mwifi_hotspot_fix.rsc"))
    print("=== VC-5-Jam profile ===")
    print(run('/ip hotspot user profile print detail where name="VC-5-Jam"')[:2000])
    print("=== scheduler 5V2A8DEM ===")
    print(run('/system scheduler print where name="5V2A8DEM"'))

    client.close()


if __name__ == "__main__":
    main()
