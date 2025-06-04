import {IsString, IsOptional} from 'class-validator';

export class GoogleCalendarConfigDto {
    @IsString()
    clientId: string;

    @IsString()
    clientSecret: string;

    @IsString()
    redirectUri: string;

    @IsOptional()
    @IsString()
    accessToken?: string;

    @IsOptional()
    @IsString()
    refreshToken?: string;

    @IsOptional()
    @IsString()
    calendarId?: string;
}
