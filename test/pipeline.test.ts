import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
  SynthUtils,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as Pipeline from "../lib/pipeline-stack";

test("Pipeline Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Pipeline.PipelineStack(app, "MyTestStack");
  // THEN

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
