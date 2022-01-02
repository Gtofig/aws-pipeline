import * as Pipeline from "../lib/pipeline-stack";
import { App, Environment } from "aws-cdk-lib";
import { ServiceStack } from "../lib/service-stack";
import { PipelineStack } from "../lib/pipeline-stack";
import { BillingStack } from "../lib/billing-stack";
import { Match, Template } from "aws-cdk-lib/assertions";

const testEnv: Environment = {
  region: "us-east-1",
  account: "123456789",
};

test("Pipeline Stack", () => {
  const app = new App();
  // WHEN
  const stack = new Pipeline.PipelineStack(app, "MyTestStack", {
    env: testEnv,
  });
  // THEN

  expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});

test("Adding service stage", () => {
  // GIVEN
  const app = new App();
  const serviceStack = new ServiceStack(app, "ServiceStack", {
    env: testEnv,
    stageName: "Test",
  });
  const pipelineStack = new PipelineStack(app, "PipelineStack", {
    env: testEnv,
  });

  // WHEN
  pipelineStack.addServiceStage(serviceStack, "Test");

  // THEN
  Template.fromStack(pipelineStack).hasResourceProperties(
    "AWS::CodePipeline::Pipeline",
    {
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: "Test",
        }),
      ]),
    }
  );
});

test("Adding billing stack to a stage", () => {
  // GIVEN
  const app = new App();
  const serviceStack = new ServiceStack(app, "ServiceStack", {
    env: testEnv,
    stageName: "Test",
  });
  const pipelineStack = new PipelineStack(app, "PipelineStack", {
    env: testEnv,
  });
  const billingStack = new BillingStack(app, "BillingStack", {
    env: testEnv,
    budgetAmount: 5,
    emailAddress: "test@example.com",
  });
  const testStage = pipelineStack.addServiceStage(serviceStack, "Test");

  // WHEN
  pipelineStack.addBillingStackToStage(billingStack, testStage);

  // THEN
  Template.fromStack(pipelineStack).hasResourceProperties(
    "AWS::CodePipeline::Pipeline",
    {
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: Match.arrayWith([
            Match.objectLike({
              Name: "Billing_Update",
            }),
          ]),
        }),
      ]),
    }
  );
});
