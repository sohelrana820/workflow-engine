import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import * as express from 'express';

/**
 * This is the main entry point of the application.
 */
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(
        express.json({
            type: ['application/cloudevents+json', 'application/json'],
        }),
    );
    app.enableCors({
        origin: '*', // or use an array for multiple domains
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    });
    await app.listen(3000);
}

bootstrap().then(() => {
});
