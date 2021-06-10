# this module decorates each geojson country with a "daily_covid_cases" array in its "properties" attribute

import pandas as pd
import json
from pathlib import Path
import numpy as np
from functools import reduce

GEOJSON_IN = '../src/asia.geo.json'
GEOJSON_OUT = '../src/asia-augmented.geo.json'
COUNTRY_PROPERTY = 'iso_a3'

COVID_FILE = '../data/owid-covid-data.csv'
COUNTRY_PROPERTY_CSV = 'iso_code'

COVID_DATA_ATTRIBUTE = 'covid_prevalence_normalized'
COVID_INDEX_ATTRIBUTE = 'covid_date_index'
COVID_SCALE_ATTRIBUTE = 'covid_scale'

# -------- load map data ---------------

geojson = json.loads(Path(GEOJSON_IN).read_text())
countries = set([feature['properties'][COUNTRY_PROPERTY] for feature in geojson['features']])

# -------- load covid data ---------------

df = pd.read_csv(COVID_FILE).fillna(0)

# get the countries with covid data
covid_countries = set(df['iso_code']) # country format should match that of the geojson

# get population per country

populations = {}
for country in countries.intersection(covid_countries):
    populations[country] = int(df[df[COUNTRY_PROPERTY_CSV]==country]['population'].iloc[0])

# get covid data per country

# unstack the table to produce a separate time-series column for each country
unstacked = df.pivot(index='date',columns=COUNTRY_PROPERTY_CSV,values='new_cases').fillna(0)
date_index = list(unstacked.index)
# ignore the last day of data (because it is incomplete)
unstacked = unstacked.iloc[:-1,:]
date_index = date_index[:-1]
# create a dict for convenience
covid_cases_raw = {}
for feature in geojson['features']:
    properties = feature['properties']
    country = properties[COUNTRY_PROPERTY]
    if country in covid_countries: # ignore data-less countries
        covid_cases_raw[country] = [int(u) for u in list(unstacked[country])]

# ---------- data processing -------------

def seven_day_average(series):
    return np.convolve(series, [1.0/7]*7, 'valid')

def prevalence(series, population):
    return series/population

def jsonable(array):
    # make it into a proper list
    return [float(a) for a in array]

covid_prevalence_averaged = {}
for country in covid_cases_raw:
    raw = covid_cases_raw[country]
    covid_prevalence_averaged[country] = jsonable(prevalence(seven_day_average(raw), populations[country]))
# ignore the first 6 days because the convolution isn't valid
date_index = date_index[6:]

# get "max" val (ignoring outliers like that one day in Turkey)
aggregated = reduce(lambda a,v: a+v, [covid_prevalence_averaged[country] for country in covid_prevalence_averaged], [])
maxVal = np.quantile(aggregated, 0.99)

# normalize
covid_normalized = {}
for country in covid_prevalence_averaged:
    raw = covid_prevalence_averaged[country]
    covid_normalized[country] = jsonable(np.array(covid_prevalence_averaged[country])/maxVal)

# ---------- augment the geojson with covid data -------------

# for each geometric feature (i.e. country), attach the |new_cases| array as the property |daily_covid_cases|
for feature in geojson['features']:
    properties = feature['properties']
    country = properties[COUNTRY_PROPERTY]
    if country in covid_countries: # ignore data-less countries
        properties[COVID_DATA_ATTRIBUTE] = covid_normalized[country]

# include the date index for plotting
geojson[COVID_INDEX_ATTRIBUTE] = date_index
geojson[COVID_SCALE_ATTRIBUTE] = maxVal

# ------------ save ---------------

with open(GEOJSON_OUT, 'w') as f:
    f.write(json.dumps(geojson))