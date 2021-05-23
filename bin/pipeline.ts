#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { PipelineStack } from "../lib/pipeline-stack";
import { BillingStack } from "../lib/billing-stack";
import { ServiceStack } from "../lib/service-stack";

const app = new cdk.App();
const pipelineStack = new PipelineStack(app, "PipelineStack", {});
new BillingStack(app, "BillingStack", {
  budgetAmount: 5,
  emailAddress: "gtofig@hotmail.com",
});

const serviceStackProd = new ServiceStack(app, "ServiceStackProd");

pipelineStack.addServiceStage(serviceStackProd, "Prod");
