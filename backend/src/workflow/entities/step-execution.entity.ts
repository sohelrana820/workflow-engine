import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {StepStatus} from '../../common/enums/step-status.enum';

@Entity('step_executions')
export class StepExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    workflowExecutionId: string;

    @Column()
    workflowId: string;

    @Column({nullable: true, default: null})
    previousStepId: string;

    @Column()
    stepId: string;

    @Column()
    stepType: string;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: StepStatus,
        default: StepStatus.QUEUED
    })
    status: StepStatus;

    @Column({type: 'jsonb'})
    stepDefinition: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({nullable: true})
    completedAt: Date;
}
