# this module decorates each geojson country with a "daily_covid_cases" array in its "properties" attribute

import pandas as pd
import json
from pathlib import Path

GEOJSON_IN = 'src/asia.geo.json'
GEOJSON_OUT = 'src/asia-augmented.geo.json'
COUNTRY_PROPERTY = 'iso_a3'

COVID_FILE = 'data/owid-covid-data.csv'
COUNTRY_PROPERTY_CSV = 'iso_code'

# load map data

geojson = json.loads(Path(GEOJSON_IN).read_text())

countries = set([feature['properties'][COUNTRY_PROPERTY] for feature in geojson['features']])

# load covid data

df = pd.read_csv(COVID_FILE).fillna(0)

covid_countries = set(df['iso_code'])

populations = {}
for country in countries.intersection(covid_countries):
    populations[country] = int(df[df[COUNTRY_PROPERTY_CSV]==country]['population'].iloc[0])

# make sure we have all the data we need
# assert covid_countries>=countries, "Some countries on the asia map are not present in the covid data: {}".format(countries - covid_countries)

unstacked = df.pivot(index='date',columns=COUNTRY_PROPERTY_CSV,values='new_cases').fillna(0)

# for each feature, add the new_cases data in the property daily_covid_cases
for feature in geojson['features']:
    properties = feature['properties']
    country = properties[COUNTRY_PROPERTY]
    if country in covid_countries:
        properties['daily_covid_cases'] = [int(u) for u in list(unstacked[country])]
        properties['population'] = populations[country]

# add the date array at the base level
geojson['date_index'] = list(unstacked.index)

# save the json
with open(GEOJSON_OUT, 'w') as f:
    f.write(json.dumps(geojson))