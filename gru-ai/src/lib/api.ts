const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

export const API_BASE = '';
export const WS_URL = `${wsProtocol}//${window.location.host}/ws`;
