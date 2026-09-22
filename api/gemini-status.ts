interface ApiRequest {
  method?: string;
  body?: any;
  headers: Record<string, any>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

export default function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY);
  return res.status(200).json({
    hasEnvKey,
    defaultModel: 'gemini-3.8-flash',
  });
}
