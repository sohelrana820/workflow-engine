export default class RmqEnum {
    public static readonly WORKFLOW_EXECUTION_EXCHANGE: string =
        'workflow_execution_exchange';
    public static readonly WORKFLOW_EXECUTION_ROUTING: string =
        'workflow_execution_routing';
    public static readonly WORKFLOW_EXECUTION_QUEUE: string =
        'workflow_execution_queue';

    public static readonly WORKFLOW_EXECUTION_DLX_EXCHANGE: string =
        'workflow_execution_dlx_exchange';
    public static readonly WORKFLOW_EXECUTION_DLX_ROUTING: string =
        'workflow_execution_dlx_routing';
    public static readonly WORKFLOW_EXECUTION_DLX_QUEUE: string =
        'workflow_execution_dlx_queue';

    public static readonly WORKFLOW_INVOKER_EXCHANGE: string =
        'workflow_invoker_exchange';
    public static readonly WORKFLOW_INVOKER_ROUTING: string =
        'workflow_invoker_routing';
    public static readonly WORKFLOW_INVOKER_QUEUE: string =
        'workflow_invoker_queue';
}
