import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
  SynthUtils,
  haveResourceLike,
  arrayWith,
  objectLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as Pipeline from "../lib/pipeline-stack";
import { App, Environment } from "@aws-cdk/core";
import { ServiceStack } from "../lib/service-stack";
import { PipelineStack } from "../lib/pipeline-stack";
import { BillingStack } from "../lib/billing-stack";

const testEnv: Environment = {
  region: "us-east-1",
  account: "123456789",
};

test("Pipeline Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Pipeline.PipelineStack(app, "MyTestStack", {
    env: testEnv,
  });
  // THEN

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
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
  expectCDK(pipelineStack).to(
    haveResourceLike("AWS::CodePipeline::Pipeline", {
      Stages: arrayWith(
        objectLike({
          Name: "Test",
        })
      ),
    })
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
  expectCDK(pipelineStack).to(
    haveResourceLike("AWS::CodePipeline::Pipeline", {
      Stages: arrayWith(
        objectLike({
          Actions: arrayWith(
            objectLike({
              Name: "Billing_Update",
            })
          ),
        })
      ),
    })
  );
});
