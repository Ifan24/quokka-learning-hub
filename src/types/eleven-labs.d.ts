
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      'agent-id': string;
      'action-text'?: string;
      'start-call-text'?: string;
      'listening-text'?: string;
      'speaking-text'?: string;
      'override-config'?: string;
    }
  }
}
