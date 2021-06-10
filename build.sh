#!/bin/sh

cd preprocessing
pipenv run python3 augment_geojson.py
cd ..
npm run build