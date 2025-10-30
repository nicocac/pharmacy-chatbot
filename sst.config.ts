/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "pharmacy-chatbot",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.Function("PharmacyChatbotApi", {
      handler: "./backend/dist/lambda.handler",
      runtime: "nodejs20.x",
      memory: "1 GB",
      timeout: "30 seconds",
      environment: {
        NODE_ENV: "production",
        PHARMACY_API_URL: "https://67e14fb758cc6bf785254550.mockapi.io/pharmacies",
      },
      url: true,
    });

    // Secret for OpenAI API Key
    const openAiSecret = new sst.aws.Secret("OpenAIAPIKey");

    // Link the secret to the function
    api.linkTo([openAiSecret]);

    // Frontend hosting with SST's StaticSite
    const frontend = new sst.aws.StaticSite("PharmacyChatbotFrontend", {
      build: {
        command: "npm run build",
        output: "build",
      },
      path: "./frontend",
      environment: {
        REACT_APP_API_URL: api.url,
      },
    });

    return {
      api: api.url,
      frontend: frontend.url,
      secretName: openAiSecret.name,
    };
  },
});