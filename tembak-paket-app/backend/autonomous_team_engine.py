#!/usr/bin/env python3
import time
import json
import os
import subprocess
import urllib.request

# Configuration
GROUP_ID = "-1003970927785"
STB_HOST = "root@192.168.0.203"
STB_DIR = "/www/wwwroot/ry-itsolutions/tembak-paket-app"
LOCAL_DIR = "/Users/ryankptr/tembak-paket-app/tembak-paket-app"

BOTS = {
  "budi": "8939470403:AAG1oDuJEnq8clBJvGhHeyZ3Gk3S0jK3E10",
  "dhani": "8240998449:AAHKq881sW33Bv56sH4Z76Hl2GvD-jXm2hQ",
  "eko": "8891040017:AAFP5oZ3_7m7x2nN6Z14QxM50gT7T0H5t80",
  "rina": "8743231492:AAGl73u_YttssxFRkcnXyMoAlR2C058himg",
  "riko": "8883320815:AAFjkc8stNoKfXMXMkf8g_hEeZjU9dtBWaQ",
  "siti": "8790521044:AAEZ655r14H2t3L541p9xL17T2R157L7j3k",
  "irfan": "8386486716:AAEpCInLg5WjndZqfLbs70rD0Jd1C9h3dCg",
  "doni": "8502485243:AAEn8cfs1YyQ2X8G2x0Vf00fH8j3f5pQ_2Y",
  "fikri": "7907116807:AAEQw_64gT_9f_17N9n7_2v277J_4f5L_1k"
}

def send_telegram(role, text):
    token = BOTS.get(role.lower())
    if not token:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": GROUP_ID, "text": text, "parse_mode": "HTML"}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as res:
            pass
    except Exception as e:
        print(f"[SEND ERROR {role}]: {e}")

print("Autonomous Team Engine initialized.")
