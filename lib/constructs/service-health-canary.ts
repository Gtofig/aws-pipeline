import { Construct, Duration } from "@aws-cdk/core";
import { Canary, Code, Runtime, Schedule, Test } from "@aws-cdk/aws-synthetics";
import * as fs from "fs";
import * as path from "path";

interface ServiceHealthCanaryProps {
  apiEndpoint: string;
  canaryName: string;
}

export class ServiceHealthCanary extends Construct {
  constructor(scope: Construct, id: string, props: ServiceHealthCanaryProps) {
    super(scope, id);

    new Canary(this, props.canaryName, {
      runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_1,
      canaryName: props.canaryName,
      schedule: Schedule.rate(Duration.minutes(1)),
      environmentVariables: {
        API_ENDPOINT: props.apiEndpoint,
        DEPLOYMENT_TRIGGER: Date.now().toString(),
      },
      test: Test.custom({
        code: Code.fromInline(
          fs.readFileSync(
            path.join(__dirname, "../../canary/canary.ts"),
            "utf8"
          )
        ),
        handler: "index.handler",
      }),
      timeToLive: Duration.minutes(5),
    });
  }
}
