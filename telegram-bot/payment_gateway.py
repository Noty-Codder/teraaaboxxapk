"""
BETA BOT HUB - Auto Payment Gateway client
Gateway: https://betapaymentgateway.up.railway.app

API:
  POST /api/v1/payments/create   (Bearer API key)
       body: {"amount": 15, "customerEmail": "...", "note": "..."}
       -> orderId, payAmount, qrImageUrl, upiUri, payUrl
  GET  /api/v1/payments/<orderId>
       -> {"verified": true/false, "order": {"status": "PENDING" | "PAID" | "EXPIRED"}}
"""
import logging
import aiohttp
from config import PAYMENT_API_URL, PAYMENT_API_KEY

logger = logging.getLogger("BetaBotHub.Payment")


class PaymentError(Exception):
    pass


def _find(data: dict, key: str):
    """Reads a key from the top level or from a nested 'data' / 'order' object."""
    if not isinstance(data, dict):
        return None
    if key in data:
        return data[key]
    for nest in ("data", "order", "payment"):
        inner = data.get(nest)
        if isinstance(inner, dict) and key in inner:
            return inner[key]
    return None


class PaymentGateway:
    def __init__(self):
        self.base = PAYMENT_API_URL.rstrip("/")
        self.timeout = aiohttp.ClientTimeout(total=20)

    def _headers(self):
        if not PAYMENT_API_KEY:
            raise PaymentError("PAYMENT_API_KEY is not set in .env")
        return {
            "Authorization": f"Bearer {PAYMENT_API_KEY}",
            "Content-Type": "application/json",
        }

    async def create(self, amount: float, note: str, customer_email: str) -> dict:
        url = f"{self.base}/api/v1/payments/create"
        payload = {"amount": amount, "customerEmail": customer_email, "note": note}
        async with aiohttp.ClientSession(timeout=self.timeout) as s:
            async with s.post(url, json=payload, headers=self._headers()) as r:
                text = await r.text()
                if r.status >= 400:
                    raise PaymentError(f"Gateway error [{r.status}]: {text[:300]}")
                try:
                    data = await r.json(content_type=None)
                except Exception:
                    raise PaymentError(f"Gateway returned invalid JSON: {text[:300]}")
        if isinstance(data, dict) and data.get("success") is False:
            raise PaymentError(str(data.get("error") or data))

        order_id = _find(data, "orderId")
        if not order_id:
            raise PaymentError(f"No orderId in gateway response: {str(data)[:300]}")
        return {
            "order_id": str(order_id),
            "pay_amount": _find(data, "payAmount") or amount,
            "qr_image_url": _find(data, "qrImageUrl"),
            "upi_uri": _find(data, "upiUri"),
            "pay_url": _find(data, "payUrl"),
        }

    async def status(self, order_id: str) -> str:
        """Returns PAID, PENDING, EXPIRED (or UNKNOWN on network errors)."""
        url = f"{self.base}/api/v1/payments/{order_id}"
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as s:
                async with s.get(url, headers=self._headers()) as r:
                    if r.status >= 400:
                        logger.warning(f"Status check [{r.status}]: {(await r.text())[:200]}")
                        return "UNKNOWN"
                    data = await r.json(content_type=None)
        except Exception as e:
            logger.warning(f"Status check failed for {order_id}: {e}")
            return "UNKNOWN"
        if isinstance(data, dict) and data.get("verified") is True:
            return "PAID"
        status = str(_find(data, "status") or "PENDING").upper()
        return status

    async def fetch_qr_bytes(self, qr_url: str):
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as s:
                async with s.get(qr_url) as r:
                    if r.status == 200:
                        return await r.read()
        except Exception as e:
            logger.warning(f"Could not download QR image: {e}")
        return None


gateway = PaymentGateway()
