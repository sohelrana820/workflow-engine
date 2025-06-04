import {NodeTypesEnum} from '../enums/node-types.enum';

export class Workflow {
    id?: string;
    name: string = '';
    nodes: WorkflowNode[] = [];
}

export class ContactData {
    name: string = '';
    title: string = '';
    company: string = '';
    last_touch: string = '';
    recent_notes: string = '';
}

export class InitialContactData {
    contact: ContactData = new ContactData();
}

export class WorkflowNode {
    id: string = '';
    type:
        | NodeTypesEnum.TRIGGER
        | NodeTypesEnum.ENRICH
        | NodeTypesEnum.FETCH_RECENT_ACTIVITY
        | NodeTypesEnum.AI_SUMMARIZE_MEETING
        | NodeTypesEnum.SLACK_ALERT
        | NodeTypesEnum.EMAIL_SEND = NodeTypesEnum.TRIGGER; // Set a safe default if possible
    config?: never;
    nextNodeId?: string;
}
