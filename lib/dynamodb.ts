import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, NativeAttributeValue, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export type ParkingEntry = {
  uuid: string;
  timestamp: string;
  url: string;
  lot_name: string;
  is_full: boolean;
  image_src: string;
};


export async function putParkingData(data: ParkingEntry) {
  const command = new PutCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: data,
  });

  return docClient.send(command);
}

export async function getAllParkingData(): Promise<ParkingEntry[]> {
  let allItems: ParkingEntry[] = [];
  let lastEvaluatedKey: Record<string, NativeAttributeValue> | undefined;

  do {
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    allItems = allItems.concat(response.Items as ParkingEntry[] || []);
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allItems;
}
