# Root Dockerfile -> builds the telegram-bot/ folder (Railway / Render / Docker)
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libjpeg-dev zlib1g-dev && rm -rf /var/lib/apt/lists/*
COPY telegram-bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY telegram-bot/ .
CMD ["python3", "bot.py"]
