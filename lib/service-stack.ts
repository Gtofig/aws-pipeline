import { CfnOutput, Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  Alias,
  CfnParametersCode,
  Code,
  Function,
  Runtime,
} from "@aws-cdk/aws-lambda";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import {
  LambdaDeploymentConfig,
  LambdaDeploymentGroup,
} from "@aws-cdk/aws-codedeploy";

interface ServiceStackProps extends StackProps {
  stageName: string;
}

export class ServiceStack extends Stack {
  public readonly serviceCode: CfnParametersCode;
  public readonly serviceEndpointOutput: CfnOutput;
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    this.serviceCode = Code.fromCfnParameters();

    const lambda = new Function(this, "ServiceLambda", {
      runtime: Runtime.NODEJS_14_X,
      handler: "src/lambda.handler",
      code: this.serviceCode,
      functionName: `ServiceLambda${props.stageName}`,
      description: `Generated on ${new Date().toISOString()}`,
    });

    const alias = new Alias(this, "ServiceLambdaAlias", {
      version: lambda.currentVersion,
      aliasName: `ServiceLambdaAlias${props.stageName}`,
    });

    const httpApi = new HttpApi(this, "ServiceAPI", {
      defaultIntegration: new LambdaProxyIntegration({
        handler: alias,
      }),
      apiName: `MyService${props.stageName}`,
    });

    if (props.stageName === "Prod") {
      new LambdaDeploymentGroup(this, "DeploymentGroup", {
        alias: alias,
        deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
      });
    }

    this.serviceEndpointOutput = new CfnOutput(this, "ApiEndpointOutput", {
      exportName: `ServiceEndpoint${props.stageName}`,
      value: httpApi.apiEndpoint,
      description: "API Endpoint",
    });
  }
}
