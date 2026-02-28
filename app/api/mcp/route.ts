import { timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createJsonRpcErrorResponse(
  status: number,
  code: number,
  message: string,
  extraHeaders?: Record<string, string>
) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code,
        message,
      },
      id: null,
    }),
    {
      status,
      headers,
    }
  );
}

function bearerTokenMatches(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function validateMcpToken(request: NextRequest): Response | null {
  const expectedToken = process.env.MCP_SERVER_TOKEN?.trim();

  if (!expectedToken) {
    return createJsonRpcErrorResponse(
      503,
      -32001,
      'MCP_SERVER_TOKEN 未配置，MCP 连接器不可用'
    );
  }

  const authorization = request.headers.get('authorization')?.trim() || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return createJsonRpcErrorResponse(
      401,
      -32001,
      '缺少 Bearer Token',
      {
        'WWW-Authenticate': 'Bearer realm="AI Notepad MCP"',
      }
    );
  }

  const providedToken = authorization.slice('Bearer '.length).trim();
  if (!providedToken || !bearerTokenMatches(expectedToken, providedToken)) {
    return createJsonRpcErrorResponse(
      403,
      -32003,
      'MCP Token 无效',
      {
        'WWW-Authenticate': 'Bearer realm="AI Notepad MCP", error="invalid_token"',
      }
    );
  }

  return null;
}

async function handleMcpRequest(request: NextRequest) {
  const authError = validateMcpToken(request);
  if (authError) {
    return authError;
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('MCP request error:', error);
    return createJsonRpcErrorResponse(
      500,
      -32603,
      error instanceof Error ? error.message : 'MCP 服务器内部错误'
    );
  } finally {
    await server.close();
    await transport.close();
  }
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
