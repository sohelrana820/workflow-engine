import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum IntegrationStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ERROR = 'ERROR',
    PENDING = 'PENDING',
}

export enum IntegrationType {
    GOOGLE_CALENDAR = 'google_calendar',
    OPENAI = 'openai',
    SLACK = 'slack',
    CRM = 'crm',
    EMAIL = 'email',
    WEBHOOK = 'webhook',
    API = 'api',
}

@Entity('integrations')
@Index(['integrationType'], {unique: true}) // One integration per type
export class Integration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: IntegrationType,
        unique: true,
    })
    integrationType: IntegrationType;

    @Column()
    integrationName: string; // Display name like "My Google Calendar"

    @Column({type: 'jsonb'})
    integrationConfig: Record<string, any>; // Store configuration as JSON

    @Column({
        type: 'enum',
        enum: IntegrationStatus,
        default: IntegrationStatus.ACTIVE,
    })
    status: IntegrationStatus;

    @Column({type: 'text', nullable: true})
    description: string;

    @Column({type: 'timestamp', nullable: true})
    lastTestedAt: Date;

    @Column({type: 'text', nullable: true})
    lastErrorMessage: string | null;

    @Column({default: true})
    isEnabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
