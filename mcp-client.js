const {
    Client
} = require('@modelcontextprotocol/sdk/client/index.js')

const {
    StdioClientTransport
} = require('@modelcontextprotocol/sdk/client/stdio.js')

async function createMCPClient() {

    const transport = new StdioClientTransport({
        command: 'node',
        args: ['./mcp/filesystem-mcp-server.js']
    })

    const client = new Client(
        {
            name: 'debug-client',
            version: '1.0.0'
        },
        {
            capabilities: {}
        }
    )

    await client.connect(transport)

    return client
}

module.exports = {
    createMCPClient
}