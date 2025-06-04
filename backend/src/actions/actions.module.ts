// src/actions/actions.module.ts
import {Module} from '@nestjs/common';
import {GoogleCalendarHandler} from './handlers/google-calendar.handler';
import {EnrichContacts} from './handlers/enrich-contacts';
import {CrmHandler} from './handlers/crm.handler';
import {OpenAiHandler} from './handlers/openai.handler';
import {SlackHandler} from './handlers/slack.handler';
import {ActionFactoryService} from './services/action-factory.service';
import {HttpModule} from "@nestjs/axios";
import {TerminatorHandler} from "./handlers/terminator.handler";
import {IntegrationModule} from "../integrations/integration.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    IntegrationModule
  ],
  providers: [
    GoogleCalendarHandler,
    EnrichContacts,
    CrmHandler,
    OpenAiHandler,
    SlackHandler,
    ActionFactoryService,
    TerminatorHandler
  ],
  exports: [ActionFactoryService],
})
export class ActionsModule {
}
