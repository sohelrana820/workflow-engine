import {IsString, IsOptional} from 'class-validator';

export class SlackConfigDto {
    @IsOptional()
    @IsString()
    webhookUrl?: string;

    @IsOptional()
    @IsString()
    botToken?: string;

    @IsOptional()
    @IsString()
    defaultChannel?: string;
}
