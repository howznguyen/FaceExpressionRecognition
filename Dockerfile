FROM python:3.10-slim AS compiler

ENV PYTHONUNBUFFERED=1
WORKDIR /code

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    libpq-dev gcc g++ && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY ./requirements.txt /code/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip python -m pip install --no-cache-dir -r /code/requirements.txt

RUN apt-get purge -y --auto-remove gcc g++ && \
    rm -rf /var/lib/apt/lists/*

FROM python:3.10-slim AS runner

ENV PYTHONUNBUFFERED=1
WORKDIR /code/app

RUN apt-get update && \
    apt-get install --no-install-recommends -y libpq-dev && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update && \
    apt-get install --no-install-recommends -y libgl1-mesa-glx libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*


COPY --from=compiler /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY ./app /code/app

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# 
RUN ls -la /entrypoint.sh

# For windows
RUN sed -i 's/\r$//' /entrypoint.sh

RUN ls -la /entrypoint.sh

# For windows
RUN sed -i 's/\r$//' /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
