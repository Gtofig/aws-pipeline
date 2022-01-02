import { App, Stack } from "aws-cdk-lib";
import { ServiceHealthCanary } from "../../lib/constructs/service-health-canary";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Template } from "aws-cdk-lib/assertions";

test("ServiceHealthCanary", () => {
  const app = new App();
  const stack = new Stack(app, "TestStack");

  new ServiceHealthCanary(stack, "TestCanary", {
    apiEndpoint: "api.example.com",
    canaryName: "test-canary",
    alarmTopic: new Topic(stack, "TestAlarmTopic"),
  });

  Template.fromStack(stack).hasResourceProperties("AWS::Synthetics::Canary", {
    RunConfig: {
      EnvironmentVariables: {
        API_ENDPOINT: "api.example.com",
      },
    },
  });
});
