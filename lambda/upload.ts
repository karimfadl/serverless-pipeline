import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid'; // Use the uuid library for generating unique IDs

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const data = body.data;

    const processedData = data.split('\n').map((line: string) => line.trim());

    const params = {
      TableName: process.env.TABLE_NAME!,
      Item: {
        id: uuidv4(), // Generate a unique ID using uuid
        content: processedData,
      },
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data processed and stored successfully!' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error }),
    };
  }
};
