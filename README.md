# Step-by-Step Guide to Create a Serverless Data Processing Pipeline

### Initialize a New CDK Project:
* Create a new directory and initialize a CDK project in TypeScript.
```
mkdir serverless-pipeline
cd serverless-pipeline
cdk init app --language=typescript
```
* Install Dependencies:
Navigate to the lambda/ directory and install the aws-sdk and uuid packages.
```
mkdir lambda
cd lambda
npm init -y
npm install aws-sdk uuid
```
* Install Type Declarations:
Install the type definitions for uuid to resolve TypeScript issues.
```
npm install --save-dev @types/uuid
```
* Your lambda/ directory structure should now look like this:
```
lambda/
├── node_modules/
├── package.json
├── package-lock.json
├── upload.d.ts
├── upload.js
└── upload.ts
```

### Write the Lambda Function:
* Create the upload.ts File:
Write the Lambda function code that will process and store data in DynamoDB.
Example (lambda/upload.ts):
```
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
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
    };
  }
};
```

### Write the Lambda Function:
* Define Your CDK Stack
Edit the serverless-pipeline-stack.ts File:
In the lib/ directory, edit serverless-pipeline-stack.ts to define your Lambda function, DynamoDB table, API Gateway, and CloudWatch monitoring.
Example (lib/serverless-pipeline-stack.ts):
```
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class ServerlessPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the DynamoDB table
    const table = new dynamodb.Table(this, 'ProcessedDataTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Define the Lambda function
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'upload.handler',
      environment: {
        TABLE_NAME: table.tableName, // Use table.tableName to dynamically reference the table name
      },
    });

    // Grant the Lambda function permission to write to the DynamoDB table
    table.grantWriteData(uploadHandler);

    // Create an API Gateway REST API to trigger the Lambda function
    const api = new apigateway.RestApi(this, 'UploadApi', {
      restApiName: 'Upload Service',
    });

    // Define an API resource and method
    const upload = api.root.addResource('upload');
    const integration = new apigateway.LambdaIntegration(uploadHandler);
    upload.addMethod('POST', integration);

    // CloudWatch metric and alarm
    const errorsMetric = uploadHandler.metricErrors();
    const errorsAlarm = new cloudwatch.Alarm(this, 'UploadErrorsAlarm', {
      metric: errorsMetric,
      threshold: 1,
      evaluationPeriods: 1,
    });
  }
}
```

### Bootstrap And Build Your AWS Environment:
* If your environment hasn’t been bootstrapped yet, run:
```
cdk bootstrap
```
* Build and Deploy Your CDK Stack:
```
npm run build
```
* Deploy your CDK stack to AWS:
```
cdk deploy
```
* Monitor the Deployment Output:
Note the API Gateway endpoint URL provided in the deployment output.

#### Test the API Using Docker
* Run the Docker Container
If you encounter issues with running curl on your system, you can use Docker to run the curl command in a container.
Replace <API_GATEWAY_URL> with the actual URL provided during the CDK deployment.
```
docker run --rm appropriate/curl -X POST https://<API_GATEWAY_URL>/upload -H "Content-Type: application/json" -d '{"data":"your text data here"}'
```
