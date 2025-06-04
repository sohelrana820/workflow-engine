import {Workflow} from '../types/workflow';

export const getWorkflowTemplate = (): any => {

    return {
        "id": "workflow-1749049311817",
        "name": "Meeting Summary & Follow-up",
        "description": "Workflow with 8 nodes",
        "version": "1.0",
        "nodes": [
            {
                "id": "trigger-1749048352000-50zewdjuq",
                "type": "trigger",
                "name": "Trigger Node",
                "position": {
                    "x": 162.01040649414062,
                    "y": 249.86804962158203
                },
                "actions": {
                    "google_calendar": {
                        "name": "Google Calendar",
                        "config": {
                            "action_type": "get_upcoming_events",
                            "time_range": {
                                "hours_ahead": 24
                            },
                            "max_results": 10
                        },
                        "output_data": {
                            "event_id": "string",
                            "event_title": "string",
                            "event_summery": "string",
                            "event_description": "string",
                            "event_start_time": "string",
                            "event_end_time": "string",
                            "event_date": "string",
                            "event_organizer_name": "string",
                            "event_attendees_name": "string",
                            "event_attendees_email": "string"
                        },
                        "outputs": [
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email"
                        ]
                    }
                },
                "next_steps": [
                    {
                        "id": "enrichment-1749048380467-vvbfy9olq",
                        "type": "enrichment",
                        "condition": "always",
                        "input_data": [
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email"
                        ],
                        "conditionType": "if_not_empty",
                        "conditionField": "event_id",
                        "label": "If event_id exists"
                    },
                    {
                        "id": "fetch-1749048408702-9suzafsce",
                        "type": "fetch",
                        "condition": "always",
                        "input_data": [
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email"
                        ],
                        "conditionType": "if_not_empty",
                        "conditionField": "event_id",
                        "label": "If event_id exists"
                    },
                    {
                        "id": "notification-1749048699686-wwuk24n9p",
                        "type": "notification",
                        "condition": "always",
                        "input_data": [
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email"
                        ],
                        "conditionType": "if_empty",
                        "conditionField": "event_id",
                        "label": "If event_id is empty"
                    }
                ],
                "variables": [],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": []
            },
            {
                "id": "enrichment-1749048380467-vvbfy9olq",
                "type": "enrichment",
                "name": "Enrichment Node",
                "position": {
                    "x": 607.0104064941406,
                    "y": 96.86804962158203
                },
                "actions": {
                    "enrich": {
                        "name": "Information Enrich",
                        "config": {
                            "action": "getCustomerHistory",
                            "customerEmail": "{event_attendees_email}"
                        },
                        "output_data": {
                            "first_name": "string",
                            "last_name": "number",
                            "name": "string",
                            "email": "string",
                            "company": "string",
                            "job_title": "string"
                        },
                        "outputs": [
                            "first_name",
                            "last_name",
                            "name",
                            "email",
                            "company",
                            "job_title"
                        ]
                    }
                },
                "next_steps": [
                    {
                        "id": "ai-1749048427555-mbtp0odgf",
                        "type": "ai",
                        "condition": "always",
                        "input_data": [
                            "first_name",
                            "last_name",
                            "name",
                            "email",
                            "company",
                            "job_title",
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email",
                            "purchase_history",
                            "interaction_notes",
                            "last_contact_date"
                        ],
                        "conditionType": "always",
                        "label": "Success"
                    }
                ],
                "variables": [
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email"
                ]
            },
            {
                "id": "fetch-1749048408702-9suzafsce",
                "type": "fetch",
                "name": "Fetch Data Node",
                "position": {
                    "x": 607.0104064941406,
                    "y": 406.86804962158203
                },
                "actions": {
                    "crm": {
                        "name": "Fetch CRM Data",
                        "config": {},
                        "output_data": {
                            "purchase_history": "string",
                            "interaction_notes": "string",
                            "last_contact_date": "string"
                        },
                        "outputs": [
                            "purchase_history",
                            "interaction_notes",
                            "last_contact_date"
                        ]
                    }
                },
                "next_steps": [
                    {
                        "id": "ai-1749048427555-mbtp0odgf",
                        "type": "ai",
                        "condition": "always",
                        "input_data": [
                            "first_name",
                            "last_name",
                            "name",
                            "email",
                            "company",
                            "job_title",
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email",
                            "purchase_history",
                            "interaction_notes",
                            "last_contact_date"
                        ],
                        "conditionType": "always",
                        "label": "Success"
                    }
                ],
                "variables": [
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email"
                ]
            },
            {
                "id": "ai-1749048427555-mbtp0odgf",
                "type": "ai",
                "name": "AI Processing Node",
                "position": {
                    "x": 990.0104064941406,
                    "y": 242.86804962158203
                },
                "actions": {
                    "open_ai": {
                        "name": "OpenAI Summary",
                        "config": {
                            "model": "gpt-4",
                            "max_tokens": 500,
                            "prompt": "You are a meeting assistant. Based on the information provided below, generate a Slack-ready meeting summary that includes:\n" +
                                "\n" +
                                "🔎 Summary:\n" +
                                "\n" +
                                "Use 3–5 bullet points summarizing key insights from interaction notes, event description, and history\n" +
                                "\n" +
                                "Include customer interests, concerns, recent activity, or any blockers (e.g., budget, timeline)\n" +
                                "\n" +
                                "💬 Suggested opener:\n" +
                                "Craft a warm, 1-sentence conversational line to kick off the meeting that aligns with the customer’s goals or challenges\n" +
                                "\n" +
                                "🧠 Goal:\n" +
                                "State the primary meeting objective (e.g., qualify lead, clarify scope, move deal forward, address objections)\n" +
                                "\n" +
                                "Input Data:\n" +
                                "\n" +
                                "Name: {{name}}\n" +
                                "\n" +
                                "Email: {{email}}\n" +
                                "\n" +
                                "Company: {{company}}\n" +
                                "\n" +
                                "Job Title: {{job_title}}\n" +
                                "\n" +
                                "Event: {{event_title}}\n" +
                                "\n" +
                                "Date: {{event_date}}\n" +
                                "\n" +
                                "Time: {{event_start_time}}\n" +
                                "\n" +
                                "Description: {{event_description}}\n" +
                                "\n" +
                                "Purchase History: {{purchase_history}}\n" +
                                "\n" +
                                "Interaction Notes: {{interaction_notes}}\n" +
                                "\n" +
                                "Last Contact: {{last_contact_date}}\n" +
                                "\n" +
                                "Keep the message concise, action-focused, and ready to paste into Slack."
                        },
                        "output_data": {
                            "ai_summary": "string"
                        },
                        "outputs": [
                            "ai_summary"
                        ]
                    }
                },
                "next_steps": [
                    {
                        "id": "notification-1749048525367-vt44ow4zr",
                        "type": "notification",
                        "condition": "always",
                        "input_data": [
                            "ai_summary",
                            "first_name",
                            "last_name",
                            "name",
                            "email",
                            "company",
                            "job_title",
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email",
                            "purchase_history",
                            "interaction_notes",
                            "last_contact_date"
                        ],
                        "conditionType": "always",
                        "label": "Success"
                    }
                ],
                "variables": [
                    "{first_name}",
                    "{last_name}",
                    "{name}",
                    "{email}",
                    "{company}",
                    "{job_title}",
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}",
                    "{purchase_history}",
                    "{interaction_notes}",
                    "{last_contact_date}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "first_name",
                    "last_name",
                    "name",
                    "email",
                    "company",
                    "job_title",
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email",
                    "purchase_history",
                    "interaction_notes",
                    "last_contact_date"
                ]
            },
            {
                "id": "notification-1749048525367-vt44ow4zr",
                "type": "notification",
                "name": "Notification Node",
                "position": {
                    "x": 1334.0104064941406,
                    "y": 241.86804962158203
                },
                "actions": {
                    "slack": {
                        "name": "Slack Message",
                        "config": {
                            "channel": "#all-workflow",
                            "message": "Meeting Brief for {{event_title}}\n" +
                                "🕐 Time: {{event_date}} at {{event_start_time}}\n" +
                                "👤 Customer: {{name}} from {{company}}\n" +
                                "📋 Meeting Brief: {{ai_summary}}",
                            "webhook_url": "https://hooks.slack.com/services/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"
                        },
                        "output_data": {
                            "message": "string"
                        },
                        "outputs": [
                            "message"
                        ]
                    }
                },
                "next_steps": [
                    {
                        "id": "terminator-1749048579786-mm0l8quk9",
                        "type": "terminator",
                        "condition": "always",
                        "input_data": [
                            "message",
                            "ai_summary",
                            "first_name",
                            "last_name",
                            "name",
                            "email",
                            "company",
                            "job_title",
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email",
                            "purchase_history",
                            "interaction_notes",
                            "last_contact_date"
                        ],
                        "conditionType": "always",
                        "label": "Success"
                    }
                ],
                "variables": [
                    "{ai_summary}",
                    "{first_name}",
                    "{last_name}",
                    "{name}",
                    "{email}",
                    "{company}",
                    "{job_title}",
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}",
                    "{purchase_history}",
                    "{interaction_notes}",
                    "{last_contact_date}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "ai_summary",
                    "first_name",
                    "last_name",
                    "name",
                    "email",
                    "company",
                    "job_title",
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email",
                    "purchase_history",
                    "interaction_notes",
                    "last_contact_date"
                ]
            },
            {
                "id": "terminator-1749048579786-mm0l8quk9",
                "type": "terminator",
                "name": "End Node",
                "position": {
                    "x": 1657.0104064941406,
                    "y": 245.86804962158203
                },
                "actions": {
                    "terminator": {
                        "name": "Workflow Complete",
                        "config": {
                            "clear_temp_files": true,
                            "log_completion": true,
                            "update_workflow_status": "completed"
                        },
                        "output_data": {
                            "completion_time": "string",
                            "total_execution_time": "string",
                            "final_status": "string"
                        },
                        "outputs": [
                            "completion_time",
                            "total_execution_time",
                            "final_status"
                        ]
                    }
                },
                "next_steps": [],
                "variables": [
                    "{message}",
                    "{ai_summary}",
                    "{first_name}",
                    "{last_name}",
                    "{name}",
                    "{email}",
                    "{company}",
                    "{job_title}",
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}",
                    "{purchase_history}",
                    "{interaction_notes}",
                    "{last_contact_date}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "message",
                    "ai_summary",
                    "first_name",
                    "last_name",
                    "name",
                    "email",
                    "company",
                    "job_title",
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email",
                    "purchase_history",
                    "interaction_notes",
                    "last_contact_date"
                ]
            },
            {
                "id": "notification-1749048699686-wwuk24n9p",
                "type": "notification",
                "name": "Notification Node",
                "position": {
                    "x": 622.4604064941407,
                    "y": 684.5930496215819
                },
                "actions": {
                    "slack": {
                        "name": "Slack Message",
                        "config": {
                            "channel": "#all-workflow",
                            "message": "No upcoming events found in the next 24 hours. Your calendar is clear!",
                            "webhook_url": "https://hooks.slack.com/services/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"
                        },
                        "output_data": {
                            "message": "string"
                        },
                        "outputs": [
                            "message"
                        ]
                    }
                },
                "next_steps": [
                    {
                        "id": "terminator-1749048785375-z3sw9y8ei",
                        "type": "terminator",
                        "condition": "always",
                        "input_data": [
                            "message",
                            "event_id",
                            "event_title",
                            "event_summery",
                            "event_description",
                            "event_start_time",
                            "event_end_time",
                            "event_date",
                            "event_organizer_name",
                            "event_attendees_name",
                            "event_attendees_email"
                        ],
                        "conditionType": "always",
                        "label": "Success"
                    }
                ],
                "variables": [
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email"
                ]
            },
            {
                "id": "terminator-1749048785375-z3sw9y8ei",
                "type": "terminator",
                "name": "End Node",
                "position": {
                    "x": 971.4604064941407,
                    "y": 687.5930496215819
                },
                "actions": {
                    "terminator": {
                        "name": "Workflow Complete",
                        "config": {
                            "clear_temp_files": true,
                            "log_completion": true,
                            "update_workflow_status": "completed"
                        },
                        "output_data": {
                            "completion_time": "string",
                            "total_execution_time": "string",
                            "final_status": "string"
                        },
                        "outputs": [
                            "completion_time",
                            "total_execution_time",
                            "final_status"
                        ]
                    }
                },
                "next_steps": [],
                "variables": [
                    "{message}",
                    "{event_id}",
                    "{event_title}",
                    "{event_summery}",
                    "{event_description}",
                    "{event_start_time}",
                    "{event_end_time}",
                    "{event_date}",
                    "{event_organizer_name}",
                    "{event_attendees_name}",
                    "{event_attendees_email}"
                ],
                "error_handling": {
                    "on_failure": "continue",
                    "retry_count": 2
                },
                "status": "idle",
                "input_data": [
                    "message",
                    "event_id",
                    "event_title",
                    "event_summery",
                    "event_description",
                    "event_start_time",
                    "event_end_time",
                    "event_date",
                    "event_organizer_name",
                    "event_attendees_name",
                    "event_attendees_email"
                ]
            }
        ],
        "status": "ACTIVE",
        "metadata": {
            "timeout": 3600,
            "retry_policy": {
                "max_retries": 3,
                "backoff_strategy": "exponential"
            }
        }
    };
};
