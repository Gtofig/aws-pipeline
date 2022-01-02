import { Stack, StackProps } from "aws-cdk-lib";
import { Budget } from "./constructs/budget";
import { Construct } from "constructs";

interface BillingStackProps extends StackProps {
  budgetAmount: number;
  emailAddress: string;
}

export class BillingStack extends Stack {
  constructor(scope: Construct, id: string, props: BillingStackProps) {
    super(scope, id, props);

    new Budget(this, "Budget", {
      budgetAmount: props.budgetAmount,
      emailAddress: props.emailAddress,
    });
  }
}
