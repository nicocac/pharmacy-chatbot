import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class PharmacyChatbotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'PharmacyChatbotVpc', {
      maxAzs: 2,
      natGateways: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // ECR Repositories
    const backendRepo = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: 'pharmacy-chatbot-backend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          maxImageCount: 10,
        },
      ],
    });

    const frontendRepo = new ecr.Repository(this, 'FrontendRepository', {
      repositoryName: 'pharmacy-chatbot-frontend', 
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          maxImageCount: 10,
        },
      ],
    });

    // Secrets Manager for OpenAI API Key
    const openAiSecret = new secretsmanager.Secret(this, 'OpenAISecret', {
      description: 'OpenAI API Key for Pharmacy Chatbot',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ openai_api_key: '' }),
        generateStringKey: 'openai_api_key',
        excludeCharacters: '"@/\\',
      },
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'PharmacyChatbotCluster', {
      vpc,
      containerInsights: true,
    });

    // CloudWatch Log Groups
    const backendLogGroup = new logs.LogGroup(this, 'BackendLogGroup', {
      logGroupName: '/aws/ecs/pharmacy-chatbot-backend',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Backend Service (Fargate)
    const backendService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(backendRepo, 'latest'),
        containerPort: 3001,
        environment: {
          NODE_ENV: 'production',
          PORT: '3001',
          PHARMACY_API_URL: 'https://67e14fb758cc6bf785254550.mockapi.io/pharmacies',
        },
        secrets: {
          OPENAI_API_KEY: ecs.Secret.fromSecretsManager(openAiSecret, 'openai_api_key'),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'backend',
          logGroup: backendLogGroup,
        }),
      },
      publicLoadBalancer: true,
      healthCheckGracePeriod: cdk.Duration.seconds(300),
    });

    // Configure health check
    backendService.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Auto Scaling
    const backendScaling = backendService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });

    backendScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // S3 Bucket for Frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `pharmacy-chatbot-frontend-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudFront Distribution for Frontend
    const cloudFrontOAI = new cloudfront.OriginAccessIdentity(this, 'CloudFrontOAI', {
      comment: 'OAI for Pharmacy Chatbot Frontend',
    });

    frontendBucket.grantRead(cloudFrontOAI);

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(frontendBucket, {
          originAccessIdentity: cloudFrontOAI,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new cloudfrontOrigins.LoadBalancerV2Origin(backendService.loadBalancer, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Output values
    new cdk.CfnOutput(this, 'BackendRepositoryUri', {
      value: backendRepo.repositoryUri,
      description: 'Backend ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'FrontendRepositoryUri', {
      value: frontendRepo.repositoryUri,
      description: 'Frontend ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'BackendLoadBalancerDNS', {
      value: backendService.loadBalancer.loadBalancerDnsName,
      description: 'Backend Load Balancer DNS Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'OpenAISecretArn', {
      value: openAiSecret.secretArn,
      description: 'OpenAI Secret ARN',
    });

    new cdk.CfnOutput(this, 'ECSClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'BackendServiceName', {
      value: backendService.service.serviceName,
      description: 'Backend ECS Service Name',
    });
  }
}