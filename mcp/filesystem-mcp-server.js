const fs = require('fs')
const path = require('path')

const {
    Server
} = require('@modelcontextprotocol/sdk/server/index.js')

const {
    StdioServerTransport
} = require('@modelcontextprotocol/sdk/server/stdio.js')

const {
    CallToolRequestSchema,
    ListToolsRequestSchema
} = require('@modelcontextprotocol/sdk/types.js')

const server = new Server(
    {
        name: 'filesystem-mcp-server',
        version: '1.0.0'
    },
    {
        capabilities: {
            tools: {}
        }
    }
)

// LIST TOOLS
server.setRequestHandler(
    ListToolsRequestSchema,

    async () => {

        return {

            tools: [

                {
                    name: 'read_file',

                    description:
                        'Read project files',

                    inputSchema: {

                        type: 'object',

                        properties: {

                            path: {
                                type: 'string'
                            }
                        },

                        required: ['path']
                    }
                },

                {
                    name: 'write_file',

                    description:
                        'Write content into file',

                    inputSchema: {

                        type: 'object',

                        properties: {

                            path: {
                                type: 'string'
                            },

                            content: {
                                type: 'string'
                            }
                        },

                        required: [
                            'path',
                            'content'
                        ]
                    }
                }
            ]
        }
    }
)

// TOOL HANDLER
server.setRequestHandler(
    CallToolRequestSchema,

    async (request) => {

        try {

            // READ FILE
            if (
                request.params.name ===
                'read_file'
            ) {

                const filePath =
                    request.params.arguments.path

                if (!filePath) {

                    throw new Error(
                        'Path is required'
                    )
                }

                if (
                    !filePath.startsWith(
                        './public'
                    )
                ) {

                    throw new Error(
                        'Access denied'
                    )
                }

                const absolutePath =
                    path.resolve(filePath)

                if (
                    !fs.existsSync(
                        absolutePath
                    )
                ) {

                    throw new Error(
                        'File not found'
                    )
                }

                const content =
                    fs.readFileSync(
                        absolutePath,
                        'utf-8'
                    )

                return {

                    content: [
                        {
                            type: 'text',

                            text: content
                        }
                    ]
                }
            }

            // WRITE FILE
            if (
                request.params.name ===
                'write_file'
            ) {

                const filePath =
                    request.params.arguments.path

                const content =
                    request.params.arguments.content

                if (
                    !filePath ||
                    !content
                ) {

                    throw new Error(
                        'Path and content are required'
                    )
                }

                if (
                    !filePath.startsWith(
                        './public'
                    )
                ) {

                    throw new Error(
                        'Access denied'
                    )
                }

                const absolutePath =
                    path.resolve(filePath)

                // CREATE BACKUP FOLDER
                const backupFolder =
                    path.resolve('./backup')

                if (
                    !fs.existsSync(
                        backupFolder
                    )
                ) {

                    fs.mkdirSync(
                        backupFolder,
                        {
                            recursive: true
                        }
                    )
                }

                // BACKUP OLD FILE
                if (
                    fs.existsSync(
                        absolutePath
                    )
                ) {

                    const oldContent =
                        fs.readFileSync(
                            absolutePath,
                            'utf-8'
                        )

                    const backupPath =
                        path.join(
                            backupFolder,
                            path.basename(
                                filePath
                            )
                        )
                    console.log(
                        'WRITING FILE:',
                        absolutePath
                    )

                    fs.writeFileSync(
                        backupPath,
                        oldContent,
                        'utf-8'
                    )
                }

                // WRITE UPDATED FILE
                fs.writeFileSync(
                    absolutePath,
                    content,
                    'utf-8'
                )

                console.log(
                    'File updated:',
                    filePath
                )

                return {

                    content: [
                        {
                            type: 'text',

                            text:
                                'File updated successfully'
                        }
                    ]
                }
            }

            throw new Error(
                'Tool not found'
            )

        } catch (error) {

            console.error(
                'MCP TOOL ERROR:',
                error.message
            )

            return {

                content: [
                    {
                        type: 'text',

                        text:
                            error.message
                    }
                ]
            }
        }
    }
)

// START SERVER
async function startServer() {

    try {

        const transport =
            new StdioServerTransport()

        await server.connect(
            transport
        )

        console.error(
            'Filesystem MCP Server Running'
        )

    } catch (error) {

        console.error(
            'MCP Server Error:',
            error.message
        )
    }
}

startServer()