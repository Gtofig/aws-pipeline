import * as cdk from "@aws-cdk/core";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import { GitHubSourceAction } from "@aws-cdk/aws-codepipeline-actions";
import { SecretValue } from "@aws-cdk/core";

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, "Pipeline", {
      pipelineName: "Pipeline",
      crossAccountKeys: false,
    });

    const sourceOutput = new Artifact("SourceOutput");

    pipeline.addStage({
      stageName: "Source",
      actions: [
        new GitHubSourceAction({
          owner: "Gtofig",
          repo: "aws-pipeline",
          branch: "master",
          actionName: "Pipeline Source",
          oauthToken: SecretValue.secretsManager("github-token"),
          output: sourceOutput,
        }),
      ],
    });
  }
}
