export interface ParagraphsMessage {
  type: 'ParagraphsMessage';
  payload: string[]
}

export interface SearchTermMessage {
  type: 'SearchTermMessage';
  payload: string;
}

export type MultiWorkerMessage = ParagraphsMessage | SearchTermMessage;
