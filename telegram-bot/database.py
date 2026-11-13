"""
Dual-Engine Database for Beta Bot Hub:
- Primary: MongoDB Atlas via motor.motor_asyncio
- Secondary/Fallback: SQLite via aiosqlite
Supports users, daily quotas, manual admin grants, referrals, and payment records.
"""
import os
import datetime
import logging
from config import MONGODB_URI, DB_NAME, PLANS

logger = logging.getLogger("BetaBotHub.DB")

class Database:
    def __init__(self):
        self.use_mongo = bool(MONGODB_URI and MONGODB_URI.strip())
        self.mongo_client = None
        self.mongo_db = None
        self._initialized = False

    async def init(self):
        if self._initialized:
            return

        if self.use_mongo:
            try:
                import motor.motor_asyncio
                self.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
                self.mongo_db = self.mongo_client[DB_NAME]
                # Test connection
                await self.mongo_client.admin.command('ping')
                logger.info("🍃 Connected to MongoDB Atlas successfully!")
                self._initialized = True
                return
            except Exception as e:
                logger.error(f"MongoDB connection failed: {e}. Falling back to SQLite.")
                self.use_mongo = False

        # Fallback to SQLite
        import aiosqlite
        async with aiosqlite.connect("betabothub.db") as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    plan TEXT DEFAULT 'free',
                    plan_expires_at TIMESTAMP,
                    downloads_today INTEGER DEFAULT 0,
                    uploads_today INTEGER DEFAULT 0,
                    last_reset_date TEXT,
                    referred_by INTEGER,
                    is_verified INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS premium_grants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    plan TEXT,
                    days INTEGER,
                    granted_by INTEGER,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            try:
                await db.execute("ALTER TABLE users ADD COLUMN expiry_notified_at TEXT")
            except Exception:
                pass  # column already exists
            await db.commit()
        self._initialized = True
        logger.info("🗄️ Initialized SQLite Database.")

    async def get_or_create_user(self, user_id: int, username: str, referred_by: int = None):
        await self.init()
        today = datetime.date.today().isoformat()

        if self.use_mongo:
            users_col = self.mongo_db["users"]
            user = await users_col.find_one({"user_id": user_id})
            if not user:
                user_doc = {
                    "user_id": user_id,
                    "username": username,
                    "plan": "free",
                    "plan_expires_at": None,
                    "downloads_today": 0,
                    "uploads_today": 0,
                    "last_reset_date": today,
                    "referred_by": referred_by,
                    "is_verified": 0,
                    "created_at": datetime.datetime.utcnow()
                }
                await users_col.insert_one(user_doc)
                user = user_doc
            else:
                # Daily reset check
                if user.get("last_reset_date") != today:
                    await users_col.update_one(
                        {"user_id": user_id},
                        {"$set": {"downloads_today": 0, "uploads_today": 0, "last_reset_date": today}}
                    )
                    user["downloads_today"] = 0
                    user["uploads_today"] = 0

            # Plan expiry check
            plan = user.get("plan", "free")
            expires_at = user.get("plan_expires_at")
            if expires_at and datetime.datetime.utcnow() > expires_at:
                plan = "free"
                await users_col.update_one({"user_id": user_id}, {"$set": {"plan": "free"}})

            dl_limit = 999999 if plan == "beta" else (17 if plan == "pro" else 3)
            up_limit = 999999 if plan == "beta" else (15 if plan == "pro" else 3)

            return {
                "user_id": user["user_id"],
                "username": user.get("username", ""),
                "plan": plan,
                "is_verified": bool(user.get("is_verified", 0)),
                "downloads_left": max(0, dl_limit - user.get("downloads_today", 0)),
                "uploads_left": max(0, up_limit - user.get("uploads_today", 0))
            }
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                row = await cursor.fetchone()

                if not row:
                    await db.execute(
                        "INSERT INTO users (user_id, username, referred_by, last_reset_date) VALUES (?, ?, ?, ?)",
                        (user_id, username, referred_by, today)
                    )
                    await db.commit()
                    cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                    row = await cursor.fetchone()
                elif row["last_reset_date"] != today:
                    await db.execute(
                        "UPDATE users SET downloads_today = 0, uploads_today = 0, last_reset_date = ? WHERE user_id = ?",
                        (today, user_id)
                    )
                    await db.commit()
                    cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                    row = await cursor.fetchone()

                plan = row["plan"] or "free"
                exp_raw = row["plan_expires_at"]
                if plan != "free" and exp_raw:
                    try:
                        exp_dt = datetime.datetime.fromisoformat(exp_raw) if isinstance(exp_raw, str) else exp_raw
                        if datetime.datetime.utcnow() > exp_dt:
                            plan = "free"
                            await db.execute("UPDATE users SET plan = 'free' WHERE user_id = ?", (user_id,))
                            await db.commit()
                    except Exception:
                        pass
                dl_limit = 999999 if plan == "beta" else (17 if plan == "pro" else 3)
                up_limit = 999999 if plan == "beta" else (15 if plan == "pro" else 3)

                return {
                    "user_id": row["user_id"],
                    "username": row["username"],
                    "plan": plan,
                    "is_verified": bool(row["is_verified"]),
                    "downloads_left": max(0, dl_limit - row["downloads_today"]),
                    "uploads_left": max(0, up_limit - row["uploads_today"])
                }

    async def grant_premium(self, user_id: int, plan: str, days: int, granted_by: int):
        await self.init()
        now = datetime.datetime.utcnow()
        base = now
        cur = await self.get_user_full_info(user_id)
        if cur and cur.get("plan") in ("pro", "beta") and cur.get("plan_expires_at"):
            try:
                cur_exp = cur["plan_expires_at"]
                cur_exp = datetime.datetime.fromisoformat(cur_exp) if isinstance(cur_exp, str) else cur_exp
                if cur_exp > now:
                    base = cur_exp  # add new days on top of remaining time
                    if cur["plan"] == "beta":
                        plan = "beta"  # never move a Beta VIP down to Pro
            except Exception:
                pass
        expires_at = base + datetime.timedelta(days=days)

        if self.use_mongo:
            users_col = self.mongo_db["users"]
            grants_col = self.mongo_db["premium_grants"]
            await users_col.update_one(
                {"user_id": user_id},
                {"$set": {"plan": plan, "plan_expires_at": expires_at, "expiry_notified_at": None}},
                upsert=True
            )
            await grants_col.insert_one({
                "user_id": user_id,
                "plan": plan,
                "days": days,
                "granted_by": granted_by,
                "expires_at": expires_at,
                "created_at": datetime.datetime.utcnow()
            })
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, ""))
                await db.execute(
                    "UPDATE users SET plan = ?, plan_expires_at = ?, expiry_notified_at = NULL WHERE user_id = ?",
                    (plan, expires_at.isoformat(), user_id)
                )
                await db.execute(
                    "INSERT INTO premium_grants (user_id, plan, days, granted_by, expires_at) VALUES (?, ?, ?, ?, ?)",
                    (user_id, plan, days, granted_by, expires_at.isoformat())
                )
                await db.commit()

        return {"plan": plan, "expires_at": expires_at.strftime("%d %b %Y, %I:%M %p UTC")}

    async def revoke_premium(self, user_id: int):
        await self.init()
        if self.use_mongo:
            await self.mongo_db["users"].update_one(
                {"user_id": user_id},
                {"$set": {"plan": "free", "plan_expires_at": None}}
            )
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                await db.execute("UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE user_id = ?", (user_id,))
                await db.commit()

    async def get_user_full_info(self, user_id: int):
        await self.init()
        if self.use_mongo:
            user = await self.mongo_db["users"].find_one({"user_id": user_id})
            if not user:
                return None
            refs = await self.mongo_db["users"].count_documents({"referred_by": user_id, "is_verified": 1})
            return {
                "user_id": user["user_id"],
                "username": user.get("username", "N/A"),
                "plan": user.get("plan", "free"),
                "plan_expires_at": user.get("plan_expires_at"),
                "downloads_today": user.get("downloads_today", 0),
                "uploads_today": user.get("uploads_today", 0),
                "verified_referrals": refs
            }
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                user = await cursor.fetchone()
                if not user:
                    return None
                ref_cur = await db.execute("SELECT COUNT(*) FROM users WHERE referred_by = ? AND is_verified = 1", (user_id,))
                ref_count = (await ref_cur.fetchone())[0]
                return {
                    "user_id": user["user_id"],
                    "username": user["username"],
                    "plan": user["plan"],
                    "plan_expires_at": user["plan_expires_at"],
                    "downloads_today": user["downloads_today"],
                    "uploads_today": user["uploads_today"],
                    "verified_referrals": ref_count
                }

    async def can_download(self, user_id: int):
        user = await self.get_or_create_user(user_id, "")
        return user['downloads_left'] > 0, user['downloads_left']

    async def can_upload(self, user_id: int):
        user = await self.get_or_create_user(user_id, "")
        return user['uploads_left'] > 0, user['uploads_left']

    async def record_download(self, user_id: int):
        await self.init()
        if self.use_mongo:
            await self.mongo_db["users"].update_one({"user_id": user_id}, {"$inc": {"downloads_today": 1}})
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                await db.execute("UPDATE users SET downloads_today = downloads_today + 1 WHERE user_id = ?", (user_id,))
                await db.commit()

    async def record_upload(self, user_id: int):
        await self.init()
        if self.use_mongo:
            await self.mongo_db["users"].update_one({"user_id": user_id}, {"$inc": {"uploads_today": 1}})
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                await db.execute("UPDATE users SET uploads_today = uploads_today + 1 WHERE user_id = ?", (user_id,))
                await db.commit()

    async def verify_user_referral(self, user_id: int):
        await self.init()
        if self.use_mongo:
            await self.mongo_db["users"].update_one({"user_id": user_id}, {"$set": {"is_verified": 1}})
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                await db.execute("UPDATE users SET is_verified = 1 WHERE user_id = ?", (user_id,))
                await db.commit()

    async def get_verified_referrals_count(self, user_id: int) -> int:
        await self.init()
        if self.use_mongo:
            return await self.mongo_db["users"].count_documents({"referred_by": user_id, "is_verified": 1})
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                cursor = await db.execute("SELECT COUNT(*) FROM users WHERE referred_by = ? AND is_verified = 1", (user_id,))
                row = await cursor.fetchone()
                return row[0] if row else 0

    async def grant_one_day_pass(self, user_id: int):
        return await self.grant_premium(user_id=user_id, plan="pro", days=1, granted_by=0)

    async def get_all_user_ids(self) -> list:
        """Retrieves all registered user IDs for owner & admin broadcasting"""
        await self.init()
        if self.use_mongo:
            cursor = self.mongo_db["users"].find({}, {"user_id": 1})
            return [doc["user_id"] async for doc in cursor if "user_id" in doc]
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                cursor = await db.execute("SELECT user_id FROM users")
                rows = await cursor.fetchall()
                return [row[0] for row in rows if row and row[0]]

    async def get_expiring_premium_users(self) -> list:
        """
        Finds premium users whose plan expires in <= 24 hours OR has expired
        within the last 48 hours and hasn't received a renewal reminder today.
        """
        await self.init()
        now = datetime.datetime.utcnow()
        threshold_soon = now + datetime.timedelta(hours=24)
        threshold_past = now - datetime.timedelta(days=2)
        results = []

        if self.use_mongo:
            cursor = self.mongo_db["users"].find({
                "plan": {"$ne": "free"},
                "plan_expires_at": {"$gte": threshold_past, "$lte": threshold_soon}
            })
            async for doc in cursor:
                last_notif = doc.get("expiry_notified_at")
                if not last_notif or (now - last_notif).total_seconds() > 72000:
                    exp = doc.get("plan_expires_at")
                    results.append({
                        "user_id": doc["user_id"],
                        "username": doc.get("username", "Member"),
                        "plan": doc.get("plan", "pro"),
                        "expires_at": exp,
                        "is_expired": bool(exp and exp < now)
                    })
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute(
                    "SELECT user_id, username, plan, plan_expires_at, expiry_notified_at FROM users WHERE plan != 'free' AND plan_expires_at IS NOT NULL"
                )
                rows = await cursor.fetchall()
                for r in rows:
                    try:
                        exp_str = r["plan_expires_at"]
                        exp = datetime.datetime.fromisoformat(exp_str) if isinstance(exp_str, str) else exp_str
                        ln = r["expiry_notified_at"]
                        if ln and (now - datetime.datetime.fromisoformat(ln)).total_seconds() < 72000:
                            continue
                        if threshold_past <= exp <= threshold_soon:
                            results.append({
                                "user_id": r["user_id"],
                                "username": r["username"] or "Member",
                                "plan": r["plan"],
                                "expires_at": exp,
                                "is_expired": bool(exp < now)
                            })
                    except Exception:
                        pass
        return results

    async def mark_expiry_notified(self, user_id: int):
        """Marks that renewal reminder was dispatched so user is not spammed"""
        await self.init()
        now = datetime.datetime.utcnow()
        if self.use_mongo:
            await self.mongo_db["users"].update_one(
                {"user_id": user_id},
                {"$set": {"expiry_notified_at": now}}
            )
        else:
            import aiosqlite
            async with aiosqlite.connect("betabothub.db") as db:
                await db.execute("UPDATE users SET expiry_notified_at = ? WHERE user_id = ?", (now.isoformat(), user_id))
                await db.commit()


db = Database()
