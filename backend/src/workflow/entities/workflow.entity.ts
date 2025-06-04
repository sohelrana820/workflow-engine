import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {WorkflowStatus} from '../../common/enums/workflow-status.enum';

@Entity('workflows') // or 'workflows' depending on your naming
export class Workflow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({unique: true})
    workflowId: string;

    @Column()
    name: string;

    // Make the column nullable with default value
    @Column({nullable: true, default: ''})
    description: string;

    @Column()
    version: string;

    @Column({
        type: 'enum',
        enum: WorkflowStatus,
        default: WorkflowStatus.ACTIVE
    })
    status: WorkflowStatus;

    @Column({type: 'jsonb'})
    nodes: string;

    @Column({type: 'jsonb', nullable: true, default: {}})
    metadata: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
