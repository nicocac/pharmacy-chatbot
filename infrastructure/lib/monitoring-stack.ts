import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  ecsClusterName: string;
  ecsServiceName: string;
  logGroupName: string;
  cloudfrontDistributionId: string;
  loadBalancerArn: string;
  alertEmail?: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      displayName: 'Pharmacy Chatbot Alerts',
    });

    if (props.alertEmail) {
      alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'PharmacyChatbotDashboard', {
      dashboardName: 'PharmacyChatbot-Monitoring',
    });

    // ECS Service Metrics
    const cpuUtilizationMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        ServiceName: props.ecsServiceName,
        ClusterName: props.ecsClusterName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const memoryUtilizationMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'MemoryUtilization',
      dimensionsMap: {
        ServiceName: props.ecsServiceName,
        ClusterName: props.ecsClusterName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // Application Load Balancer Metrics
    const requestCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCount',
      dimensionsMap: {
        LoadBalancer: props.loadBalancerArn.split('/').slice(-3).join('/'),
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const responseTimeMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'TargetResponseTime',
      dimensionsMap: {
        LoadBalancer: props.loadBalancerArn.split('/').slice(-3).join('/'),
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const httpErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'HTTPCode_ELB_5XX_Count',
      dimensionsMap: {
        LoadBalancer: props.loadBalancerArn.split('/').slice(-3).join('/'),
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // CloudFront Metrics
    const cloudfrontRequestsMetric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'Requests',
      dimensionsMap: {
        DistributionId: props.cloudfrontDistributionId,
        Region: 'Global',
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const cloudfrontErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: '4xxErrorRate',
      dimensionsMap: {
        DistributionId: props.cloudfrontDistributionId,
        Region: 'Global',
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // Custom Log Metrics
    const errorLogMetric = new logs.MetricFilter(this, 'ErrorLogMetric', {
      logGroup: logs.LogGroup.fromLogGroupName(this, 'BackendLogGroup', props.logGroupName),
      metricNamespace: 'PharmacyChatbot',
      metricName: 'ErrorCount',
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error'),
      metricValue: '1',
    });

    // Alarms
    const highCpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      metric: cpuUtilizationMetric,
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High CPU utilization in ECS service',
    });
    highCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    const highMemoryAlarm = new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      metric: memoryUtilizationMetric,
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High memory utilization in ECS service',
    });
    highMemoryAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    const highResponseTimeAlarm = new cloudwatch.Alarm(this, 'HighResponseTimeAlarm', {
      metric: responseTimeMetric,
      threshold: 2, // 2 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High response time from load balancer',
    });
    highResponseTimeAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    const httpErrorsAlarm = new cloudwatch.Alarm(this, 'HttpErrorsAlarm', {
      metric: httpErrorsMetric,
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High number of HTTP 5xx errors',
    });
    httpErrorsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    const errorLogsAlarm = new cloudwatch.Alarm(this, 'ErrorLogsAlarm', {
      metric: errorLogMetric.metric(),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High number of application errors in logs',
    });
    errorLogsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // Dashboard Widgets
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS Service Metrics',
        left: [cpuUtilizationMetric, memoryUtilizationMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Load Balancer Metrics',
        left: [requestCountMetric],
        right: [responseTimeMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Error Metrics',
        left: [httpErrorsMetric, cloudfrontErrorsMetric],
        right: [errorLogMetric.metric()],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'CloudFront Metrics',
        left: [cloudfrontRequestsMetric],
        width: 12,
        height: 6,
      }),
    );

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS Alert Topic ARN',
    });
  }
}