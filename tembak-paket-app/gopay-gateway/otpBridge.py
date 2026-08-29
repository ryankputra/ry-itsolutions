#!/usr/bin/env python3
"""
GoPay / GoBiz Web OTP Bridge
Menjembatani login CLI GoPay berbasis PTY ke Web API Express
"""

import sys
import os
import pty
import select
import time
import json
import subprocess
import signal

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
LOGIN_SCRIPT = os.path.join(CURRENT_DIR, "login.js")
STATE_FILE = os.path.join(CURRENT_DIR, ".otp_state.json")
SESSION_FILE = os.path.join(CURRENT_DIR, ".GOPAY_SESI_JANGAN_DIHAPUS.json")

def read_all_available(fd, timeout=0.2):
    buf = ""
    while True:
        r, _, _ = select.select([fd], [], [], timeout)
        if not r:
            break
        try:
            chunk = os.read(fd, 2048).decode("utf-8", errors="ignore")
            if not chunk:
                break
            buf += chunk
        except Exception:
            break
    return buf

def read_until_any(fd, targets, timeout=12):
    start = time.time()
    buf = ""
    while time.time() - start < timeout:
        r, _, _ = select.select([fd], [], [], 0.3)
        if r:
            try:
                chunk = os.read(fd, 1024).decode("utf-8", errors="ignore")
                if not chunk:
                    break
                buf += chunk
                for target in targets:
                    if target in buf:
                        return True, target, buf
            except Exception:
                break
    return False, None, buf

class GoPayLoginSession:
    _instance = None

    def __init__(self):
        self.master = None
        self.slave = None
        self.proc = None
        self.phone = None
        self.started_at = None

    def kill_existing(self):
        if self.proc:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=1)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
        if self.master is not None:
            try:
                os.close(self.master)
            except Exception:
                pass
        self.master = None
        self.slave = None
        self.proc = None
        self.phone = None
        self.started_at = None

    def request_otp(self, phone):
        self.kill_existing()
        self.phone = phone.strip()
        self.started_at = time.time()

        self.master, self.slave = pty.openpty()
        self.proc = subprocess.Popen(
            ["node", LOGIN_SCRIPT],
            cwd=CURRENT_DIR,
            stdin=self.slave,
            stdout=self.slave,
            stderr=self.slave,
            close_fds=True,
            preexec_fn=os.setsid
        )
        os.close(self.slave)
        self.slave = None

        # Wait for phone prompt
        found, target, out = read_until_any(self.master, ["Masukkan Nomor HP", "Nomor HP", "GoBiz"], timeout=10)
        if not found:
            self.kill_existing()
            return {"status": False, "message": "Gagal memulai sesi login GoPay CLI. Output: " + out.strip()[:200]}

        # Send phone number
        os.write(self.master, (self.phone + "\n").encode("utf-8"))

        # Wait for OTP confirmation prompt
        found, target, out = read_until_any(self.master, ["Masukkan Kode OTP", "Kode OTP (4 digit) berhasil dikirim", "Gagal", "Error"], timeout=12)
        if "berhasil dikirim" in out or "Masukkan Kode OTP" in out:
            return {"status": True, "message": f"Kode OTP (4 digit) berhasil dikirim via SMS ke nomor {self.phone}! Masukkan kode OTP untuk verifikasi."}
        else:
            clean_out = out.replace(">>", "").replace("====================================================", "").strip()
            self.kill_existing()
            return {"status": False, "message": "Gagal meminta OTP GoPay: " + clean_out}

    def verify_otp(self, otp):
        if not self.proc or self.master is None:
            return {"status": False, "message": "Tidak ada sesi permintaan OTP yang aktif. Silakan minta kode OTP terlebih dahulu."}

        otp_clean = otp.strip()
        if len(otp_clean) != 4 or not otp_clean.isdigit():
            return {"status": False, "message": "Kode OTP harus berupa 4 digit angka."}

        # Send OTP
        os.write(self.master, (otp_clean + "\n").encode("utf-8"))

        # Wait for result
        found, target, out = read_until_any(self.master, ["[SUCCESS]", "LOGIN BERHASIL", "Gagal", "Invalid", "Salah", "kadaluarsa"], timeout=15)
        
        # Read trailing output
        time.sleep(0.5)
        out += read_all_available(self.master, timeout=0.5)

        self.kill_existing()

        if "LOGIN BERHASIL" in out or "[SUCCESS]" in out:
            # Check session file
            session_info = {}
            if os.path.exists(SESSION_FILE):
                try:
                    with open(SESSION_FILE, "r") as f:
                        session_info = json.load(f)
                except Exception:
                    pass

            return {
                "status": True,
                "message": "Login GoPay Merchant Berhasil! Sesi telah tersimpan dan siap digunakan.",
                "data": {
                    "merchant_id": session_info.get("merchant_id"),
                    "outlet_name": session_info.get("outlet_name"),
                    "phone_number": session_info.get("phone_number"),
                    "expires_at": session_info.get("expires_at")
                }
            }
        else:
            clean_out = out.replace(">>", "").replace("====================================================", "").strip()
            return {"status": False, "message": "Verifikasi OTP Gagal: " + (clean_out if clean_out else "Kode OTP salah atau telah kadaluarsa.")}

# Simple persistent socket or JSON server for communication
if __name__ == "__main__":
    import socket
    import threading

    HOST = "127.0.0.1"
    PORT = 3009

    session = GoPayLoginSession()

    def handle_client(conn):
        try:
            data = conn.recv(4096).decode("utf-8")
            if not data:
                return
            req = json.loads(data)
            action = req.get("action")

            if action == "request_otp":
                phone = req.get("phone", "")
                res = session.request_otp(phone)
            elif action == "verify_otp":
                otp = req.get("otp", "")
                res = session.verify_otp(otp)
            elif action == "cancel":
                session.kill_existing()
                res = {"status": True, "message": "Sesi login dibatalkan."}
            elif action == "status":
                is_active = os.path.exists(SESSION_FILE)
                session_data = None
                if is_active:
                    try:
                        with open(SESSION_FILE, "r") as f:
                            session_data = json.load(f)
                    except Exception:
                        pass
                res = {
                    "status": True,
                    "is_configured": is_active,
                    "has_pending_otp": session.proc is not None,
                    "session": session_data
                }
            else:
                res = {"status": False, "message": "Unknown action"}

            conn.sendall(json.dumps(res).encode("utf-8"))
        except Exception as e:
            try:
                conn.sendall(json.dumps({"status": False, "message": str(e)}).encode("utf-8"))
            except Exception:
                pass
        finally:
            conn.close()

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind((HOST, PORT))
        server.listen(5)
        print(f"[GoPay OTP Bridge] Server berjalan di {HOST}:{PORT}", flush=True)
    except Exception as e:
        print(f"[GoPay OTP Bridge Error] Gagal bind ke port {PORT}: {e}", flush=True)
        sys.exit(1)

    while True:
        try:
            conn, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(conn,))
            t.daemon = True
            t.start()
        except KeyboardInterrupt:
            break
        except Exception as e:
            time.sleep(0.1)
