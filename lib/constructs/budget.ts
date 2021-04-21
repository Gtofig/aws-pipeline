import { Construct } from "@aws-cdk/core";
import { CfnBudget } from "@aws-cdk/aws-budgets";

interface BudgetProps {
  budgetAmount: number;
  emailAddress: string;
}

export class Budget extends Construct {
  constructor(scope: Construct, id: string, props: BudgetProps) {
    super(scope, id);

    new CfnBudget(this, "Budget", {
      budget: {
        budgetLimit: {
          amount: props.budgetAmount,
          unit: "USD",
        },
        budgetName: "Monthly Budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
      },
      notificationsWithSubscribers: [
        {
          notification: {
            threshold: 100,
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "EMAIL",
              address: props.emailAddress,
            },
          ],
        },
      ],
    });
  }
}
