FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libffi-dev \
    libcairo2 \
    shared-mime-info \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/templates /app/cache
RUN chmod +x /app/start.sh
EXPOSE 8001
CMD ["/app/start.sh"]
