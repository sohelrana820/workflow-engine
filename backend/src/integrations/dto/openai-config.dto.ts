import {IsString, IsOptional} from 'class-validator';

export class OpenAIConfigDto {
    @IsString()
    apiKey: string;

    @IsOptional()
    @IsString()
    organizationId?: string;

    @IsOptional()
    @IsString()
    defaultModel?: string;

    @IsOptional()
    @IsString()
    baseUrl?: string;
}
