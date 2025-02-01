import os
import boto3

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def migrate_items():
    """
    Migrate existing items to include the image_src field
    """
    try:
        # Scan all items
        response = table.scan()
        items = response['Items']
        total_items = len(items)
        
        # Process all items
        for i_item, item in enumerate(items):
            # Check if image_src exists and is not empty
            if not item.get('image_src'):
                # Set image_src based on is_full value
                image_src = "/pics/ParkingIcons/male.png" if item.get('is_full', False) else "/pics/ParkingIcons/panui.png"
                
                # Update the item
                table.update_item(
                    Key={
                        'uuid': item['uuid'],
                        'timestamp': item['timestamp'],
                    },
                    UpdateExpression='SET image_src = :img_src',
                    ExpressionAttributeValues={
                        ':img_src': image_src
                    }
                )
                print(f"[{i_item+1}/{total_items}] Updated item {item['uuid']} (is_full: {item.get('is_full', False)})")
            else:
                print(f"[{i_item+1}/{total_items}] Skipping item {item['uuid']} (image_src: {item.get('image_src', 'not set')})")
                
        print(f"Migration completed successfully.")
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    AWS Lambda handler function for migration
    """
    try:
        migrate_items()
        return {
            'statusCode': 200,
            'body': 'Migration completed successfully'
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': f'Migration failed: {str(e)}'
        }

if __name__ == "__main__":
    # For local testing
    migrate_items()
