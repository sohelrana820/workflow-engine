// src/actions/services/action-factory.service.ts
import {Injectable} from '@nestjs/common';
import {BaseActionHandler} from '../handlers/base-action.handler';
import {GoogleCalendarHandler} from '../handlers/google-calendar.handler';
import {EnrichContacts} from '../handlers/enrich-contacts';
import {CrmHandler} from '../handlers/crm.handler';
import {OpenAiHandler} from '../handlers/openai.handler';
import {SlackHandler} from '../handlers/slack.handler';
import {TerminatorHandler} from "../handlers/terminator.handler";

@Injectable()
export class ActionFactoryService {
  private actionHandlers: Record<string, BaseActionHandler>;

  constructor(
    private readonly googleCalendarHandler: GoogleCalendarHandler,
    private readonly enrichContacts: EnrichContacts,
    private readonly crmHandler: CrmHandler,
    private readonly openAiHandler: OpenAiHandler,
    private readonly slackHandler: SlackHandler,
    private readonly terminatorHandler: TerminatorHandler,
  ) {
    this.actionHandlers = {
      google_calendar: this.googleCalendarHandler,
      enrich: this.enrichContacts,
      crm: this.crmHandler,
      open_ai: this.openAiHandler,
      slack: this.slackHandler,
      terminator: this.terminatorHandler,
    };
  }

  getActionHandler(actionType: string): BaseActionHandler {
    const handler = this.actionHandlers[actionType];
    if (!handler) {
      throw new Error(`Unknown action type: ${actionType}`);
    }
    return handler;
  }
}
