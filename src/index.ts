import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

// McpServer holds the server identity and the capabilities we expose to the client.
const server = new McpServer({
  name: 'learning-mcp-server',
  version: '1.0.0',
});

// A tool is a function the connected AI application can discover and call.
server.registerTool(
  'add',
  {
    description: 'Add two numbers and return their sum.',
    inputSchema: z.object({
      a: z.number().describe('The first number'),
      b: z.number().describe('The second number'),
    }),
  },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }),
);

server.registerTool(
  'subtract',
  {
    description: 'Subtract two numbers and return their difference.',
    inputSchema: z.object({
      a: z.number().describe('The first number'),
      b: z.number().describe('The second number'),
    }),
  },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a - b) }],
  }),
);

server.registerTool(
  'greet',
  {
    description: 'Create a friendly greeting for a person.',
    inputSchema: z.object({
      name: z.string().min(1).describe("The person's name"),
    }),
  },
  async ({ name }) => ({
    content: [{ type: 'text', text: `你好，${name}！欢迎使用我的 MCP Server。` }],
  }),
);

server.registerTool(
  'list_github_issues',
  {
    description: 'List recent open issues from a public GitHub repository (excluding pull requests).',
    inputSchema: z.object({
      repository: z.string()
        .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
        .describe('Repository in owner/repo format, for example modelcontextprotocol/typescript-sdk'),
      limit: z.number().int().min(1).max(10).default(5)
        .describe('Maximum number of issues to return, from 1 to 10'),
    }),
  },
  async ({ repository, limit }) => {
    const [owner, repo] = repository.split('/');
    const url = new URL(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    );
    url.searchParams.set('state', 'open');
    url.searchParams.set('sort', 'created');
    url.searchParams.set('direction', 'desc');
    url.searchParams.set('per_page', '100');

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'learning-mcp-server',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const message = response.status === 404
          ? 'Repository not found or not public.'
          : response.status === 403
            ? 'GitHub refused the request. The public API rate limit may have been reached.'
            : `GitHub returned HTTP ${response.status}.`;
        return { isError: true, content: [{ type: 'text' as const, text: message }] };
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'GitHub returned an unexpected response.' }],
        };
      }

      const issues = data
        .filter((item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !('pull_request' in item))
        .slice(0, limit)
        .map((item) => ({
          number: item.number,
          title: item.title,
          url: item.html_url,
          created_at: item.created_at,
          labels: Array.isArray(item.labels)
            ? item.labels.map((label: { name?: string }) => label.name).filter(Boolean)
            : [],
          body: typeof item.body === 'string' ? item.body.slice(0, 500) : '',
        }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ repository, issues }) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Could not reach GitHub: ${message}` }],
      };
    }
  },
);

// stdio lets a local MCP client launch this process and speak JSON-RPC over stdin/stdout.
// Keep stdout reserved for MCP messages; send diagnostic logs to stderr if needed.
const transport = new StdioServerTransport();
await server.connect(transport);
