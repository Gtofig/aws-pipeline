import * as cdk from "@aws-cdk/core";
import { SecretValue } from "@aws-cdk/core";
import { Artifact, IStage, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  CodeBuildActionType,
  GitHubSourceAction,
} from "@aws-cdk/aws-codepipeline-actions";
import {
  BuildEnvironmentVariableType,
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "@aws-cdk/aws-codebuild";
import { ServiceStack } from "./service-stack";
import { BillingStack } from "./billing-stack";
import { SnsTopic } from "@aws-cdk/aws-events-targets";
import { Topic } from "@aws-cdk/aws-sns";
import { EventField, RuleTargetInput } from "@aws-cdk/aws-events";
import { EmailSubscription } from "@aws-cdk/aws-sns-subscriptions";

export class PipelineStack extends cdk.Stack {
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.pipelineNotificationsTopic = new Topic(
      this,
      "PipelineNotificationsTopic",
      {
        topicName: "PipelineNotifications",
      }
    );

    this.pipelineNotificationsTopic.addSubscription(
      new EmailSubscription("Gtofig@hotmail.com")
    );

    this.pipeline = new Pipeline(this, "Pipeline", {
      pipelineName: "Pipeline",
      crossAccountKeys: true,
      restartExecutionOnUpdate: true,
    });

    const cdkSourceOutput = new Artifact("CDKSourceOutput");
    this.serviceSourceOutput = new Artifact("ServiceSourceOutput");

    this.pipeline.addStage({
      stageName: "Source",
      actions: [
        new GitHubSourceAction({
          owner: "Gtofig",
          repo: "aws-pipeline",
          branch: "master",
          actionName: "Pipeline_Source",
          oauthToken: SecretValue.secretsManager("github-token"),
          output: cdkSourceOutput,
        }),
        new GitHubSourceAction({
          owner: "Gtofig",
          repo: "express-lambda",
          branch: "master",
          actionName: "Service_Source",
          oauthToken: SecretValue.secretsManager("github-token"),
          output: this.serviceSourceOutput,
        }),
      ],
    });

    this.cdkBuildOutput = new Artifact("CdkBuildOutput");
    this.serviceBuildOutput = new Artifact("ServiceBuildOutput");

    this.pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodeBuildAction({
          actionName: "CDK_Build",
          input: cdkSourceOutput,
          outputs: [this.cdkBuildOutput],
          project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
            ),
          }),
        }),
        new CodeBuildAction({
          actionName: "Service_Build",
          input: this.serviceSourceOutput,
          outputs: [this.serviceBuildOutput],
          project: new PipelineProject(this, "ServiceBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/service-build-spec.yml"
            ),
          }),
        }),
      ],
    });

    this.pipeline.addStage({
      stageName: "Pipeline_Update",
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: "Pipeline_Update",
          stackName: "PipelineStack",
          templatePath: this.cdkBuildOutput.atPath(
            "PipelineStack.template.json"
          ),
          adminPermissions: true,
        }),
      ],
    });
  }

  public addServiceStage(
    serviceStack: ServiceStack,
    stageName: string
  ): IStage {
    return this.pipeline.addStage({
      stageName: stageName,
      actions: [
        new CloudFormationCreateUpdateStackAction({
          account: serviceStack.account,
          region: serviceStack.region,
          actionName: "Service_Update",
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(
            `${serviceStack.stackName}.template.json`
          ),
          adminPermissions: true,
          parameterOverrides: {
            ...serviceStack.serviceCode.assign(
              this.serviceBuildOutput.s3Location
            ),
          },
          extraInputs: [this.serviceBuildOutput],
        }),
      ],
    });
  }

  public addBillingStackToStage(billingStack: BillingStack, stage: IStage) {
    stage.addAction(
      new CloudFormationCreateUpdateStackAction({
        actionName: "Billing_Update",
        stackName: billingStack.stackName,
        templatePath: this.cdkBuildOutput.atPath(
          `${billingStack.stackName}.template.json`
        ),
        adminPermissions: true,
      })
    );
  }

  public addServiceIntegrationTestToStage(
    stage: IStage,
    serviceEndpoint: string
  ) {
    const integTestAction = new CodeBuildAction({
      actionName: "Integration_Tests",
      input: this.serviceSourceOutput,
      project: new PipelineProject(this, "ServiceIntegrationTestsProject", {
        environment: {
          buildImage: LinuxBuildImage.STANDARD_5_0,
        },
        buildSpec: BuildSpec.fromSourceFilename(
          "build-specs/integ-test-build-spec.yml"
        ),
      }),
      environmentVariables: {
        SERVICE_ENDPOINT: {
          value: serviceEndpoint,
          type: BuildEnvironmentVariableType.PLAINTEXT,
        },
      },
      type: CodeBuildActionType.TEST,
      runOrder: 2,
    });
    stage.addAction(integTestAction);
    integTestAction.onStateChange(
      "IntegrationTestFailed",
      new SnsTopic(this.pipelineNotificationsTopic, {
        message: RuleTargetInput.fromText(
          `Integration Test Failed. See details here: ${EventField.fromPath(
            "$.detail.execution-result.external-execution-url"
          )}`
        ),
      }),
      {
        ruleName: "IntegrationTestFailed",
        eventPattern: {
          detail: {
            state: ["FAILED"],
          },
        },
        description: "Integration test has failed",
      }
    );
  }
}
