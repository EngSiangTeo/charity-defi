from dotenv import load_dotenv
import os
import json
import datetime;

from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

def readDb():
    f = open("db.json", "r")
    db = json.loads(f.read())
    f.close()
    return db

def getData(table):
    db = readDb()
    return db[table]

def writeDb(table, data):
    db = readDb()
    if type(db[table]) is dict:
        db[table] = data
    else:
        db[table].append(data)
    f = open("db.json", "w")
    f.write(json.dumps(db))
    f.close()

@app.route("/campaigns", methods=["GET"])
def getCampaigns():
    campaigns = getData("campaigns")
    return json.dumps(campaigns)

@app.route("/campaign", methods=["POST"])
def createCampaigns():
    user = getData("campaigns")
    user[request.json["campaignAddress"]] = {
        "name" : request.json['name'],
        "description" : request.json['description'],
        "owner" : request.json['owner'],
        "target" : request.json['target'],
        "closeDate" : request.json['closeDate'],
    }
    writeDb("campaigns", user)
    return "ok"

@app.route("/campaign/<address>", methods=["GET"])
def getCampaignById(address):
	campaign = getData("campaigns")
	if address in campaign:
		return json.dumps(campaign[address])
	else:
		return "Not Found", 404

@app.route("/transactions/<address>", methods=["GET"])
def getTransactoniById(address):
    transaction = getData("transactions")
    if address in transaction:
        print(transaction[address])
        return json.dumps(transaction[address])
    else:
        return json.dumps([])

@app.route("/transactions/<address>", methods=["POST"])
def createNewTransaction(address):
    transaction = getData("transactions")
    payload = {
        "type" : request.json["type"],
        "transaction" : request.json["transaction"],
        "donor" : request.json["donor"],
        "amount" : request.json["amount"],
        "date" : str(datetime.datetime.now())
    }
    if "receiver" in request.json:
        payload["receiver"] = request.json["receiver"]
    if address not in transaction:
        transaction[address] = [payload]
    else:
        transaction[address].append(payload)
    print(transaction)
    writeDb("transactions", transaction)
    return "done"

app.run(host='0.0.0.0', port=4111, debug=True)