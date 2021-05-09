module.exports = {
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-reports",
        outputName: "test-report.xml",
      },
    ],
  ],
};
