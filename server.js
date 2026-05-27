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

    try {

        console.log(
            'AUTO FIX API HIT'
        )

        const browserError =
            req.body.error

        if (!browserError) {

            return res.send({

                success: false,

                message:
                    'No browser error received'
            })
        }

        console.log(
            'BROWSER ERROR:',
            browserError
        )

        const owner =
            process.env.GITHUB_OWNER

        const repo =
            process.env.GITHUB_REPO

        // FETCH HTML FILE
        const htmlFile =
            await octokit.repos.getContent({

                owner,
                repo,
                path: 'public/index.html'
            })

        // FETCH JS FILE
        const jsFile =
            await octokit.repos.getContent({

                owner,
                repo,
                path: 'public/script.js'
            })

        // DECODE HTML
        const htmlContent =
            Buffer.from(

                htmlFile.data.content,

                'base64'
            ).toString()

        // DECODE JS
        const jsContent =
            Buffer.from(

                jsFile.data.content,

                'base64'
            ).toString()

        // OPENAI FIX
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

- fixedCode must contain COMPLETE corrected file

- Return FULL valid code only

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

            return res.send({

                success: false,

                message:
                    'AI returned invalid JSON'
            })
        }

        let updatedContent = ''
        let repoPath = ''
        let sha = ''

        // HTML FIX
        if (
            fix.file ===
            'index.html'
        ) {

            updatedContent =
                fix.fixedCode.trim()

            repoPath =
                'public/index.html'

            sha =
                htmlFile.data.sha
        }

        // JS FIX
        else if (
            fix.file ===
            'script.js'
        ) {

            updatedContent =
                fix.fixedCode.trim()

            repoPath =
                'public/script.js'

            sha =
                jsFile.data.sha
        }

        else {

            return res.send({

                success: false,

                message:
                    'Invalid file returned by AI'
            })
        }

        // INVALID CODE CHECK
        if (
            updatedContent.length < 50
        ) {

            return res.send({

                success: false,

                message:
                    'AI returned invalid code'
            })
        }

        // BACKUP
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

        fs.writeFileSync(

            `${backupFolder}/${fix.file}`,

            fix.file === 'index.html'
                ? htmlContent
                : jsContent,

            'utf-8'
        )

        // UPDATE GITHUB
        await octokit.repos.createOrUpdateFileContents({

            owner,

            repo,

            path: repoPath,

            message:
                `AI auto-fix: ${browserError}`,

            content:
                Buffer.from(
                    updatedContent
                ).toString(
                    'base64'
                ),

            sha
        })

        console.log(
            'GITHUB FILE UPDATED'
        )

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