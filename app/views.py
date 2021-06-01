from app import app

from flask import render_template, Response, request, send_from_directory

import pytz
from datetime import *
from dateutil.relativedelta import *
from dateutil.parser import *

import requests

import pymongo
from bson import json_util
import os


# Create connection to MongoDB cluster, and yes these are global.
try:
    MONGO_SECRET = os.environ['MONGO_SERVER_URI']
    # Break up this URI into strings for storing as a environment variable later
    client = pymongo.MongoClient(MONGO_SECRET)
    db = client.database
    collection = db.requests
    collection.create_index([('unique_key', pymongo.DESCENDING)], unique=True)
except Exception as e:
    print('Exception:', e)


# Temporarily here to print out data from database.
@app.route('/cursor')
def print_collection():
    try:
        global collection
        recent_dates = collection.create_index([('created_date', pymongo.DESCENDING)], name='recent_dates')
        projection = {'_id': False, 'unique_key': True, 'created_date': True, 'descriptor': True}
        cursor = collection.find({}, projection, hint=recent_dates).sort('created_date', pymongo.DESCENDING)

        return render_template('cursor.html', count=collection.count(), cursor=cursor)
    except Exception as e:
        print(e)  # Probably out of memory for in-memory sort.
        return Response(response="404", status=404, mimetype='text/html')


def store_retrieved_data(service_requests):
    # service_requests: a list filled with JSON documents.
    try:
        global collection
        for request in service_requests:
            request['created_date'] = parse(request['created_date'])
            request['unique_key'] = int(request['unique_key'])

        collection.insert_many(service_requests, ordered=False)
    except Exception as e:
        print("Exception:", e)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/')
@app.route('/index')
def index():
    '''
    Returns a static webpage for now.
    '''
    return render_template('index.html')


@app.route('/map')
def map():
    return render_template('map.html')


@app.route('/q')
def request_data():
    # These are the desired columns:
    global collection
    projection = {
        '_id': False,
        'unique_key': True,
        'created_date': True,
        'closed_date': True,
        'agency': True,
        'agency_name': True,
        'complaint_type': True,
        'descriptor': True,
        'latitude': True,
        'longitude': True
    }

    # Define date range
    eastern_tz = pytz.timezone('US/Eastern')  # Generate time zone from string.
    today = datetime.now()  # Generate datetime object right now.
    today = eastern_tz.localize(today)  # Convert today to new datetime
    time_delta = today - relativedelta(days=7)

    query = { 'created_date': { '$gte': time_delta } }
    agency = request.args.get('agency')
    complaint_type = request.args.get('type')

    if agency is not None:
        query['agency'] = agency
    if complaint_type is not None:
        collection.create_index(
            [('complaint_type', pymongo.TEXT), ('descriptor', pymongo.TEXT)],
            name='r_type'
        )
        query['$text'] = {'$search': complaint_type}

    cursor = collection.find(query, projection)

    # Create the response
    return Response(
        response=json_util.dumps(cursor),
        status=200,
        mimetype='application/json'
    )


@app.route('/query')
def retrieve():
    # These are the desired columns:
    # ['Unique Key', 'Latitude', 'Longitude', 'Created Date', 'Agency', 'Agency Name', 'Complaint Type', 'Descriptor']
    columns = "unique_key,latitude,longitude,created_date,closed_date,agency,agency_name,complaint_type,descriptor"

    # Get recent service requests from database
    eastern_tz = pytz.timezone('US/Eastern')  # Generate time zone from string.
    today = datetime.utcnow()  # Generate datetime object right now.
    # today = today.astimezone(eastern_tz)  # Convert today to new datetime
    today = eastern_tz.localize(today)
    time_delta = today - relativedelta(days=7)

    # Convert datetimes into Floating Timestamps for use with Socrata.
    today = today.strftime('%Y-%m-%d') + 'T00:00:00'
    time_delta = time_delta.strftime('%Y-%m-%d') + 'T00:00:00'

    '''
    GET request on Socrata's API.
    First part is the data set we're using.
    $limit is set to the maximum number of records we want.
    $select will select the columns we want, as defined earlier.
    $where allows us to choose the time frame. In this case it's 6 weeks.
    '''
    api_url = "https://data.cityofnewyork.us/resource/erm2-nwe9.json?"
    filters = {
        '$limit': 50000,
        '$select': columns,
        '$where': 'created_date between \'{}\' and \'{}\''.format(time_delta, today) +
            'and longitude is not null'
    }
    agency = request.args.get('agency')
    complaint_type = request.args.get('type')
    if agency is not None:
        # Append the agency to the API url for searching.
        api_url += 'agency={}'.format(agency)
    if complaint_type is not None:
        # Update the filter with a full text search of the data set.
        filters.update({'$q': '\'{}\''.format(complaint_type)})

    r = requests.get(api_url, params=filters)
    store_retrieved_data(r.json())

    # Create the response
    response = Response(response=r, status=200, mimetype='application/json')
    return response
