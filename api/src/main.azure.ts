import { Context, HttpRequest, AzureFunction } from '@azure/functions';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let cachedExpressApp: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://cbbchurchstme7zjwdj.z13.web.core.windows.net',
      /.azurewebsites.net$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export const handler: AzureFunction = async (context: Context, req: HttpRequest) => {
  if (!cachedExpressApp) {
    cachedExpressApp = await bootstrap();
  }

  return new Promise<void>((resolve) => {
    // Express middleware expects (req, res, next)
    // Azure's context.res is a ServerResponse-like object
    cachedExpressApp(req, context.res || {});
    
    // Wait for response to be handled or timeout
    if (context.res) {
      context.res.on?.('finish', () => resolve());
      context.res.on?.('close', () => resolve());
    }
    
    setTimeout(() => resolve(), 3000);
  });
};
