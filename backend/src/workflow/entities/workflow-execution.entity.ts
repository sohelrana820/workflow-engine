import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {WorkflowStatus} from '../../common/enums/workflow-status.enum';

@Entity('workflow_executions')
@Entity()
export class WorkflowExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    workflowId: string;

    @Column({
        type: 'enum',
        enum: WorkflowStatus,
        default: WorkflowStatus.PROCESSING
    })
    status: WorkflowStatus;

    @Column({type: 'jsonb', nullable: true})
    context: string;

    @CreateDateColumn()
    startedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({nullable: true})
    completedAt: Date;
}
