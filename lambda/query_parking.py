import os
import json
import uuid
from datetime import datetime
import boto3
import requests
from bs4 import BeautifulSoup

# Initialize DynamoDB client outside the handler for connection reuse
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# Constants
TARGET_URLS = [
    "https://www.ahuzot.co.il/Parking/ParkingDetails/?ID=123"
]
REQUEST_TIMEOUT = 5  # seconds

def put_parking_data(data):
    """
    Store parking data in DynamoDB
    """
    try:
        table.put_item(Item=data)
    except Exception as e:
        print(f"Error putting item in DynamoDB: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    AWS Lambda handler function
    """
    all_data = []
    try:
        for url in TARGET_URLS:
            # Add timeout to request
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text)

            # Extract parking data - optimize selectors
            img_tag = soup.select_one(".ParkingDetailsTable td img")
            is_full = 'male.png' in (img_tag.get('src', '') if img_tag else '')
            lot_name = soup.select_one(".ParkingTableHeader").text.strip()

            # Prepare data entry
            data = {
                'uuid': str(uuid.uuid4()),
                'timestamp': datetime.utcnow().isoformat(),
                'lot_name': lot_name,
                'is_full': is_full,
                'url': url
            }

            # Append data to the list
            all_data.append(data)

            # Store in DynamoDB
            put_parking_data(data)

        return {
            'statusCode': 200,
            'body': json.dumps({'success': True, 'message': 'Query completed successfully', 'data': all_data})
        }

    except requests.Timeout:
        print("Request timed out while fetching parking data")
        return {
            'statusCode': 504,
            'body': json.dumps({'success': False, 'error': 'Request timed out'})
        }
    except Exception as e:
        print(f"Error processing parking data: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'success': False, 'error': str(e)})
        }
