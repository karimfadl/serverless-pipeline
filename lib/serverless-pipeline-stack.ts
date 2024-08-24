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

