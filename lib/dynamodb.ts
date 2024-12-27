import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export async function putParkingData(data: any) {
  const command = new PutCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      uuid: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...data,
    },
  });

  return docClient.send(command);
}

export async function getAllParkingData() {
  let allItems: any[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    allItems = allItems.concat(response.Items || []);
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allItems;
}
