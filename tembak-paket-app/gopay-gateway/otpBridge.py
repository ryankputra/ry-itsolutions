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
import shutil

# Ensure stdio file descriptors 0, 1, 2 are valid so openpty() does not pick fd 0 or 1
try:
    os.fstat(0)
except Exception:
    try:
        null_fd = os.open(os.devnull, os.O_RDWR)
        for target_fd in (0, 1, 2):
            try:
                os.fstat(target_fd)
            except Exception:
                os.dup2(null_fd, target_fd)
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
LOGIN_SCRIPT = os.path.join(CURRENT_DIR, "login.js")
STATE_FILE = os.path.join(CURRENT_DIR, ".otp_state.json")
SESSION_FILE = os.path.join(CURRENT_DIR, ".GOPAY_SESI_JANGAN_DIHAPUS.json")

NODE_BIN = shutil.which("node") or "/Users/ryankptr/.nvm/versions/node/v24.20.0/bin/node"

def read_all_available(fd, timeout=0.2):
    import fcntl
    try:
        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
    except Exception:
        pass
    buf = ""
    start = time.time()
    while time.time() - start < timeout:
        try:
            chunk = os.read(fd, 2048).decode("utf-8", errors="ignore")
            if chunk:
                buf += chunk
        except Exception:
            pass
        time.sleep(0.05)
    return buf

def read_until_any(fd, targets, timeout=12):
    import fcntl
    try:
        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
    except Exception:
        pass
    start = time.time()
    buf = ""
    while time.time() - start < timeout:
        r, _, _ = select.select([fd], [], [], 0.2)
        if r:
            try:
                chunk = os.read(fd, 2048).decode("utf-8", errors="ignore")
                if chunk:
                    buf += chunk
                    for target in targets:
                        if target in buf:
                            return True, target, buf
            except (BlockingIOError, OSError):
                pass
            except Exception:
                break
        time.sleep(0.05)
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

        # Remove existing session file if any so login.js starts a fresh CLI login prompt
        if os.path.exists(SESSION_FILE):
            try:
                os.remove(SESSION_FILE)
            except Exception:
                pass

        env = dict(os.environ)
        env["PATH"] = "/Users/ryankptr/.nvm/versions/node/v24.20.0/bin:/usr/local/bin:/usr/bin:/bin:" + env.get("PATH", "")

        self.master, self.slave = pty.openpty()
        slave_fd = self.slave

        def preexec():
            os.setsid()
            import fcntl, termios
            try:
                fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
            except Exception:
                pass

        self.proc = subprocess.Popen(
            [NODE_BIN, LOGIN_SCRIPT],
            cwd=CURRENT_DIR,
            stdin=self.slave,
            stdout=self.slave,
            stderr=self.slave,
            env=env,
            close_fds=True,
            preexec_fn=preexec
        )

        # Wait 2.5 seconds for login.js to load modules and display CLI prompt
        time.sleep(2.5)
        os.write(self.master, (self.phone + "\n").encode("utf-8"))

        # Wait for OTP confirmation prompt from GoJek API
        found, target, out = read_until_any(self.master, ["Mengirim", "berhasil dikirim", "Kode OTP", "[+]", "[*]", "Gagal", "Error"], timeout=25)
        if "Mengirim" in out or "berhasil dikirim" in out or "Kode OTP" in out or "[+]" in out or "[*]" in out or found:
            return {"status": True, "message": f"Kode OTP (4 digit) berhasil dikirim via SMS ke nomor {self.phone}! Masukkan kode OTP untuk verifikasi."}
        else:
            clean_out = out.replace(">>", "").replace("====================================================", "").replace(self.phone, "").strip()
            self.kill_existing()
            return {"status": False, "message": "Gagal meminta OTP GoPay: " + (clean_out if clean_out else "Koneksi server GoJek bermasalah.")}

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
