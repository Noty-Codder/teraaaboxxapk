FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libjpeg-dev zlib1g-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Web server for Watch Now / Download Now links (Railway/Heroku/Render set $PORT automatically)
ENV PORT=8080
EXPOSE 8080
CMD ["python3", "bot.py"]
