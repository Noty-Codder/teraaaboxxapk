"""
PlayMast Uploader API client.
POST {PLAYMAST_API_URL}/api/upload  (multipart: file, title, description, folder_id)
Auth: Authorization: Bearer <token>  (token from env or /api/auth/login)
"""
import os
import logging
import asyncio
import aiohttp
from config import PLAYMAST_API_URL, PLAYMAST_API_TOKEN, PLAYMAST_EMAIL, PLAYMAST_PASSWORD

logger = logging.getLogger("BetaBotHub.PlayMast")
TUNNEL_HEADERS = {"Bypass-Tunnel-Reminder": "true", "Accept": "application/json", "User-Agent": "BetaBotHub/1.0"}


class PlayMastError(Exception):
    pass


class _ProgressReader:
    """Streams a file in chunks and reports upload progress."""

    def __init__(self, fobj, total, cb, chunk=1024 * 1024):
        self.f, self.total, self.cb, self.chunk, self.sent = fobj, total, cb, chunk, 0

    async def gen(self):
        while True:
            data = self.f.read(self.chunk)
            if not data:
                break
            self.sent += len(data)
            if self.cb:
                try:
                    await self.cb(self.sent, self.total)
                except Exception:
                    pass
            yield data


class PlayMastUploader:
    def __init__(self, api_url=None, token=None, email=None, password=None):
        self.api_url = (api_url or PLAYMAST_API_URL).rstrip("/")
        self.token = token or PLAYMAST_API_TOKEN
        self.email = email or PLAYMAST_EMAIL
        self.password = password or PLAYMAST_PASSWORD

    async def _login(self, session) -> str:
        if not (self.email and self.password):
            raise PlayMastError("PlayMast token missing: set PLAYMAST_API_TOKEN (or PLAYMAST_EMAIL + PLAYMAST_PASSWORD) in .env")
        async with session.post(f"{self.api_url}/api/auth/login", headers=TUNNEL_HEADERS,
                                json={"email": self.email, "password": self.password}) as r:
            data = await r.json(content_type=None)
            if r.status != 200 or not data.get("token"):
                raise PlayMastError(f"PlayMast login failed: {data.get('detail') if isinstance(data, dict) else r.status}")
            self.token = data["token"]
            return self.token

    async def upload_file(self, file_path: str, title: str = None, description: str = "", folder_id: str = None,
                          progress_callback=None) -> dict:
        if not file_path or not os.path.exists(file_path):
            raise PlayMastError("File not found for upload")
        timeout = aiohttp.ClientTimeout(total=3600, sock_connect=30, sock_read=600)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                if not self.token:
                    await self._login(session)
                for attempt in range(2):
                    form = aiohttp.FormData()
                    form.add_field("title", title or os.path.basename(file_path))
                    form.add_field("description", description or "Uploaded via Beta Bot Hub")
                    if folder_id:
                        form.add_field("folder_id", folder_id)
                    total = os.path.getsize(file_path)
                    with open(file_path, "rb") as raw:
                        f = _ProgressReader(raw, total, progress_callback)
                        form.add_field("file", f.gen(), filename=os.path.basename(file_path),
                                       content_type="application/octet-stream")
                        headers = {**TUNNEL_HEADERS, "Authorization": f"Bearer {self.token}"}
                        async with session.post(f"{self.api_url}/api/upload", headers=headers, data=form) as r:
                            try:
                                data = await r.json(content_type=None)
                            except Exception:
                                raise PlayMastError(f"PlayMast upload failed (HTTP {r.status})")
                    if r.status == 401 and attempt == 0 and self.email and self.password:
                        await self._login(session)
                        continue
                    if r.status not in (200, 201) or not isinstance(data, dict) or data.get("success") is False:
                        detail = data.get("detail") or data.get("message") if isinstance(data, dict) else data
                        raise PlayMastError(f"PlayMast upload error (HTTP {r.status}): {detail}")
                    if progress_callback:
                        try:
                            await progress_callback(total, total)
                        except Exception:
                            pass
                    url = data.get("url")
                    if not url:
                        raise PlayMastError("PlayMast did not return a link")
                    return data
        except aiohttp.ClientConnectorError:
            raise PlayMastError(f"Cannot connect to PlayMast server ({self.api_url})")
        except asyncio.TimeoutError:
            raise PlayMastError("PlayMast upload timed out")


playmast = PlayMastUploader()
