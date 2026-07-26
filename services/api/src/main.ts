import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Runtime validation on every request — security requirement from the
  // skill ("runtime input validation"). Strips unknown fields rather than
  // trusting whatever the client sends.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  );

  app.enableCors({ origin: true, credentials: true });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Raksha Grid API listening on :${port}`);
}

bootstrap();
