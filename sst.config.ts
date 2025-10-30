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
      handler: "backend/src/lambda.handler",
      runtime: "nodejs20.x",
      memory: "1 GB",
      timeout: "30 seconds",
      environment: {
        NODE_ENV: "production",
        PHARMACY_API_URL: "https://67e14fb758cc6bf785254550.mockapi.io/pharmacies",
        OPENAI_API_KEY: "placeholder-will-be-set-later",
      },
      nodejs: {
        esbuild: {
          external: [
            "@nestjs/websockets",
            "@nestjs/microservices", 
            "@grpc/grpc-js",
            "@grpc/proto-loader",
            "kafkajs",
            "mqtt",
            "nats",
            "ioredis",
            "amqplib",
            "amqp-connection-manager",
            "@nestjs/platform-socket.io"
          ]
        }
      },
      url: true,
    });

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
    };
  },
});