import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';1
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://tugas-akhir-web-lomba.vercel.app',
    ],
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
