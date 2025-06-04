import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn} from 'typeorm';

@Entity('action_results')
export class ActionResult {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    stepExecutionId: string;

    @Column()
    workflowId: string;

    @Column({nullable: true, default: null})
    previousStepId: string;

    @Column()
    stepId: string;

    @Column()
    actionType: string;

    @Column()
    status: string; // SUCCESS, FAILED

    // Make the column nullable
    @Column({type: 'jsonb', nullable: true, default: {}})
    result: string;

    @CreateDateColumn()
    createdAt: Date;
}
