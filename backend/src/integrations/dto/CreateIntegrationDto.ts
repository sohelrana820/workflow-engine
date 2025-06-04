export class CreateIntegrationDto {
    integrationType: string;
    integrationName: string;
    integrationConfig: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        accessToken: string;
        refreshToken: string;
    };
}
