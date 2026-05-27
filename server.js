const fs = require('fs')
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const OpenAI = require('openai')
const {
    Octokit
} = require('@octokit/rest')

const {
    createMCPClient
} = require('./mcp-client')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const PORT =
    process.env.PORT || 5000

const openai = new OpenAI({

    apiKey:
        process.env.OPENAI_API_KEY
})
const octokit = new Octokit({

    auth:
        process.env.GITHUB_TOKEN
})

let users = []


app.get('/users', (req, res) => {

    res.send(users)
})


app.post('/users', (req, res) => {

    try {

        const newUser = {

            id: Date.now(),

            name: req.body.name,

            email: req.body.email
        }

        users.push(newUser)

        res.send(users)

    } catch (error) {

        console.log(
            'ADD USER ERROR:',
            error
        )

        res.send({

            success: false,

            message:
                error.message
        })
    }
})


app.post('/auto-fix', async (req, res) => {

    let client

    try {

        const browserError =
            req.body.error

        if (!browserError) {

            return res.send({

                success: false,

                message:
                    'No browser error received'
            })
        }

        client =
            await createMCPClient()


  const owner =
    process.env.GITHUB_OWNER

const repo =
    process.env.GITHUB_REPO

const htmlFile =
    await octokit.repos.getContent({

        owner,
        repo,
        path: 'public/index.html'
    })

const jsFile =
    await octokit.repos.getContent({

        owner,
        repo,
        path: 'public/script.js'
    })

const htmlContent =
    Buffer.from(

        htmlFile.data.content,

        'base64'
    ).toString()

const jsContent =
    Buffer.from(

        jsFile.data.content,

        'base64'
    ).toString()
    
        const jsResult =
            await client.callTool({

                name: 'read_file',

                arguments: {

                    path:
                        './public/script.js'
                }
            })

        const htmlContent =
            htmlResult.content[0].text

        const jsContent =
            jsResult.content[0].text

    
        const response =
            await openai.chat.completions.create({

            model: 'gpt-4.1-mini',

            response_format: {
                type: 'json_object'
            },

            messages: [

                {
                    role: 'system',

                    content: `

You are an expert AI debugging assistant.

Fix ONLY the browser error.

Return JSON only:

{
  "file": "",
  "fixedCode": "",
  "bugDetected": "",
  "fixApplied": "",
  "status": ""
}

Rules:

- file must be:
  index.html
  or
  script.js

- If error comes from:
  onclick
  addEventListener
  button actions
  DOM events

  then prefer fixing:
  index.html

- If error comes from:
  variable
  function
  axios
  fetch
  logic

  then prefer fixing:
  script.js

- fixedCode must contain COMPLETE corrected file

- Return FULL valid code only

- Do not shorten code

- Do not skip lines

- Preserve existing logic

- Fix only ONE bug

- Do not explain anything

- Do not wrap JSON in markdown
`
                },

                {
                    role: 'user',

                    content: `

BROWSER ERROR:
${browserError}

HTML FILE:
${htmlContent}

JAVASCRIPT FILE:
${jsContent}
`
                }
            ]
        })

        if (
            !response.choices[0]
            .message.content
        ) {

            throw new Error(
                'AI returned empty response'
            )
        }

        let fix = {}

        try {

            fix = JSON.parse(

                response.choices[0]
                .message.content
            )

        } catch (error) {

            console.log(
                'INVALID AI JSON'
            )

            return res.send({

                success: false,

                message:
                    'AI returned invalid JSON'
            })
        }

        let updatedContent = ''
        let targetPath = ''


        if (
            fix.file ===
            'index.html'
        ) {

            updatedContent =
                fix.fixedCode.trim()

            console.log(
                'AI CHOSE FILE:',
                fix.file
            )

            targetPath =
                './public/index.html'
        }

    
        else if (
            fix.file ===
            'script.js'
        ) {

            updatedContent =
                fix.fixedCode.trim()

            console.log(
                'AI CHOSE FILE:',
                fix.file
            )

            targetPath =
                './public/script.js'
        }

        else {

            return res.send({

                success: false,

                message:
                    'Invalid file returned by AI'
            })
        }

    
        if (
            updatedContent.length < 50
        ) {

            return res.send({

                success: false,

                message:
                    'AI returned invalid code'
            })
        }

    
        const backupFolder =
            './backup'

    
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

        
        const backupPath =
            `${backupFolder}/${fix.file}`

        fs.writeFileSync(

            backupPath,

            fix.file === 'index.html'
                ? htmlContent
                : jsContent,

            'utf-8'
        )

        
       const owner =
    process.env.GITHUB_OWNER

const repo =
    process.env.GITHUB_REPO

const repoPath =
    targetPath.replace(
        './',
        ''
    )


const currentFile =
    await octokit.repos.getContent({

        owner,
        repo,
        path: repoPath
    })

const sha =
    currentFile.data.sha


await octokit.repos.createOrUpdateFileContents({

    owner,
    repo,
    path: repoPath,

    message:
        `AI auto-fix: ${browserError}`,

    content:
        Buffer.from(
            updatedContent
        ).toString('base64'),

    sha
})

console.log(
    'GitHub file updated'
)
    
        const verifyResult =
            await client.callTool({

                name: 'read_file',

                arguments: {

                    path:
                        targetPath
                }
            })

        // console.log(

        //     'UPDATED FILE CONTENT:\n',

        //     verifyResult.content[0].text
        // )

        console.log(
            'File write completed'
        )

        console.log(
            'Updated File:',
            targetPath
        )

        
        await client.close()

        res.send({

            success: true,

            summary: {

                bugDetected:
                    fix.bugDetected,

                fixApplied:
                    fix.fixApplied,

                status:
                    fix.status
            },

            fixedCode:
                updatedContent
        })

    } catch (error) {

        console.log(
            'AUTO FIX ERROR:',
            error
        )

        if (client) {

            try {

                await client.close()

            } catch (closeError) {

                console.log(
                    'MCP CLOSE ERROR:',
                    closeError
                )
            }
        }

        res.send({

            success: false,

            message:
                error.message
        })
    }
})


app.post('/explain-error', async (req, res) => {

    try {

        const browserError =
            req.body.error

        const response =
            await openai.chat.completions.create({

            model: 'gpt-4.1-mini',

            messages: [

                {
                    role: 'system',

                    content: `

Convert JavaScript errors into beginner friendly explanations.
`
                },

                {
                    role: 'user',

                    content:
                        browserError
                }
            ]
        })

        res.send({

            success: true,

            readableError:
                response.choices[0]
                .message.content
        })

    } catch (error) {

        console.log(
            'EXPLAIN ERROR:',
            error
        )

        res.send({

            success: false,

            message:
                error.message
        })
    }
})


app.listen(PORT, () => {

    console.log(
        `Server Running on ${PORT}`
    )
})


process.on(

    'uncaughtException',

    (error) => {

        console.log(
            'UNCAUGHT ERROR:',
            error
        )
    }
)