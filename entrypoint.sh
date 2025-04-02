#!/bin/bash

set -e

if [ "$1" = "app" ]; then
    # Run FastAPI server
    uvicorn main:app --host 0.0.0.0 --port 9000 --reload
else
  exec "$@"
fi
